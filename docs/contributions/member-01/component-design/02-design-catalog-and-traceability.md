# 设计目录与需求追踪矩阵

## 统一构件设计目录

1. 数据库设计说明书：实体、关系、多重性、约束、迁移、索引和审计。
2. 接口与OpenAPI：认证、检索、任务、认领、审核、门户和统计接口。
3. 数据管道设计：来源适配、限速、清洗、消歧、增量和质量门禁。
4. 搜索与统计设计：公开投影、版本、水位、排序、分页、total和分母。
5. UI设计：信息架构、线框、导航、页面状态、异常反馈和可用性。
6. 运行设计：配置、日志、指标、告警、备份、恢复和部署参数。
7. A/B对比附录：内部实现、算法、表结构或界面差异及统一验收结果。
8. 评审记录与变更记录：问题、决定、影响、迁移和验证证据。

## 需求到构件追踪

| 需求 | 设计构件 | 必须验证 |
| --- | --- | --- |
| R01认证权限 | 认证授权、Claim and Portal、API | 无会话、越权、自审和他人证明均拒绝 |
| R02四类接入 | Source Adapter、Normalize、Store | 来源、许可、类型和模拟标记可追溯 |
| R03清洗消歧 | Normalize and Deduplicate | 重复不重复计数，同名不误合并，冲突转治理 |
| R04更新任务 | Orchestrator、UpdateRecord、Operations | 停止、恢复、重试、检查点和水位语义清楚 |
| R05百万规模目标 | Store、Search Projection、Operations | 冻结版本公开ID集合、真实/模拟和四类计数可对账 |
| R06检索分类 | Query and Statistics、Search Projection、UI | 过滤、排序、分页、total和公开范围一致 |
| R07门户展示 | Claim and Portal、Query、UI | 来源、更新时间、四类成果和隐藏规则正确 |
| R08认领审核 | Claim and Portal、Authoritative Store | 非本人审核、幂等、并发唯一授权、原子结果 |
| R09授权维护 | Claim and Portal、API、UI | 白名单字段、版本检查、公共纠错治理 |
| R10基础统计 | Query and Statistics | 同版本去重、分母、未知值和多标签口径可复核 |
| R11完整链路 | 全部数据构件与发布流程 | 同一批次从采集到检索统计可追踪 |
| R14合规追溯 | Source Adapter、Store、Operations | 许可、来源、公开策略和审计证据完整 |

## 交付文件命名

统一目录建议使用 `docs/deliverables/05-component-design/`，文件按 `01-database.md`、`02-api-openapi.md`、`03-data-pipeline.md`、`04-search-statistics.md`、`05-ui.md`、`06-operations.md`、`07-ab-comparison.md`、`08-review-log.md` 编号。成员个人供稿保存在 `docs/contributions/member-XX/component-design/`，不作为第二套正式报告。
