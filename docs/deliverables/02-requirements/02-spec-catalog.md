# 核心模块SPEC统一汇编目录

2026-10-13联合评审稿。每个链接指向完整原规范，构成本汇编附录；保留目标、输入输出、正常/异常/边界、算法和验收原文，不以短摘要替代。A/B编号用于区分来源，不代表两个正式交付包。

| 模块 | 方案A完整规范 | 方案B完整规范 |
| --- | --- | --- |
| 来源接入与采集 | [DATA-001来源适配](../../contributions/member-02/requirements/specs/SPEC-DATA-001-source-adapter.md)、[DATA-002任务](../../contributions/member-02/requirements/specs/SPEC-DATA-002-collection-task.md) | [M7-INGEST](../../contributions/member-07/requirements/specs/SPEC-M7-INGEST.md) |
| 清洗标准化 | [DATA-003](../../contributions/member-02/requirements/specs/SPEC-DATA-003-cleaning-normalization.md) | [M7-CLEAN](../../contributions/member-07/requirements/specs/SPEC-M7-CLEAN.md) |
| 去重与作者消歧 | [DATA-004](../../contributions/member-02/requirements/specs/SPEC-DATA-004-dedup-disambiguation.md) | [M7-RESOLVE](../../contributions/member-07/requirements/specs/SPEC-M7-RESOLVE.md) |
| 增量与质量门禁 | [DATA-005增量](../../contributions/member-02/requirements/specs/SPEC-DATA-005-incremental-update.md)、[DATA-006质量](../../contributions/member-02/requirements/specs/SPEC-DATA-006-quality-gate.md) | 见M7-INGEST/CLEAN/RESOLVE的版本与质量规则 |
| 认证授权 | [M3-AUTH](../../contributions/member-03/requirements/specs/SPEC-M3-AUTH.md) | [M8-AUTH](../../contributions/member-08/requirements/specs/SPEC-M8-AUTH.md) |
| 检索排序 | [M3-SEARCH](../../contributions/member-03/requirements/specs/SPEC-M3-SEARCH.md) | [M8-SEARCH](../../contributions/member-08/requirements/specs/SPEC-M8-SEARCH.md) |
| 认领审核 | [M3-CLAIM](../../contributions/member-03/requirements/specs/SPEC-M3-CLAIM.md) | [M8-CLAIM](../../contributions/member-08/requirements/specs/SPEC-M8-CLAIM.md) |
| 统计关系与热点 | [M3-STATS](../../contributions/member-03/requirements/specs/SPEC-M3-STATS.md) | [M8-STATS](../../contributions/member-08/requirements/specs/SPEC-M8-STATS.md) |

两组共17份模块SPEC：成员2六份、成员7三份、成员3四份、成员8四份。UI详细约束见SRS第4、6节的成员4/9章节；不把页面分析伪装为已批准接口SPEC。

## 整合执行顺序

先由模块搭档对照输入输出、字段含义、权限、错误和状态、计数语义及验收；再由成员1、6确认公共部分。内部算法可不同，但共享测试样本与可观察行为应一致。差异未关闭前不得将某一方的规则覆盖另一方，或根据本目录直接编写核心代码。

认领通过与授权/审计一致、来源可追溯、同名不凭姓名合并是共同安全目标。采集恢复语义、非法DOI处理、统计分母、排序、公共性能阈值等具体候选规则见[冲突表](04-review-and-conflicts.md)。本轮仅汇编文档，不改变公共契约，不声明已经运行算法或验收通过。
