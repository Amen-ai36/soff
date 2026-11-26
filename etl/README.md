# A 组数据采集与 ETL 本地实现

成员 2 · §5.6 功能实现 · 2026-11-26

从冻结 JSONL 和人工 CSV 导入论文、专利、项目和获奖记录。SQLite 保存批次检查点、来源证据、治理问题及规范成果快照。命令行可创建、执行、停止、恢复采集任务，查询质量报告及预览当前快照。

## 运行

在仓库根目录用 PowerShell 执行。依赖 Python 标准库，本机验证版本为 Python 3.14.5 / SQLite 3.50.4。

```powershell
$db = Join-Path $env:TEMP ("soff-etl-" + [guid]::NewGuid().ToString("N") + ".sqlite3")
$base = python -B -m etl --db $db create etl/fixtures/manifest.json --batch-size 3 | ConvertFrom-Json
python -B -m etl --db $db run $base.id --stop-after-batches 1
python -B -m etl --db $db resume $base.id
python -B -m etl --db $db report $base.id
python -B -m etl --db $db preview demo --simulated

$update = python -B -m etl --db $db create etl/fixtures/manifest-update.json | ConvertFrom-Json
python -B -m etl --db $db run $update.id
$replay = python -B -m etl --db $db create etl/fixtures/manifest-update.json --key replay-demo | ConvertFrom-Json
python -B -m etl --db $db run $replay.id
```

- 首次运行在第 3 条输入后安全停止，快照仍为空。恢复后提交 8 条输入，合并同 DOI 的两条论文观测，隔离 1 条缺标题记录，生成 6 条模拟成果。
- 增量更新包含新增、修改和显式撤回各 1 条。重放返回相同快照且新增为 0。省略的来源或行保留原观测，撤回由输入显式声明。
- `stop` 可在另一个进程请求安全停止。暂时读取失败后，`run` 在 `retry_at` 到期后重新领取。到期前返回当前状态。终态 `FAILED` 需修正输入后用新幂等键创建任务。
- `approve-title SCOPE WORK_ID TITLE OPERATOR REASON` 登记人工批准标题与审计信息，下一版快照在许可有效时采用该标题。来源更新若与人工值冲突，保留来源证据并记录治理问题。

## 输入约定与内部交接

- [基准清单](fixtures/manifest.json)和[增量清单](fixtures/manifest-update.json)展示 `scope`、单调递增的 `version`、来源标识、成果类型、格式、文件 SHA-256、许可引用、公开审批及字段白名单。清单和规则版本共同锁定任务输入。修改规则或输入时使用新的数据版本。
- 数据文件使用 UTF-8，位于清单目录下。每条记录有稳定的 `id`，撤回行含 `deleted: true`。JSONL 的作者可携带来源 ID、ORCID 和机构列表。CSV 保留带引号换行的逻辑行。夹具中的域名和标识均供模拟。
- [本地迁移](001_local_etl.sql)使用 `etl_` 前缀。批次与检查点原子写入，最终事务更新来源观测、生成本地快照和出站事件，再切换该范围的发布指针。只给当前许可允许的字段生成展示投影。快照预览按真实与模拟范围分开。
- 成员 3 可将 `etl_outbox` 的 `snapshot_id + work_id` 作为本地事件幂等键，按事件和快照版本读取 `etl_snapshot_entry`。撤回事件携带成果 ID，查询和索引应按当时有效的公开策略处理。正式入库和索引由双方对接候选异步端口。[成员 3 端口语义](../docs/contributions/member-03/component-design/03-api-and-async.md#3-内部异步协议)

## 验证

```powershell
python -B -m unittest discover -s etl/tests -v
python -B -m etl.tests.benchmark --rows 10000
python -B -m etl.tests.benchmark --rows 100000
```

15 项自动化测试通过，覆盖四类映射、强键冲突、同名作者隔离、机构别名、暂时失败退避、停止恢复、过期执行器拒写、事务回滚、许可收紧、版本竞争和增量幂等。Python 标准库 `trace` 统计的行覆盖率为采集适配 82.9%、清洗 93.6%、编排与入库 93.5%。

容量命令使用单来源合成论文。单次本机测量中，1 万条约 2.8 秒，10 万条约 44.1 秒，真实公开成果计数均为 0。

当前交付是 A 组的本地候选，`SUCCEEDED` 表示本地快照已生成并可预览。真实来源在线接入、跨服务 Elasticsearch 投影与补偿，以及百万条真实公开成果规模验收属于后续联调。功能边界及测试依据见成员 2 构件设计。[设计与验收场景](../docs/contributions/member-02/component-design/03-validation-and-handoff.md)
