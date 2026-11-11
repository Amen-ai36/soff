# 模型 A 使用记录

## 2026-11-11 · M3-ARCH-01 / M3-COMP-01

- 模型：Codex（GPT-6系列；精确部署版本未提供，不编造小版本）。岗位：A组成员三。
- 提示：[M3-ARCH-COMP-20261111](prompts/M3-ARCH-COMP-20261111.md)；用户要求拉取远端、判断阶段、再做两个阶段，先列任务、逐项完成并检验，期间指示“继续”。
- 依据：SPEC-M3-AUTH/SEARCH/CLAIM/STATS；本轮先编制 SPEC-M3-DESIGN-001，再建立候选SQL/JSON与验证脚本。固定a@87724d1、main@982ddca、b@6f3c8fb，需求分析复核已完成，按百万公开规范成果目标设计。
- 产物：[成员三架构供稿](../../contributions/member-03/architecture/README.md)、[构件供稿](../../contributions/member-03/component-design/README.md)：存储/业务/检索统计/一致性、三项ADR输入、E-R、表索引、ES映射、18操作OpenAPI候选、内部异步端口、16需求追踪及验证。没有修改公共契约、根团队规则或业务代码。
- 实际检验：`python docs/contributions/member-03/component-design/validate.py`，25个SQLite单连接设计试验通过，静态核查18操作、16需求、24项AC定义映射、4张图源和12项固定Git来源；`python docs/contributions/member-03/analysis/validate.py`原分析静态检查通过；`git diff --check`通过。新增未跟踪文本也由脚本检查尾随空白。最终精确计数以[验证报告](../../contributions/member-03/component-design/validation-report.md)为准。
- AI自检修正：[真实失败与修正](../../contributions/member-03/component-design/self-review-corrections.md)，先保留复现断言，修复历史关系可变、已发布快照可解冻、SQLite文本主键允许null三个问题；原失败摘要保留。不是“人工修正”证据。
- 人工审查：成员三本人审阅、成员八交叉复核和成员一/六共同确认尚未实际发生，不代签。公共字段、路径、状态及数据库引擎仍为候选。
- 限制：没有真实HTTP、官方OpenAPI验证器、ES集群、生产数据库并发、百万容量、CodeArts原生工程或云部署验证。无Git提交/远端推送、采购、真实认领、对他人发消息或课程平台提交。

## 2026-11-11 · M4-ARCH-UI-09-11

- 模型：Codex（GPT-5）。
- 提示：以成员 4 身份完成第 9～11 周工作，承接《双组并行开发与合并方案》§5.4～§5.5，提交到分支 `a`。
- 输入：成员 4 第 7～8 周页面交互/状态/异常材料；成员 1 的 A 组架构与构件边界、成员 3 的认证/检索/认领/统计 SPEC，以及根目录协作规则。
- 产物：`docs/contributions/member-04/architecture/` 的展现层架构、前后端通信、页面模块/创新接入、追踪交接；`docs/contributions/member-04/component-design/` 的信息架构、视觉规范、页面设计、交互状态、创新 UI 和评审交接；更新成员 4 总入口。
- 人工审阅与修正：保留“候选/待共同确认”状态；未新增公共 API、字段、业务枚举、数据库语义或前端代码，创新功能仅按 UI 接入边界描述。
- 验证：检查相对链接、Mermaid 围栏、需求编号引用、公共契约关键词和 `git diff --check`；未执行构建、端到端、性能或真实用户测试，因为仓库尚未确定技术栈和可运行前端。

## 2026-11-11 · M4-COMPONENT-10-12

- 模型：Codex（GPT-5）。
- 提示：在上一轮成员 4 第 9～11 周架构/UI 供稿基础上完成第 10～12 周构件设计收尾，提交到分支 `a`。
- 产物：新增 `component-design/07-validation-report.md` 和 `08-ppt-materials.md`；更新构件设计 README、成员 4 总入口和本记录。
- 人工审阅与修正：将第 12 周范围限定为静态验证、PPT 交接和实现待办；保留真实用户测试、前端构建、公共契约和创新选择为待确认事项。
- 验证：执行相对链接、代码围栏、UI4 编号和 `git diff --check` 检查；未执行构建、端到端或无障碍运行测试，因为仓库仍未确定前端技术栈。

## 2026-11-05 · M2-ARCH-01

- 模型：Codex（GPT-6）。
- 提示：“你做一下这个架构设计吧。”范围承接《双组并行开发与合并方案》§5.4 的成员 2 职责。用户要求先查看本地交付，再决定是否提交 PR。
- 约束来源：SPEC-DATA-001～006、M2-AN-01～04、统一需求分析及成员 7 分析材料。
- 产物：[数据采集与 ETL 架构设计](../../contributions/member-02/architecture/01-data-pipeline-architecture.md)和[架构决策依据](../../contributions/member-02/architecture/02-architecture-decision-inputs.md)。正文包含架构图、事务边界、双水位、投影发布、容量目标和验收场景。
- 人工审阅与修正：交付本地审阅版本。人工改动以实际记录为准。
- 图表：按用户要求，在华为云 CodeArts Modeling 中创建 M2-ARCH-01，使用原生 UML 组件和依赖连线。保存并刷新后核对 14 个构件、16 条依赖，将画布截图嵌入正文。
- 模型文件：从已保存的 CodeArts 图导出架构图和 4 张顺序图的 XML，与已有采集任务状态机 XML 一起按图归档。
- 验证：静态检查覆盖架构文档的本地引用、6 项 SPEC 和截图文件。运行 `python docs/contributions/member-02/analysis/validate.py`，原分析材料校验通过，包含 28 条追踪记录及 4 张 PNG。运行容量和性能将在实现阶段实测。
