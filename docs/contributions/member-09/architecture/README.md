# 成员 9：架构设计阶段贡献包（方案 B，PH-9）

日期：2026-11-11。阶段：第 9～11 周。分支：`b`。汇编负责人：成员 6。复核负责人：成员 1。

## 职责

方案第 5.4 节：成员 4、9 共同编写**展现层、前后端通信、页面模块和创新功能接入架构**。成员 6 汇编稿 [02-system-architecture.md](../../member-06/architecture-20261118/02-system-architecture.md) 中为成员 9 预留槽位 PH-9，本目录即该槽位的供稿。

## 文件

| 文件 | 内容 | 对应课程评审点 |
| --- | --- | --- |
| [01-presentation-layer.md](01-presentation-layer.md) | 展现层分层与依赖规则、13 个路由与页面模块、状态管理、非功能考量、与分析阶段的对应、真实问卷对页面的影响、方案 A/B 比较指标 | 逻辑架构分层职责与依赖；非功能考量；与需求分析一致 |
| [02-frontend-backend-communication.md](02-frontend-backend-communication.md) | 通信方式、命名转换、错误模型、超时与取消、幂等与并发、会话、18 项契约假设 | 服务间通信方式 |
| [03-innovation-integration.md](03-innovation-integration.md) | 创新功能注册表与开关、B 组候选"合作路径探索"及其算法放置 | 创新接入 |
| [04-adr-candidates.md](04-adr-candidates.md) | 4 条 ADR 候选：前端技术栈、`ApiClient` 隔离、URL 作为检索状态、创新接入方式 | ADR（背景、候选、决策、后果、验证） |
| [diagrams/](diagrams/) | 展现层分层依赖图、前后端通信时序图（PlantUML 源稿与 PNG） | 架构图 |

## 与成员 6 稿的关系

| 成员 6 稿中的约束 | 本目录的落实 |
| --- | --- |
| 页面不能直连数据库 | 浏览器代码只依赖 `ApiClient`，无存储客户端；架构测试检查 |
| 管理后台不绕过业务授权直接写库 | 管理页同样只调 `ApiClient`；权限以服务端响应为准 |
| 前端隐藏不代替授权 | 路由守卫只做登录引导，403/404 由服务端返回后显示 |
| 七类服务中"管理后台"由 4、9 负责界面 | 认领审核、采集任务两个管理页 |
| ADR M6-ARCH-01～04 | 本目录 ADR-M9-01～04 只涉及浏览器端，与之不重叠 |

## 本阶段的更正

架构稿只引用真实问卷 [06-questionnaire-results.md](../research/06-questionnaire-results.md)（35/30/23 人）。此前材料中的"50 份问卷"及比例无原始证据，已在 [更正说明](../CORRECTION-questionnaire-data.md) 中登记。据真实数据，首页由原方案 B 的"三入口并列"改为"检索为主、领域为第二入口"，详见 01 文档第 6.1 节。

## 未完成与人工待办

- [ ] 成员 9 审阅本目录，确认决策可由本人负责（课程要求关键架构决策由团队成员负责）
- [ ] 提交成员 6 汇编进 PH-9；ADR-M9-01～04 由成员 1、6 共同确认后填写联合确认记录
- [ ] 在 CodeArts Modeling 中复画两张图；本目录 PNG 由 PlantUML 生成，不替代平台原生图
- [ ] 待成员 4 供稿后填写 01 文档第 7 节方案 A 列
- [ ] 向成员 3、8 确认 18 项契约假设，向成员 2、7 确认采集任务接口（A-15）
- [ ] 成员 10 确认 CodeArts 构建环境 Node 版本（ADR-M9-01 后果）

## 渲染

```bash
java -jar plantuml.jar -Playout=smetana -charset UTF-8 -tpng diagrams/*.puml
```

本目录 PNG 用 PlantUML 1.2025.10 生成，命令已实际执行。
