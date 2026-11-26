import hashlib
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from etl.normalize import doi, orcid, publication_date
from etl.pipeline import LEASE_SECONDS, LeaseLost, Pipeline, TaskError
from etl.sources import SourceError, load_manifest


DEMO = Path(__file__).resolve().parents[1] / "fixtures"


class PipelineTest(unittest.TestCase):
    def setUp(self):
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        self.folder = Path(folder.name)
        self.now = 1000
        self.db_path = self.folder / "test.sqlite3"
        self.pipeline = Pipeline(self.db_path, clock=lambda: self.now)
        self.addCleanup(self.pipeline.close)

    def run_demo(self):
        task = self.pipeline.create(DEMO / "manifest.json", batch_size=3)
        self.pipeline.run(task)
        return task

    def write_source(self, rows, *, version=1, source="one", approved=True, simulated=True,
                     display=("title", "publication_date", "authors", "doi")):
        contents = "".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows).encode("utf-8")
        name = f"{source}-{version}.jsonl"
        (self.folder / name).write_bytes(contents)
        spec = {
            "id": source, "type": "paper", "path": name, "format": "jsonl",
            "sha256": hashlib.sha256(contents).hexdigest(), "url": f"https://fixtures.example/{source}",
            "license_ref": "test-license", "approved": approved, "is_simulated": simulated,
            "policy": {
                "access": True, "collect": True, "store": True,
                "store_fields": ["title", "publication_date", "authors", "doi"], "display_fields": list(display),
            },
        }
        manifest = self.folder / f"{source}-{version}.json"
        manifest.write_text(json.dumps({"scope": "example", "version": version, "sources": [spec]}), encoding="utf-8")
        return manifest, self.folder / name

    def test_four_types_dedup_quality_and_identity(self):
        task = self.run_demo()
        result = self.pipeline.quality_report(task)
        self.assertEqual(result["checkpoint"], 8)
        self.assertEqual(result["committed_batches"], 3)
        self.assertEqual(result["published"]["by_type"]["simulated"], {"paper": 2, "patent": 1, "project": 1, "award": 2})
        self.assertEqual(result["published"]["real_public_count"], 0)
        self.assertEqual(result["issues"]["R-Q-003"], 1)
        self.assertEqual(self.pipeline.preview("demo", False), [])
        records = self.pipeline.preview("demo", True)
        paper_authors = [r["authors"][0] for r in records if r["type"] == "paper"]
        self.assertEqual(len({a["scholar_id"] for a in paper_authors}), 2)
        original = next(r for r in records if r["type"] == "paper" and r["doi"])
        self.assertEqual(original["title"], "A&B 样例论文")
        self.assertEqual(original["date_state"], "year")
        self.assertEqual(len(original["authors"][0]["institutions"]), 2)
        versions = self.pipeline.db.execute("""
            SELECT evidence,work_id FROM etl_observation WHERE source_id IN ('paper-a','paper-b')
            AND eligible=1 AND json_extract(evidence,'$.fields.doi') IS NOT NULL
        """).fetchall()
        self.assertEqual(len({row["work_id"] for row in versions}), 1)
        affiliations = [json.loads(row["evidence"])["fields"]["authors"][0]["institutions"][0] for row in versions]
        self.assertEqual(affiliations[0]["institution_id"], affiliations[1]["institution_id"])
        self.assertEqual({r["award_no"] for r in records if r["type"] == "award"}, {"01", "02"})

    def test_idempotent_creation_and_resume_after_stop(self):
        base = DEMO / "manifest.json"
        task = self.pipeline.create(base, "client", 3)
        self.assertEqual(task, self.pipeline.create(base, "client", 3))
        with self.assertRaises(TaskError):
            self.pipeline.create(base, "client", 1)
        stopped = self.pipeline.run(task, stop_after_batches=1)
        self.assertEqual((stopped["status"], stopped["checkpoint"]), ("STOPPED", 3))
        self.assertEqual(self.pipeline.preview("demo", True), [])
        self.assertEqual(self.pipeline.run(task)["status"], "STOPPED")
        self.assertEqual(self.pipeline.run(task, resume=True)["status"], "SUCCEEDED")
        self.assertEqual(self.pipeline.quality_report(task)["committed_batches"], 3)
        replay = self.pipeline.create(base, "replay")
        repeated = self.pipeline.run(replay)["published"]
        self.assertTrue(repeated["replay"])
        self.assertEqual(repeated["counts"]["NEW"], 0)
        self.assertEqual(repeated["counts"]["FAILED"], 1)
        self.assertEqual(repeated["snapshot_id"], task)

    def test_incremental_retraction_and_manual_title(self):
        self.run_demo()
        papers = [r for r in self.pipeline.preview("demo", True) if r["type"] == "paper"]
        kept = next(r for r in papers if r["doi"])
        withdrawn = next(r for r in papers if not r["doi"])
        self.pipeline.approve_title("demo", kept["work_id"], "人工批准标题", "测试管理员", "复核样例")
        task = self.pipeline.create(DEMO / "manifest-update.json")
        outcome = self.pipeline.run(task)
        self.assertEqual(outcome["published"]["counts"]["DELETED"], 1)
        self.assertEqual(outcome["published"]["counts"]["NEW"], 1)
        self.assertEqual(outcome["published"]["counts"]["CONFLICT"], 1)
        self.assertEqual(self.pipeline.quality_report(task)["issues"]["MANUAL_TITLE_CONFLICT"], 1)
        current = {r["work_id"]: r for r in self.pipeline.preview("demo", True)}
        self.assertEqual(current[kept["work_id"]]["title"], "人工批准标题")
        self.assertNotIn(withdrawn["work_id"], current)
        self.assertEqual(self.pipeline.db.execute("""
            SELECT action FROM etl_outbox WHERE snapshot_id=? AND work_id=?
        """, (task, withdrawn["work_id"])).fetchone()[0], "RETRACT")

    def test_temporary_error_retries_only_after_backoff(self):
        manifest, source = self.write_source([{"id": "1", "title": "Fictional"}])
        saved = source.read_bytes()
        source.unlink()
        task = self.pipeline.create(manifest)
        result = self.pipeline.run(task)
        self.assertEqual((result["status"], result["retry_at"]), ("RETRY_WAIT", 1001))
        source.write_bytes(saved)
        self.assertEqual(self.pipeline.run(task)["attempt"], 1)
        self.now += 1
        result = self.pipeline.run(task)
        self.assertEqual((result["status"], result["attempt"]), ("SUCCEEDED", 2))

    def test_corrupt_source_fails_closed_without_retry(self):
        manifest, source = self.write_source([{"id": "1", "title": "Fictional"}])
        source.write_text('{"id":"2","title":"Changed"}', encoding="utf-8")
        task = self.pipeline.create(manifest)
        status = self.pipeline.run(task)
        self.assertEqual((status["status"], status["error"]), ("FAILED", "SOURCE_CONTRACT_MISMATCH"))
        self.assertEqual(self.pipeline.run(task, resume=True)["attempt"], 1)
        self.assertEqual(self.pipeline.preview("example", True), [])

    def test_stale_worker_cannot_write_another_batch(self):
        manifest, _ = self.write_source([{"id": "1", "title": "Fictional"}])
        task = self.pipeline.create(manifest)
        waiting = self.pipeline.create(manifest, "second-request")
        claim = self.pipeline._claim(task, False)
        with self.assertRaises(TaskError):
            self.pipeline.run(waiting)
        self.now += LEASE_SECONDS + 1
        self.assertEqual(self.pipeline.run(task)["status"], "SUCCEEDED")
        with self.assertRaises(LeaseLost):
            self.pipeline._stage(task, claim["epoch"], 0, [("one", {"id": "stale"})])
        self.assertEqual(self.pipeline.task(task)["checkpoint"], 1)

    def test_stop_from_second_connection(self):
        manifest, _ = self.write_source([{"id": "1", "title": "Fictional"}])
        task = self.pipeline.create(manifest)
        claim = self.pipeline._claim(task, False)
        other = Pipeline(self.db_path)
        self.addCleanup(other.close)
        self.assertEqual(other.request_stop(task), "STOPPING")
        self.assertFalse(self.pipeline._stage(task, claim["epoch"], 0, [("one", {"id": "uncommitted"})]))
        self.assertEqual(self.pipeline.status(task)["status"], "STOPPED")
        self.assertEqual(self.pipeline.run(task, resume=True)["checkpoint"], 1)

    def test_publication_rollback_and_takeover(self):
        task = self.pipeline.create(DEMO / "manifest.json")
        old_write = self.pipeline._write_projection

        def interrupted(*args):
            old_write(*args)
            raise sqlite3.OperationalError("injected after candidate writes")

        with patch.object(self.pipeline, "_write_projection", interrupted):
            with self.assertRaises(sqlite3.OperationalError):
                self.pipeline.run(task)
        self.assertEqual(self.pipeline.task(task)["checkpoint"], 8)
        self.assertEqual(self.pipeline.preview("demo", True), [])
        for table in ("etl_observation", "etl_snapshot", "etl_outbox"):
            self.assertEqual(self.pipeline.db.execute("SELECT count(*) FROM " + table).fetchone()[0], 0)
        self.now += LEASE_SECONDS + 1
        self.assertEqual(self.pipeline.run(task)["published"]["simulated_count"], 6)

    def test_partial_source_failure_keeps_prior_snapshot(self):
        base, _ = self.write_source([{"id": "1", "title": "Original"}])
        original = self.pipeline.create(base)
        self.pipeline.run(original)
        update, _ = self.write_source([{"id": "1", "title": "Updated"}], version=2)
        additional, extra_data = self.write_source([{"id": "2", "title": "Other"}], version=2, source="two")
        document = json.loads(update.read_text(encoding="utf-8"))
        document["sources"] += json.loads(additional.read_text(encoding="utf-8"))["sources"]
        update.write_text(json.dumps(document), encoding="utf-8")
        before = extra_data.read_bytes()
        extra_data.write_bytes(b"altered")
        task = self.pipeline.create(update, batch_size=1)
        failed = self.pipeline.run(task)
        self.assertEqual((failed["status"], failed["checkpoint"]), ("PARTIAL_SUCCESS", 1))
        self.assertEqual(self.pipeline.preview("example", True)[0]["title"], "Original")
        self.assertEqual(self.pipeline.db.execute("SELECT snapshot_id FROM etl_published").fetchone()[0], original)
        extra_data.write_bytes(before)
        resumed = self.pipeline.run(task, resume=True)
        self.assertEqual(resumed["published"]["counts"]["UPDATED"], 1)
        self.assertEqual({row["title"] for row in self.pipeline.preview("example", True)}, {"Updated", "Other"})

    def test_different_inputs_cannot_publish_same_version(self):
        original, _ = self.write_source([{"id": "1", "title": "Original"}])
        self.pipeline.run(self.pipeline.create(original))
        different, _ = self.write_source([{"id": "1", "title": "Same version"}])
        result = self.pipeline.run(self.pipeline.create(different))
        self.assertEqual((result["status"], result["error"]), ("FAILED", "DATASET_VERSION_CONFLICT"))
        self.assertEqual(self.pipeline.preview("example", True)[0]["title"], "Original")

    def test_unchanged_row_in_new_version_does_not_emit_outbox_event(self):
        rows = [{"id": "1", "title": "Original"}]
        first, _ = self.write_source(rows)
        self.pipeline.run(self.pipeline.create(first))
        next_version, _ = self.write_source(rows, version=2)
        task = self.pipeline.create(next_version)
        result = self.pipeline.run(task)
        self.assertEqual(result["published"]["counts"]["UNCHANGED"], 1)
        self.assertEqual(self.pipeline.db.execute("SELECT count(*) FROM etl_observation").fetchone()[0], 1)
        self.assertEqual(self.pipeline.db.execute("SELECT count(*) FROM etl_outbox WHERE snapshot_id=?", (task,)).fetchone()[0], 0)

    def test_policy_tightening_filters_existing_records(self):
        base, _ = self.write_source([{"id": "1", "title": "Fictional", "doi": "10.9999/local",
                                     "authors": [{"name": "Synthetic", "email": "secret@example.invalid"}]}])
        task = self.pipeline.create(base)
        self.pipeline.run(task)
        record = self.pipeline.preview("example", True)[0]
        self.assertIn("authors", record)
        self.assertNotIn("secret@", json.dumps(record))
        limited, _ = self.write_source([], version=2, display=("title",))
        self.pipeline.run(self.pipeline.create(limited))
        new_record = self.pipeline.preview("example", True)[0]
        self.assertNotIn("authors", new_record)
        self.assertNotIn("doi", new_record)
        blocked, _ = self.write_source([], version=3, approved=False)
        self.pipeline.run(self.pipeline.create(blocked))
        self.assertEqual(self.pipeline.preview("example", True), [])

    def test_conflicting_strong_key_and_weak_candidate(self):
        base, _ = self.write_source([
            {"id": "a", "title": "Duplicate wording", "doi": "10.9999/a"},
            {"id": "b", "title": "Duplicate wording"},
        ])
        task = self.pipeline.create(base)
        self.pipeline.run(task)
        self.assertEqual(len(self.pipeline.preview("example", True)), 2)
        self.assertEqual(self.pipeline.quality_report(task)["issues"], {"R-Q-004": 1, "R-Q-005": 2, "R-Q-006": 2, "R-Q-010": 1})
        change, _ = self.write_source([{"id": "a", "title": "New wording", "doi": "10.9999/other"}], version=2)
        update = self.pipeline.create(change)
        result = self.pipeline.run(update)
        self.assertEqual(result["published"]["counts"]["CONFLICT"], 1)
        self.assertEqual(self.pipeline.quality_report(update)["issues"]["STRONG_KEY_CONFLICT"], 1)
        self.assertIn("10.9999/a", {r["doi"] for r in self.pipeline.preview("example", True)})

    def test_normalization_edge_cases(self):
        self.assertEqual(doi("https://doi.org/10.9999/ABC"), "10.9999/abc")
        self.assertIsNone(orcid("9999-0000-0000-0001"))
        self.assertEqual(orcid("9999-0000-0000-0000"), "https://orcid.org/9999-0000-0000-0000")
        self.assertEqual(publication_date("2024-02-30"), (None, "invalid"))
        self.assertEqual(publication_date("2024-02"), ("2024-02", "month"))
        self.assertEqual(publication_date(0), (None, "invalid"))
        self.assertEqual(publication_date(None), (None, "missing"))
        self.assertEqual(publication_date("未知"), (None, "unknown"))

    def test_unapproved_storage_policy_rejected(self):
        manifest, _ = self.write_source([{"id": "1", "title": "Fictional"}])
        spec = json.loads(manifest.read_text(encoding="utf-8"))
        spec["sources"][0]["policy"]["store"] = False
        manifest.write_text(json.dumps(spec), encoding="utf-8")
        with self.assertRaises(SourceError) as error:
            load_manifest(manifest)
        self.assertEqual(error.exception.code, "SOURCE_POLICY_BLOCKED")


if __name__ == "__main__":
    unittest.main()
