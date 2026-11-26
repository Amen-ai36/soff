import html
import re
import unicodedata
from datetime import date

from .sources import Source, digest


RULE_VERSION = "a-etl-1"


def text(value):
    if not isinstance(value, str):
        return ""
    value = unicodedata.normalize("NFKC", html.unescape(value))
    return " ".join("".join(c if c.isspace() or unicodedata.category(c) not in {"Cc", "Cf"} else ""
                           for c in value).split())


def doi(value):
    value = re.sub(r"^(?:https?://(?:dx\.)?doi\.org/|doi:\s*)", "", text(value).lower())
    return value if re.fullmatch(r"10\.\d{4,9}/[^\s<>]+", value) else None


def orcid(value):
    value = re.sub(r"^https?://orcid\.org/", "", text(value).upper(), flags=re.I).replace("-", "")
    if not re.fullmatch(r"[0-9]{15}[0-9X]", value):
        return None
    total = 0
    for digit in value[:-1]:
        total = (total + int(digit)) * 2
    check = (12 - total % 11) % 11
    if value[-1] != ("X" if check == 10 else str(check)):
        return None
    return "https://orcid.org/" + "-".join(value[i:i + 4] for i in range(0, 16, 4))


def ror(value):
    value = re.sub(r"^https?://ror\.org/", "", text(value).lower())
    return "https://ror.org/" + value if re.fullmatch(r"0[0-9a-hj-km-np-tv-z]{6}[0-9]{2}", value) else None


def publication_date(value):
    if value is None or value == "":
        return None, "missing"
    if type(value) is int:
        value = str(value)
    if not isinstance(value, str):
        return None, "invalid"
    value = text(value)
    if value.casefold() in {"unknown", "未知"}:
        return None, "unknown"
    if not re.fullmatch(r"\d{4}(?:-\d{2}(?:-\d{2})?)?", value):
        return None, "invalid"
    try:
        date.fromisoformat({4: value + "-01-01", 7: value + "-01", 10: value}[len(value)])
    except ValueError:
        return None, "invalid"
    return value, {4: "year", 7: "month", 10: "day"}[len(value)]


def normalize_authors(raw, source_id, record_id, aliases):
    if not isinstance(raw, list):
        return []
    authors = []
    for ordinal, item in enumerate(raw, 1):
        if not isinstance(item, dict) or not (name := text(item.get("name"))):
            continue
        external_id = text(item.get("id"))
        stable_id = orcid(item.get("orcid"))
        identity = stable_id or [source_id, external_id or [record_id, ordinal]]
        affiliations = item.get("institutions")
        institutions = []
        for entry in affiliations if isinstance(affiliations, list) else []:
            if not isinstance(entry, dict) or not (organization := text(entry.get("name"))):
                continue
            official = ror(entry.get("ror")) or aliases.get(organization.casefold())
            reference = text(entry.get("id")) or [record_id, ordinal, organization]
            institution_id = digest(official or [source_id, reference])
            if any(i["institution_id"] == institution_id for i in institutions):
                continue
            institutions.append({"institution_id": institution_id, "name": organization, "ror": official})
        authors.append({
            "scholar_id": digest(identity), "name": name, "position": ordinal, "orcid": stable_id,
            "corresponding": item.get("corresponding") is True, "institutions": institutions,
        })
    return authors


def strong_key(work_type, fields):
    if work_type == "paper":
        return ["doi", fields["doi"]] if fields.get("doi") else None
    key_fields = {
        "patent": ("patent_office", "publication_number"),
        "project": ("funder", "funder_award_id"),
        "award": ("notice_id", "award_no", "category"),
    }[work_type]
    values = [text(fields.get(k)).casefold() for k in key_fields]
    return [work_type, *values] if all(values) else None


def normalize(row, source: Source, aliases):
    if row is None:
        return {"issues": ["SOURCE_DATA_INVALID"]}
    external_id = text(row.get("id"))
    if not external_id or len(external_id) > 256:
        return {"issues": ["R-Q-001"]}
    if row.get("deleted") is True or row.get("deleted") in ("true", "1"):
        return {"id": external_id, "deleted": True}

    raw = {k: row[k] for k in source.store_fields if k in row}
    fields = {k: text(v) for k, v in raw.items() if k not in {"authors", "doi", "publication_date"}}
    fields["doi"] = doi(raw.get("doi"))
    fields["publication_date"], date_state = publication_date(raw.get("publication_date"))
    fields["authors"] = normalize_authors(raw.get("authors"), source.id, external_id, aliases)
    issues = []
    if not fields.get("title"):
        issues.append("R-Q-003")
    if not fields["doi"] and source.work_type == "paper":
        issues.append("R-Q-004")
    if not fields["authors"] or any(not a["institutions"] for a in fields["authors"]):
        issues.append("R-Q-005")
    if fields["publication_date"] is None:
        issues.append("R-Q-006")
    if fields.get("title") and "title" not in source.display_fields:
        issues.append("R-Q-007")
    return {
        "id": external_id, "deleted": False, "fields": fields, "issues": issues,
        "key": strong_key(source.work_type, fields), "date_state": date_state,
        "title_fingerprint": text(fields.get("title")).casefold(),
        "raw_fields": {k: v for k, v in raw.items() if isinstance(v, (str, int)) and k != "authors"},
    }
