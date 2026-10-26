# 数据处理的类模型（分析级提案）

版本 0.1；对应需求 DR-COL、DR-TASK、DR-CLN、DR-DED、DR-DIS、DR-INS、DR-INC、DR-COUNT、DR-PIPE、DR-GOV。本文只确定分析与协作所需的概念、职责和约束，不冻结表结构、主键类型、索引或 API。

## 1. 概念与职责

| 概念 | 职责 | 关键属性（语义） |
| --- | --- | --- |
| CollectionTask | 一次采集/更新任务的范围、策略与生命周期 | task_id、source_id、scope、status、attempt、max_attempts、stop_requested_at、checkpoint_before/after |
| CollectionBatch | 任务内一次可独立提交的抓取单元 | batch_id、task_id、batch_no、cursor_before/after、counts、status |
| SourceAdapter | 某来源的字段映射、限流与错误分类职责 | source_id、access_mode、rate_limit、field_mapping、license_ref |
| RawPayload | 不可变的来源原始载荷与证据 | content_hash、source_version、fetched_at、content_type、license_snapshot |
| SourceRecord | 来源视角的一条成果记录 | source_record_id、source_id、source_version、content_hash、visibility、raw_ref |
| CanonicalWork | 去重后的规范成果 | canonical_id、work_type、标题、年份、语言、可见性 |
| WorkSourceLink | 规范成果与来源记录的对应关系 | canonical_id、source_record_id、match_type、confidence |
| UpdateRecord | 来源变化的日志（非成果版本号） | update_id、task_id、source_record_id、change_type、field_diff、source_version |
| QualityIssue | 质量规则未通过的隔离记录 | issue_id、subject_ref、rule_id、severity、status |
| GovernanceIssue | 来源值与人工值等冲突的治理事项 | issue_id、subject_ref、conflict_type、candidates、status |
| OutboxEvent | 与业务写入同事务的发布事件 | event_id、work_id、version、visibility、published_at |
| ProjectionState | 规范成果在检索投影中的版本与状态 | work_id、projection_version、state、last_error |

## 2. 关系与多重性

```text
CollectionTask 1 --- 0..* CollectionBatch
CollectionTask 1 --- 0..* UpdateRecord
SourceAdapter 1 --- 0..* CollectionBatch
CollectionBatch 0..* --- 1..* RawPayload
RawPayload 1 --- 1 SourceRecord
SourceRecord 0..* --- 0..1 CanonicalWork        (通过 WorkSourceLink 表达)
CanonicalWork 1 --- 0..* WorkSourceLink
CanonicalWork 1 --- 0..* QualityIssue
CanonicalWork 1 --- 0..* GovernanceIssue
CanonicalWork 1 --- 0..1 ProjectionState
CanonicalWork 1 --- 0..* OutboxEvent
```

`SourceRecord → CanonicalWork` 用 0..1 而不是 1：来源记录可以先落原始载荷、暂不进入规范成果（许可未知、质量不通过、待人工确认）。

## 3. 分析级不变量

| 编号 | 不变量 | 影响的需求 |
| --- | --- | --- |
| I-D01 | 同一 `source_id + scope` 同时最多一个活动任务；领取用条件更新与租约，不能只靠先查后写 | DR-TASK-007 |
| I-D02 | 批次状态与检查点在**同一事务**提交；检查点单调推进，不能倒退 | DR-TASK-004、DR-TASK-005、DR-INC |
| I-D03 | 同一 `batch_no` 或 `source_version` 重放必须幂等，不重复计数、不重复建规范成果 | DR-TASK-008 |
| I-D04 | 原始载荷不可变，清洗结果可按 `rule_version` 重放 | DR-CLN-001、DR-CLN-010 |
| I-D05 | 许可未知或受限的数据不得进入公开投影，也不计入公开成果数 | DR-COL-010、DR-COL-012、DR-COUNT |
| I-D06 | 只有强标识一致或达到阈值的候选可自动合并；其余进人工，不按姓名/标题自动合并 | DR-DED-002、DR-DED-003、DR-DIS-002 |
| I-D07 | 公开查询基于同一版本快照；数据库与检索投影按 `version` 对齐，不能只比条数 | DR-PIPE、R11 |
| I-D08 | 来源更新不得覆盖人工维护字段；冲突登记治理，不静默取来源顺序 | DR-DED-007、DR-GOV |

## 4. 与成员一、成员三模型的映射

| 本目录概念 | 映射到 | 说明 |
| --- | --- | --- |
| CanonicalWork | 成员一整体模型中的成果实体、成员三核心成果 | 不做新公共实体，只补数据处理视角的字段与生命周期 |
| Authorship / Organization / Field | 成员一、成员三已定义的关系与实体 | 本目录只在清洗与消歧时序中引用，不重定义 |
| SourceRecord / WorkSourceLink | 成员一「来源不是规范成果」的边界 | 保留字段级来源与匹配证据 |
| GovernanceIssue | 成员一/三的治理与人工确认 | 数据侧只登记，不替代治理流程 |
| ProjectionState / OutboxEvent | 尚无对应分析类 | 建议由汇编纳入「数据发布一致性」，需成员一/三确认 |

## 5. 不做什么

1. 不指定 PostgreSQL、Elasticsearch、消息队列或对象存储的具体产品。
2. 不把 `ProjectionState`、`OutboxEvent` 直接当作数据库物理表；它们是保证「保存」与「可检索」分离的分析职责。
3. 不新增与需求阶段状态图冲突的任务状态；时序图中的 STOPPING/STOPPED/RETRY_WAIT 沿用该状态机。
