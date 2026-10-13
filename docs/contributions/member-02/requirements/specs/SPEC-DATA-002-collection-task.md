# SPEC-DATA-002 采集任务编排

> 追踪：R02、R04、R11
> 责任：成员 2

## 1. 目标

提供采集任务的创建、启动、停止、重试、状态查询和阶段统计，保证任务幂等、可恢复、可审计，并禁止同范围重复并发运行。

## 2. 输入

```text
CreateCollectionTask
  source_id
  scope
  mode: full | incremental | sample
  retry_policy
  requested_by
  idempotency_key
```

## 3. 输出

```text
CollectionTask
  task_id
  source_id
  scope_hash
  mode
  status
  stage
  attempt
  max_attempts
  checkpoint_ref
  counts.fetched
  counts.parsed
  counts.cleaned
  counts.deduped
  counts.persisted
  counts.failed
  policy_version
  created_at
  started_at
  finished_at
```

## 4. 接口

| 操作 | 语义 | 幂等要求 |
| --- | --- | --- |
| create | 创建任务 | 相同 idempotency_key 返回同一 task_id |
| start | 排入执行队列 | 对运行中任务重复调用无副作用 |
| stop | 请求安全停止 | 已结束时返回最终状态 |
| retry | 从 checkpoint 或失败批次重试 | 不得重复写入已提交记录 |
| get | 查询状态和计数 | 只读 |
| list | 按来源、状态、时间过滤 | 分页稳定 |

## 5. 状态与阶段

状态定义见 `03-collection-task-state-machine.md`。阶段名固定为：

```text
DISCOVER -> FETCH -> PARSE -> CLEAN -> DEDUP -> PERSIST -> INDEX_SYNC -> FINALIZE
```

每个阶段必须输出开始时间、结束时间、输入数、输出数、失败数和错误摘要。

## 6. 并发与幂等

- 唯一活动键：`source_id + scope_hash + mode`。
- 同一活动键只能有一个 QUEUED、RUNNING、STOPPING 或 RETRY_WAIT 任务。
- 批次幂等键：`task_id + batch_index + source_version`。
- PERSIST 使用事务或 upsert；INDEX_SYNC 失败不重复写 canonical 表。
- 重建索引必须使用 dataset_version，不依赖于“再跑一次采集”。

## 7. 停止与恢复

停止请求设置 `stop_requested_at`。执行器在阶段或批次边界检查该标记：

1. 当前安全事务提交或回滚；
2. 保存已提交 checkpoint；
3. 状态转 STOPPED；
4. 未提交数据不进入 canonical 表；
5. 后续启动由人工确认，不自动恢复。

## 8. 重试

1. `SOURCE_RATE_LIMITED`、超时和暂不可用错误可自动重试。
2. 授权失败、许可拒绝和结构契约不符不自动重试。
3. 重试次数和退避上限可配置。
4. 每次 attempt 独立记录；计数不累加为重复 canonical 记录。

## 9. 验收与测试

1. 连续点击 start 不产生两个并发执行。
2. stop 后最终状态、checkpoint 和未提交数据边界正确。
3. 失败重试不会重复 canonical 记录。
4. 部分成功后，成功批次保留、失败批次可单独重放。
5. 管理端可查看每阶段计数和错误码分布。
