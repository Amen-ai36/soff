"""可复现的本地模拟导入测量。"""

import argparse
import hashlib
import json
import platform
import sqlite3
import tempfile
from contextlib import closing
from pathlib import Path
from time import perf_counter

from etl.pipeline import Pipeline


def measure(count):
    with tempfile.TemporaryDirectory() as directory:
        folder = Path(directory)
        data = folder / "papers.jsonl"
        hasher = hashlib.sha256()
        with data.open("wb") as stream:
            for index in range(count):
                row = {"id": str(index), "title": f"Simulated work {index}", "doi": f"10.9999/bench-{index}"}
                line = (json.dumps(row) + "\n").encode("utf-8")
                stream.write(line)
                hasher.update(line)
        manifest = {
            "scope": "bench", "version": 1, "sources": [{
                "id": "synthetic", "type": "paper", "path": data.name, "format": "jsonl",
                "sha256": hasher.hexdigest(), "url": "https://fixture.example/papers",
                "license_ref": "course-synthetic", "is_simulated": True, "approved": True,
                "policy": {"access": True, "collect": True, "store": True,
                           "store_fields": ["title", "doi"], "display_fields": ["title", "doi"]},
            }],
        }
        config = folder / "manifest.json"
        config.write_text(json.dumps(manifest), encoding="utf-8")
        database = folder / "measure.sqlite3"
        with closing(Pipeline(database)) as pipeline:
            start = perf_counter()
            task_id = pipeline.create(config, batch_size=1000)
            pipeline.run(task_id)
            elapsed = perf_counter() - start
            report = pipeline.quality_report(task_id)
        assert report["status"] == "SUCCEEDED"
        assert report["published"]["simulated_count"] == count
        assert report["published"]["real_public_count"] == 0
        return {
            "python": platform.python_version(), "sqlite": sqlite3.sqlite_version,
            "system": platform.system(), "simulated_count": count, "real_public_count": 0,
            "batches": report["committed_batches"], "seconds": round(elapsed, 3),
            "sqlite_bytes": database.stat().st_size,
        }


if __name__ == "__main__":
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--rows", type=int, default=10000)
    args = cli.parse_args()
    if args.rows < 1:
        cli.error("--rows must be positive")
    print(json.dumps(measure(args.rows), indent=2))
