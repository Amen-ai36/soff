# 成员8 · 第十周后端架构供稿

2026-11-11；版本0.1；B组评审提案。架构阶段由成员6汇编、成员1复核；本稿与成员3协作，供唯一全组架构报告接入。

统一需求分析已于2026-10-27完成复核。本稿承接其百万条规范公开成果分析目标；历史一万条文档待同步。百万规模、可用性、延迟和部署均无实测证据。框架与数据库版本尚未批准；PostgreSQL、Cookie会话、事务Outbox和具体索引发布方式均为B组候选。

- [后端架构与选型比较](01-backend-architecture.md)
- [一致性与故障恢复](02-consistency-and-failure.md)
- [ADR-001 模块边界](adr/ADR-M8-001-modular-boundary.md)
- [ADR-002 数据与索引同步](adr/ADR-M8-002-outbox.md)
- [ADR-003 公开版本与分页](adr/ADR-M8-003-publication.md)
- 图源：[后端架构](diagrams/backend-architecture.puml)、[同步时序](diagrams/outbox-consistency-sequence.puml)、[部署边界](diagrams/deployment-boundary.puml)
- [技术来源](sources.md)

本目录新增个人供稿，不修改公共SRS、既有SPEC、API或团队规则；没有建立服务、执行数据库迁移或创建云资源。候选设计须由成员3/8协同、成员1/6确认后纳入统一材料。
