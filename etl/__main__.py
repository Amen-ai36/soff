import argparse
import json
import sqlite3
import sys
from contextlib import closing

from .pipeline import Pipeline, TaskError
from .sources import SourceError


def parser():
    cli = argparse.ArgumentParser(description="A 组 ETL 本地运行工具")
    cli.add_argument("--db", required=True, help="本地 SQLite 文件")
    commands = cli.add_subparsers(dest="command", required=True)
    create = commands.add_parser("create", help="用固定文件清单创建采集任务")
    create.add_argument("manifest")
    create.add_argument("--key", help="调用方幂等键")
    create.add_argument("--batch-size", type=int, default=200)
    for command in ("run", "resume", "stop", "status", "report"):
        cmd = commands.add_parser(command)
        cmd.add_argument("task_id")
        if command in {"run", "resume"}:
            cmd.add_argument("--stop-after-batches", type=int, help="提交指定批次数后安全停止")
    preview = commands.add_parser("preview", help="查看当前快照内获准展示的记录")
    preview.add_argument("scope")
    preview.add_argument("--simulated", action="store_true")
    preview.add_argument("--limit", type=int, default=20)
    manual = commands.add_parser("approve-title", help="登记下次快照采用的人工批准标题")
    for name in ("scope", "work_id", "title", "operator", "reason"):
        manual.add_argument(name)
    return cli


def execute(pipeline, args):
    if args.command == "create":
        return pipeline.status(pipeline.create(args.manifest, args.key, args.batch_size))
    if args.command in {"run", "resume"}:
        return pipeline.run(args.task_id, resume=args.command == "resume", stop_after_batches=args.stop_after_batches)
    if args.command == "stop":
        pipeline.request_stop(args.task_id)
        return pipeline.status(args.task_id)
    if args.command == "status":
        return pipeline.status(args.task_id)
    if args.command == "report":
        return pipeline.quality_report(args.task_id)
    if args.command == "preview":
        if not 1 <= args.limit <= 1000:
            raise TaskError("预览条数必须在 1～1000 之间")
        return pipeline.preview(args.scope, args.simulated, args.limit)
    pipeline.approve_title(args.scope, args.work_id, args.title, args.operator, args.reason)
    return {"work_id": args.work_id, "recorded": True}


def main():
    args = parser().parse_args()
    try:
        with closing(Pipeline(args.db)) as pipeline:
            result = execute(pipeline, args)
    except (TaskError, SourceError) as exc:
        print(str(exc), file=sys.stderr)
        return 2
    except sqlite3.Error:
        print("SQLite 操作失败，未提交的事务已回滚。", file=sys.stderr)
        return 2
    print(json.dumps(result, ensure_ascii=True, indent=2))
    return 2 if isinstance(result, dict) and result.get("status") in {"FAILED", "PARTIAL_SUCCESS"} else 0


if __name__ == "__main__":
    sys.exit(main())
