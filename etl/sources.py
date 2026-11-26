import csv
import hashlib
import io
import json
import re
from dataclasses import dataclass
from pathlib import Path
from tempfile import TemporaryFile
from urllib.parse import urlsplit


WORK_TYPES = frozenset({"paper", "patent", "project", "award"})
FIELDS = frozenset({
    "title", "publication_date", "doi", "patent_office", "publication_number",
    "funder", "funder_award_id", "notice_id", "award_no", "category", "authors",
})


def json_text(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def digest(value):
    return hashlib.sha256(json_text(value).encode("utf-8")).hexdigest()


class SourceError(ValueError):
    def __init__(self, code, message, retryable=False):
        super().__init__(message)
        self.code = code
        self.retryable = retryable


@dataclass(frozen=True)
class Source:
    id: str
    work_type: str
    path: Path
    format: str
    sha256: str
    url: str
    license_ref: str
    is_simulated: bool
    approved: bool
    store_fields: frozenset
    display_fields: frozenset


@dataclass(frozen=True)
class Manifest:
    scope: str
    version: int
    fingerprint: str
    sources: tuple[Source, ...]
    organization_aliases: dict


def load_manifest(path):
    path = Path(path)
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(raw, dict):
            raise ValueError
        scope, version = raw["scope"], raw["version"]
        if not isinstance(scope, str) or not re.fullmatch(r"[\w.-]{1,80}", scope):
            raise ValueError
        if type(version) is not int or version < 1 or not isinstance(raw["sources"], list) or not raw["sources"]:
            raise ValueError
        aliases = raw.get("organization_aliases", {})
        if not isinstance(aliases, dict) or not all(isinstance(v, str) and v.strip() for v in aliases.values()):
            raise ValueError
        sources = tuple(parse_source(path, entry) for entry in raw["sources"])
        if len({s.id for s in sources}) != len(sources):
            raise ValueError
        return Manifest(scope, version, digest(raw), sources, aliases)
    except OSError as exc:
        raise SourceError("SOURCE_READ_ERROR", "无法读取清单", retryable=True) from exc
    except (ValueError, KeyError, TypeError) as exc:
        if isinstance(exc, SourceError):
            raise
        raise SourceError("SOURCE_CONTRACT_MISMATCH", "清单格式、范围或版本无效") from exc


def parse_source(manifest_path, entry):
    source_id, work_type = entry["id"], entry["type"]
    format_name, sha = entry["format"], entry["sha256"]
    url, license_ref = entry["url"], entry["license_ref"]
    if not isinstance(source_id, str) or not re.fullmatch(r"[\w.-]{1,80}", source_id):
        raise ValueError
    if (work_type not in WORK_TYPES or format_name not in {"jsonl", "csv"}
            or not isinstance(sha, str) or not re.fullmatch("[0-9a-f]{64}", sha)):
        raise ValueError
    if not isinstance(url, str):
        raise ValueError
    parsed_url = urlsplit(url)
    if parsed_url.scheme != "https" or not parsed_url.hostname or parsed_url.username or parsed_url.query or parsed_url.fragment:
        raise ValueError
    if not isinstance(license_ref, str) or not license_ref.strip() or type(entry["is_simulated"]) is not bool:
        raise ValueError
    if type(entry["approved"]) is not bool:
        raise ValueError
    policy = entry["policy"]
    if not isinstance(policy, dict) or not all(type(policy.get(k)) is bool for k in ("access", "collect", "store")):
        raise ValueError
    if not all(policy[k] for k in ("access", "collect", "store")):
        raise SourceError("SOURCE_POLICY_BLOCKED", f"来源 {source_id} 未获接入或留存授权")
    allowed = [policy[key] for key in ("store_fields", "display_fields")]
    if any(not isinstance(fields, list) or not set(fields) <= FIELDS for fields in allowed):
        raise ValueError
    store_fields, display_fields = map(frozenset, allowed)
    if not display_fields <= store_fields:
        raise ValueError
    base = manifest_path.resolve().parent
    path = (base / entry["path"]).resolve()
    if not path.is_relative_to(base):
        raise ValueError
    return Source(source_id, work_type, path, format_name, sha, url, license_ref,
                  entry["is_simulated"], entry["approved"], store_fields, display_fields)


def source_rows(source):
    """在解析前验证固定输入。用临时文件限制内存并隔离原文件后续修改。"""
    try:
        with TemporaryFile() as frozen, source.path.open("rb") as original:
            hasher = hashlib.sha256()
            while chunk := original.read(1024 * 1024):
                hasher.update(chunk)
                frozen.write(chunk)
            if hasher.hexdigest() != source.sha256:
                raise SourceError("SOURCE_CONTRACT_MISMATCH", f"来源 {source.id} 的文件校验值不匹配")
            frozen.seek(0)
            with io.TextIOWrapper(frozen, encoding="utf-8-sig", newline="") as stream:
                if source.format == "csv":
                    rows = csv.DictReader(stream, strict=True)
                    headers = rows.fieldnames or []
                    if "id" not in headers or len(set(headers)) != len(headers):
                        raise SourceError("SOURCE_CONTRACT_MISMATCH", f"来源 {source.id} 的 CSV 表头无效")
                    for row in rows:
                        yield row if None not in row else None
                else:
                    for line in stream:
                        try:
                            row = json.loads(line, parse_constant=reject_json_constant)
                        except ValueError:
                            yield None
                        else:
                            yield row if isinstance(row, dict) else None
    except OSError as exc:
        raise SourceError("SOURCE_READ_ERROR", f"暂时无法读取来源 {source.id}", retryable=True) from exc
    except (UnicodeError, csv.Error) as exc:
        raise SourceError("SOURCE_CONTRACT_MISMATCH", f"来源 {source.id} 的文件编码或结构无效") from exc


def reject_json_constant(value):
    raise ValueError(value)
