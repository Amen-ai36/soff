# 状态图交付物说明

[数据采集任务状态图](collection-task-state-codearts.png)为华为云 CodeArts Modeling 绘制的 UML 状态机图。


## 图元清单

| 名称 | 类型 | 说明 |
| --- | --- | --- |
| Initial | 初始伪状态 | 任务创建入口 |
| DRAFT 草稿 | 状态 | 已创建未提交 |
| QUEUED 已入队 | 状态 | 等待调度器派发 |
| RUNNING 执行中 | 状态 | 按阶段推进，内部阶段序列 `DISCOVER → FETCH → PARSE → CLEAN → DEDUP → PERSIST → INDEX_SYNC → FINALIZE` |
| RETRY_WAIT 退避重试 | 状态 | 可重试错误后的退避等待 |
| STOPPING 停止中 | 状态 | 人工停止请求已受理 |
| STOPPED 已停止 | 状态 | 阶段边界安全停止，可 resume |
| SUCCEEDED 已完成 | 状态 | 全部阶段成功 |
| PARTIAL_SUCCESS 部分成功 | 状态 | 部分数据源失败，可只重试失败源 |
| FAILED 失败 | 状态 | 不可重试错误或重试耗尽 |
| CANCELLED 已取消 | 状态 | 未执行前取消 |
| Final | 终止伪状态 | 任务终态汇聚 |

## 迁移清单

| 源 | 目标 | 事件 |
| --- | --- | --- |
| Initial | DRAFT | 创建任务 |
| DRAFT | QUEUED | submit() |
| DRAFT | CANCELLED | cancel() |
| QUEUED | RUNNING | 调度器派发 |
| QUEUED | CANCELLED | cancel() |
| RUNNING | RUNNING | advanceStage() |
| RUNNING | STOPPING | stop() |
| RUNNING | RETRY_WAIT | 可重试错误 |
| RUNNING | PARTIAL_SUCCESS | 部分源失败 |
| RUNNING | SUCCEEDED | 全部阶段完成 |
| RUNNING | FAILED | 不可重试错误 |
| RETRY_WAIT | QUEUED | 退避到期 |
| RETRY_WAIT | FAILED | 重试耗尽 |
| STOPPING | STOPPED | 安全停止 |
| STOPPING | FAILED | 停止超时 |
| STOPPED | QUEUED | resume() |
| PARTIAL_SUCCESS | QUEUED | 重试失败源 |
| SUCCEEDED | Final | 结束 |

`FAILED`、`CANCELLED`、`STOPPED`、`PARTIAL_SUCCESS` 为终止状态，不再统一引向终止伪状态。其中 `FAILED` 需人工修复后新建任务重试，`STOPPED` 与 `PARTIAL_SUCCESS` 可分别通过 `resume()` 与「重试失败源」回到 QUEUED。
