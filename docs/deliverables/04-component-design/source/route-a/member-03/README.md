# 成员三 · 构件设计供稿

2026-11-11；M3-COMP-01；对应分工 §5.5（第10～12周）。这是提供给成员八汇编、成员三复核的方案A支撑材料，不建立第二套正式报告。

| 顺序 | 交付内容 | 状态 |
| --- | --- | --- |
| 1 | [设计与试验SPEC](SPEC-M3-DESIGN-001.md) | 已先于模型/验证脚本编制 |
| 2 | [关系模型、表、约束与迁移](01-database-design.md)，两张E-R图源 | 已编制，公共语义待共同确认 |
| 3 | [ES、排序、缓存与统计](02-index-cache-and-statistics.md)，两份映射JSON | 已编制，未连接真实ES |
| 4 | [REST与异步接口](03-api-and-async.md)，OpenAPI JSON候选 | 已编制，未发布公共契约 |
| 5 | [评审、迁移及验证矩阵](04-review-and-validation-plan.md) | 已编制，人工审阅待执行 |
| 6 | [16条需求追踪](traceability.csv)、[实际检验报告](validation-report.md) | 已执行文档/模型检查和SQLite设计试验 |

## 复跑

在仓库根目录运行：

```powershell
python docs/contributions/member-03/component-design/validate.py
python docs/contributions/member-03/analysis/validate.py
git diff --check
```

第一条使用Python标准库，不增加项目依赖；报告明确区分静态检查、SQLite事务试验与未来系统测试。设计模型保存在 [models](models/README.md)，没有对业务数据库执行DDL。正式技术栈确定后另建项目迁移，不直接把SQLite试验模型部署到线上。

AI提示及执行证据见 [本轮提示](../../../ai/model-a/prompts/M3-ARCH-COMP-20261111.md)和 [AI使用日志](../../../ai/model-a/usage-log.md)。本轮人工修正案例记录的是AI自检修正，不能冒充真人审查。
