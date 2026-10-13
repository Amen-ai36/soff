# SPEC-DATA-006 质量、计数与公开准入

> 追踪：R05、R11、R14
> 责任：成员 2 初稿，成员 7、5、10 核对测试口径

## 1. 目标

在数据进入公共检索层前执行字段质量、来源完整性和许可闸门，并提供可重复的 10,000 条计数与质量报告。

## 2. 准入条件

一条 canonical 记录进入 `public` 搜索索引前必须：

1. 具有 canonical_id 和受控成果类型；
2. 具有至少一个 Source Record；
3. 具有来源 URL、来源 ID、采集时间和来源版本；
4. 具有 `license_snapshot_ref` 和 `field_policy_ref`；
5. 必填字段质量规则通过；
6. `approval_status=approved`；
7. 所有公开字段均允许 `display`；
8. 不存在未解决的高严重度冲突；
9. 模拟记录具有显式标记，未与真实记录混合。

## 3. 规则级别

| 级别 | 行为 |
| --- | --- |
| ERROR | 阻止公开；进入修复或隔离队列 |
| WARNING | 可公开但必须记录并在质量报告显示 |
| INFO | 记录统计，不阻断 |

## 4. 最少质量规则

| 规则 | 级别 | 条件 |
| --- | --- | --- |
| R-Q-001 | ERROR | source_id、source_record_id、retrieved_at 和许可引用缺失 |
| R-Q-002 | ERROR | canonical 无成果类型或类型非法 |
| R-Q-003 | ERROR | 论文/专利/项目/获奖的核心标题或名称为空 |
| R-Q-004 | WARNING | DOI 缺失或非法 |
| R-Q-005 | WARNING | 作者或机构缺失 |
| R-Q-006 | WARNING | 年份或日期未知 |
| R-Q-007 | ERROR | 公开字段包含 `restricted` 或 `pending` |
| R-Q-008 | ERROR | 发现未标记模拟数据 |
| R-Q-009 | WARNING | 多来源字段冲突未解决 |
| R-Q-010 | INFO | 低置信消歧候选 |

## 5. 计数口径

公开规模计数 SQL 或等价逻辑必须满足：

```text
count(public canonical work)
where approval_status = approved
  and deleted_at is null
  and is_simulated = false
  and canonical_id is not null
  and required_source_fields_complete = true
```

模拟数据、原始记录、Source Record、失败记录、待授权记录、重复来源行和软删除记录必须分别统计。

## 6. 数据集 manifest

```text
dataset_version
generated_at
base_source_versions[]
files[].path
files[].sha256
record_counts.by_type
record_counts.by_source
record_counts.simulated
filter_conditions
license_snapshot_paths[]
etl_contract_version
```

manifest 冻结后，A/B 两组的基准输入必须指向同一版本。

## 7. 报告

质量报告至少显示：

- 各来源抓取、解析、清洗、去重、入库和公开数量；
- 必填字段完整率；
- 去重误合并和漏合并指标；
- 作者消歧 Precision、Recall、F1；
- 冲突队列数量和年龄；
- 限流、授权失败和结构异常次数；
- `pending/denied` 字段进入公开层的次数，必须为 0；
- 10,000 条目标的当前差值。

## 8. 验收与测试

1. 固定 manifest 可重算 canonical 数量和类型分布。
2. 注入 ERROR 规则后记录不能进入公开索引。
3. 模拟数据不能计入真实公开总数。
4. 许可待定字段不能出现在公开 DTO、导出和 AI 输入。
5. 质量报告与任务摘要、数据库计数一致。
