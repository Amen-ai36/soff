import json
import sqlite3
import time
from collections import Counter
from contextlib import contextmanager
from datetime import datetime, timezone
from itertools import islice
from pathlib import Path
from uuid import uuid4

from .normalize import RULE_VERSION, normalize, ror, text
from .sources import SourceError, digest, json_text, load_manifest, source_rows


LEASE_SECONDS = 120
MAX_ATTEMPTS = 3
CHANGE_TYPES = ("NEW", "UPDATED", "DELETED", "UNCHANGED", "CONFLICT", "FAILED")


class TaskError(ValueError):
    pass


class LeaseLost(TaskError):
    pass


def utc_now():
    return datetime.now(timezone.utc).isoformat()


class Pipeline:
    def __init__(self, db_path, clock=time.time):
        self.db = sqlite3.connect(db_path, isolation_level=None, timeout=10)
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA foreign_keys=ON")
        self.db.executescript(Path(__file__).with_name("001_local_etl.sql").read_text(encoding="utf-8"))
        self.clock = clock

    def close(self):
        self.db.close()

    @contextmanager
    def transaction(self):
        self.db.execute("BEGIN IMMEDIATE")
        try:
            yield
            self.db.execute("COMMIT")
        except BaseException:
            self.db.execute("ROLLBACK")
            raise

    def task(self, task_id):
        row = self.db.execute("SELECT * FROM etl_task WHERE id=?", (task_id,)).fetchone()
        if row is None:
            raise TaskError("找不到采集任务")
        return row

    def create(self, manifest_path, request_key=None, batch_size=200):
        if not 1 <= batch_size <= 5000:
            raise TaskError("批大小必须在 1～5000 之间")
        path = Path(manifest_path).resolve()
        manifest = load_manifest(path)
        manifest_hash = digest([manifest.fingerprint, RULE_VERSION])
        request_key = request_key or digest([manifest_hash, batch_size])
        with self.transaction():
            existing = self.db.execute("SELECT * FROM etl_task WHERE request_key=?", (request_key,)).fetchone()
            if existing:
                if (existing["manifest_hash"], existing["batch_size"]) != (manifest_hash, batch_size):
                    raise TaskError("同一幂等键对应不同输入")
                return existing["id"]
            task_id = uuid4().hex
            self.db.execute("""
                INSERT INTO etl_task (id,request_key,scope,version,manifest_hash,manifest_path,batch_size,status)
                VALUES (?,?,?,?,?,?,?,'DRAFT')
            """, (task_id, request_key, manifest.scope, manifest.version, manifest_hash, str(path), batch_size))
        return task_id

    def request_stop(self, task_id):
        with self.transaction():
            state = self.task(task_id)["status"]
            transition = {
                "DRAFT": "CANCELLED", "QUEUED": "CANCELLED", "RUNNING": "STOPPING", "RETRY_WAIT": "STOPPED",
            }
            if state in transition:
                state = transition[state]
                self.db.execute("UPDATE etl_task SET status=? WHERE id=?", (state, task_id))
        return state

    def _claim(self, task_id, resume):
        now = self.clock()
        with self.transaction():
            task = self.task(task_id)
            state = task["status"]
            if state == "STOPPING" and (task["lease_until"] or 0) <= now:
                self._finish(task_id, "STOPPED")
                return None
            if state in {"SUCCEEDED", "CANCELLED", "FAILED", "STOPPING"}:
                return None
            if state in {"STOPPED", "PARTIAL_SUCCESS"} and not resume:
                return None
            if state == "RETRY_WAIT" and task["retry_at"] > now:
                return None
            if state == "RUNNING" and task["lease_until"] > now:
                return None
            busy = self.db.execute("""
                SELECT 1 FROM etl_task WHERE scope=? AND id<>?
                AND status IN ('QUEUED','RUNNING','STOPPING','RETRY_WAIT')
            """, (task["scope"], task_id)).fetchone()
            if busy:
                raise TaskError("同范围已有活动任务")
            attempt = 1 if resume and state in {"STOPPED", "PARTIAL_SUCCESS"} else task["attempt"] + 1
            if attempt > MAX_ATTEMPTS:
                self._finish(task_id, "FAILED", "RETRY_EXHAUSTED")
                return None
            self.db.execute("""
                UPDATE etl_task SET status='RUNNING',epoch=epoch+1,attempt=?,lease_until=?,retry_at=NULL,error=NULL
                WHERE id=?
            """, (attempt, now + LEASE_SECONDS, task_id))
            return self.task(task_id)

    def _finish(self, task_id, status, error=None, result=None, retry_at=None):
        self.db.execute("""
            UPDATE etl_task SET status=?,error=?,result=?,lease_until=NULL,retry_at=? WHERE id=?
        """, (status, error, json_text(result) if result is not None else None, retry_at, task_id))

    def _active(self, task_id, epoch):
        state = self.task(task_id)
        if state["epoch"] != epoch or state["status"] not in {"RUNNING", "STOPPING"}:
            raise LeaseLost("任务执行权已变更")
        if state["status"] == "STOPPING":
            self._finish(task_id, "STOPPED")
            return False
        # 每个写事务同时检查代次和租约。超期运行由下次调用接管。
        if state["lease_until"] <= self.clock():
            raise LeaseLost("任务租约已到期")
        return True

    def _stage(self, task_id, epoch, checkpoint, rows):
        with self.transaction():
            if not self._active(task_id, epoch):
                return False
            if self.task(task_id)["checkpoint"] != checkpoint:
                raise LeaseLost("批次检查点已改变")
            last = checkpoint + len(rows)
            self.db.executemany("INSERT INTO etl_staged VALUES (?,?,?,?)", (
                (task_id, row_no, source_id, json_text(record))
                for row_no, (source_id, record) in enumerate(rows, checkpoint + 1)
            ))
            self.db.execute("INSERT INTO etl_batch VALUES (?,?,?,?)",
                            (task_id, checkpoint + 1, last, digest(rows)))
            self.db.execute("UPDATE etl_task SET checkpoint=?,lease_until=? WHERE id=?",
                            (last, self.clock() + LEASE_SECONDS, task_id))
            return True

    def _handle_source_failure(self, task, exc):
        with self.transaction():
            if not self._active(task["id"], task["epoch"]):
                return
            current = self.task(task["id"])
            if exc.retryable and current["attempt"] < MAX_ATTEMPTS:
                self._finish(task["id"], "RETRY_WAIT", exc.code,
                             retry_at=self.clock() + 2 ** (current["attempt"] - 1))
            else:
                status = "PARTIAL_SUCCESS" if current["checkpoint"] else "FAILED"
                self._finish(task["id"], status, exc.code)

    def run(self, task_id, *, resume=False, stop_after_batches=None):
        if stop_after_batches is not None and stop_after_batches < 1:
            raise TaskError("停止批次数必须大于 0")
        task = self._claim(task_id, resume)
        if task is None:
            return self.status(task_id)
        try:
            manifest = load_manifest(task["manifest_path"])
            if digest([manifest.fingerprint, RULE_VERSION]) != task["manifest_hash"]:
                raise SourceError("SOURCE_CONTRACT_MISMATCH", "清单或清洗规则已变更")
            aliases = {text(alias).casefold(): ror(value) for alias, value in manifest.organization_aliases.items()}
            if not all(aliases.values()):
                raise SourceError("SOURCE_CONTRACT_MISMATCH", "机构别名必须指向有效 ROR 格式")
            records = ((source.id, normalize(row, source, aliases))
                       for source in manifest.sources for row in source_rows(source))
            checkpoint = task["checkpoint"]
            remaining = islice(records, checkpoint, None)
            batches = 0
            while rows := list(islice(remaining, task["batch_size"])):
                if not self._stage(task_id, task["epoch"], checkpoint, rows):
                    return self.status(task_id)
                checkpoint += len(rows)
                batches += 1
                if batches == stop_after_batches:
                    self.request_stop(task_id)
                    with self.transaction():
                        self._active(task_id, task["epoch"])
                    return self.status(task_id)
            self._publish(task, manifest)
        except SourceError as exc:
            self._handle_source_failure(task, exc)
        return self.status(task_id)

    def status(self, task_id):
        task = self.task(task_id)
        summary = {k: task[k] for k in ("id", "scope", "version", "status", "checkpoint", "attempt", "error", "retry_at")}
        summary["published"] = json.loads(task["result"]) if task["result"] else None
        return summary

    def _record_issue(self, task_id, row, record, code):
        self.db.execute("INSERT OR IGNORE INTO etl_issue VALUES (?,?,?,?,?)",
                        (task_id, row["row_no"], row["source_id"], record.get("id"), code))

    def _find_work(self, scope, source, record, prior):
        lookup = (scope, int(source.is_simulated), json_text(record["key"]))
        match = self.db.execute("""
            SELECT work_id FROM etl_identity WHERE (scope,simulated,strong_key)=(?,?,?)
        """, lookup).fetchone() if record["key"] else None
        existing = prior["work_id"] if prior else None
        if existing and record["key"]:
            other = self.db.execute("SELECT strong_key FROM etl_identity WHERE scope=? AND work_id=?",
                                    (scope, existing)).fetchone()
            if (other and other[0] != lookup[2]) or (match and match[0] != existing):
                return None
        if existing:
            work_id = existing
        elif match:
            work_id = match[0]
        else:
            identity = record["key"] or [source.id, record["id"]]
            work_id = digest([scope, source.is_simulated, source.work_type, identity])
        if record["key"]:
            self.db.execute("INSERT OR IGNORE INTO etl_identity VALUES (?,?,?,?)", (*lookup, work_id))
        return work_id

    def _manual_title(self, scope, work_id):
        return self.db.execute("""
            SELECT title FROM etl_manual_title WHERE scope=? AND work_id=? ORDER BY id DESC LIMIT 1
        """, (scope, work_id)).fetchone()

    def approve_title(self, scope, work_id, title, operator, reason):
        values = [text(value) for value in (title, operator, reason)]
        if not all(values):
            raise TaskError("标题、操作人和理由均为必填项")
        with self.transaction():
            if not self.db.execute("""
                SELECT 1 FROM etl_published p JOIN etl_snapshot_entry e ON p.snapshot_id=e.snapshot_id
                WHERE p.scope=? AND e.work_id=?
            """, (scope, work_id)).fetchone():
                raise TaskError("找不到当前快照中的成果")
            self.db.execute("""
                INSERT INTO etl_manual_title (scope,work_id,title,operator,reason,recorded_at) VALUES (?,?,?,?,?,?)
            """, (scope, work_id, *values, utc_now()))

    def _apply_record(self, task, manifest, source, row, record):
        task_id, scope, version = task["id"], manifest.scope, manifest.version
        for code in record.get("issues", []):
            self._record_issue(task_id, row, record, code)
        if "id" not in record:
            return "FAILED"
        key = scope, source.id, record["id"]
        prior = self.db.execute("""
            SELECT o.* FROM etl_current c JOIN etl_observation o USING(scope,source_id,external_id,version)
            WHERE (c.scope,c.source_id,c.external_id)=(?,?,?)
        """, key).fetchone()
        evidence = {
            "source_id": source.id, "external_id": record["id"], "source_url": source.url,
            "source_version": version, "license_ref": source.license_ref, "rule_version": RULE_VERSION,
            "display_fields": sorted(source.display_fields),
        }
        fingerprint = digest([record, source.url, source.license_ref, source.approved,
                              sorted(source.display_fields), source.is_simulated, source.work_type])
        if prior and (prior["simulated"] != source.is_simulated or prior["work_type"] != source.work_type):
            self._record_issue(task_id, row, record, "SOURCE_IDENTITY_CONFLICT")
            return "CONFLICT"
        if prior and prior["fingerprint"] == fingerprint:
            return "UNCHANGED"
        if prior and prior["version"] == version:
            self._record_issue(task_id, row, record, "SOURCE_VERSION_CONFLICT")
            return "CONFLICT"
        deleted = record["deleted"]
        work_id = prior["work_id"] if prior else None
        hard_issues = {"R-Q-003", "R-Q-007"} & set(record.get("issues", []))
        if not deleted and "R-Q-003" not in hard_issues:
            work_id = self._find_work(scope, source, record, prior)
            if work_id is None:
                self._record_issue(task_id, row, record, "STRONG_KEY_CONFLICT")
                return "CONFLICT"
            if not prior and not record["key"] and self.db.execute("""
                SELECT 1 FROM etl_observation o JOIN etl_current c USING(scope,source_id,external_id,version)
                WHERE o.scope=? AND o.work_type=? AND o.simulated=? AND o.title_key=? AND o.deleted=0 LIMIT 1
            """, (scope, source.work_type, source.is_simulated, record["title_fingerprint"])).fetchone():
                self._record_issue(task_id, row, record, "R-Q-010")
        visible = bool(not deleted and source.approved and not hard_issues and work_id)
        fields = record.get("fields", {})
        projection = {k: fields[k] for k in source.display_fields if k in fields}
        manual = self._manual_title(scope, work_id) if visible else None
        prior_title = json.loads(prior["evidence"]).get("fields", {}).get("title") if prior else None
        manual_conflict = manual and fields.get("title") != prior_title and fields.get("title") != manual[0]
        if manual_conflict:
            self._record_issue(task_id, row, record, "MANUAL_TITLE_CONFLICT")
        if visible:
            projection.update({**evidence, "work_id": work_id, "type": source.work_type,
                               "is_simulated": source.is_simulated})
            if "publication_date" in source.display_fields:
                projection["date_state"] = record["date_state"]
        self.db.execute("""
            INSERT INTO etl_observation VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (*key, version, task_id, work_id, source.work_type, int(source.is_simulated), int(deleted), int(visible),
              fingerprint, record.get("title_fingerprint"), json_text(projection) if visible else None,
              json_text({**evidence, "retrieved_at": utc_now(), "fields": fields,
                         "raw_fields": record.get("raw_fields", {}), "date_state": record.get("date_state")})))
        self.db.execute("""
            INSERT INTO etl_current VALUES (?,?,?,?)
            ON CONFLICT (scope,source_id,external_id) DO UPDATE SET version=excluded.version
        """, (*key, version))
        if hard_issues:
            return "FAILED" if "R-Q-003" in hard_issues else ("UPDATED" if prior else "NEW")
        if manual_conflict:
            return "CONFLICT"
        if deleted:
            return "DELETED"
        return "UPDATED" if prior else "NEW"

    def _publish(self, task, manifest):
        task_id, scope, version = task["id"], manifest.scope, manifest.version
        with self.transaction():
            if not self._active(task_id, task["epoch"]):
                return
            current = self.db.execute("""
                SELECT s.* FROM etl_published p JOIN etl_snapshot s ON s.id=p.snapshot_id WHERE p.scope=?
            """, (scope,)).fetchone()
            existing = self.db.execute("SELECT * FROM etl_snapshot WHERE scope=? AND version=?",
                                       (scope, version)).fetchone()
            if existing and existing["manifest_hash"] == task["manifest_hash"]:
                previous_result = json.loads(self.task(existing["id"])["result"])
                failures = previous_result["counts"]["FAILED"]
                conflicts = previous_result["counts"]["CONFLICT"]
                changes = Counter(UNCHANGED=self.task(task_id)["checkpoint"] - failures - conflicts,
                                  FAILED=failures, CONFLICT=conflicts)
                self._finish(task_id, "SUCCEEDED", result=self._snapshot_summary(existing["id"], changes, replay=True))
                return
            if current and version <= current["version"]:
                self._finish(task_id, "FAILED", "DATASET_VERSION_CONFLICT")
                return
            sources = {source.id: source for source in manifest.sources}
            self.db.executemany("""
                INSERT INTO etl_source_policy VALUES (?,?,?,?,?)
                ON CONFLICT(scope,source_id) DO UPDATE SET license_ref=excluded.license_ref,
                approved=excluded.approved,display_fields=excluded.display_fields
            """, ((scope, s.id, s.license_ref, int(s.approved), json_text(sorted(s.display_fields)))
                  for s in sources.values()))
            counts = Counter()
            rows = self.db.execute("SELECT * FROM etl_staged WHERE task_id=? ORDER BY row_no", (task_id,))
            for row in rows:
                counts[self._apply_record(task, manifest, sources[row["source_id"]], row, json.loads(row["data"]))] += 1
            self.db.execute("INSERT INTO etl_snapshot VALUES (?,?,?,?,?)",
                            (task_id, scope, version, task["manifest_hash"], utc_now()))
            self._write_projection(task_id, scope, current["id"] if current else None)
            self.db.execute("""
                INSERT INTO etl_published VALUES (?,?)
                ON CONFLICT(scope) DO UPDATE SET snapshot_id=excluded.snapshot_id
            """, (scope, task_id))
            self._finish(task_id, "SUCCEEDED", result=self._snapshot_summary(task_id, counts))

    def _write_projection(self, snapshot_id, scope, previous):
        policies = {r["source_id"]: (r["license_ref"], set(json.loads(r["display_fields"]))) for r in self.db.execute(
            "SELECT * FROM etl_source_policy WHERE scope=? AND approved=1", (scope,))}
        candidates = self.db.execute("""
            SELECT o.* FROM etl_observation o JOIN etl_current c USING(scope,source_id,external_id,version)
            WHERE o.scope=? AND o.eligible=1 ORDER BY o.work_id,o.source_id,o.external_id
        """, (scope,))
        last = None
        for row in candidates:
            if row["work_id"] == last:
                continue
            projection = json.loads(row["projection"])
            policy = policies.get(row["source_id"])
            if policy is None:
                continue
            license_ref, allowed = policy
            if projection["license_ref"] != license_ref or "title" not in allowed:
                continue
            formerly_displayed = set(projection["display_fields"])
            for field in formerly_displayed - allowed:
                projection.pop(field, None)
            projection["display_fields"] = sorted(formerly_displayed.intersection(allowed))
            if "publication_date" not in allowed:
                projection.pop("date_state", None)
            last = row["work_id"]
            manual = self._manual_title(scope, last)
            if manual:
                projection["title"] = manual[0]
            self.db.execute("INSERT INTO etl_snapshot_entry VALUES (?,?,?,?,?)",
                            (snapshot_id, last, row["work_type"], row["simulated"], json_text(projection)))
        self.db.execute("""
            INSERT INTO etl_outbox
            SELECT n.snapshot_id,n.work_id,'UPSERT' FROM etl_snapshot_entry n
            LEFT JOIN etl_snapshot_entry p ON p.snapshot_id=? AND n.work_id=p.work_id
            WHERE n.snapshot_id=? AND (p.work_id IS NULL OR p.projection<>n.projection)
        """, (previous, snapshot_id))
        self.db.execute("""
            INSERT INTO etl_outbox
            SELECT ?,p.work_id,'RETRACT' FROM etl_snapshot_entry p
            LEFT JOIN etl_snapshot_entry n ON n.snapshot_id=? AND n.work_id=p.work_id
            WHERE p.snapshot_id=? AND n.work_id IS NULL
        """, (snapshot_id, snapshot_id, previous))

    def _snapshot_summary(self, snapshot_id, counts, replay=False):
        types = {"real": {}, "simulated": {}}
        for row in self.db.execute("""
            SELECT work_type,simulated,count(*) AS n FROM etl_snapshot_entry
            WHERE snapshot_id=? GROUP BY work_type,simulated
        """, (snapshot_id,)):
            types["simulated" if row["simulated"] else "real"][row["work_type"]] = row["n"]
        return {
            "snapshot_id": snapshot_id, "replay": replay, "counts": {k: counts[k] for k in CHANGE_TYPES},
            "real_public_count": sum(types["real"].values()),
            "simulated_count": sum(types["simulated"].values()), "by_type": types,
        }

    def quality_report(self, task_id):
        summary = self.status(task_id)
        summary["issues"] = {row["code"]: row["n"] for row in self.db.execute("""
            SELECT code,count(*) AS n FROM etl_issue WHERE task_id=? GROUP BY code ORDER BY code
        """, (task_id,))}
        summary["committed_batches"] = self.db.execute("SELECT count(*) FROM etl_batch WHERE task_id=?",
                                                       (task_id,)).fetchone()[0]
        summary["input_rows_by_source"] = {row["source_id"]: row["n"] for row in self.db.execute("""
            SELECT source_id,count(*) AS n FROM etl_staged WHERE task_id=? GROUP BY source_id ORDER BY source_id
        """, (task_id,))}
        return summary

    def preview(self, scope, simulated, limit=20):
        return [json.loads(row[0]) for row in self.db.execute("""
            SELECT e.projection FROM etl_published p JOIN etl_snapshot_entry e ON p.snapshot_id=e.snapshot_id
            WHERE p.scope=? AND e.simulated=? ORDER BY e.work_id LIMIT ?
        """, (scope, int(simulated), limit))]
