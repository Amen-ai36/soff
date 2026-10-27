# 成员三：需求分析与统一汇编工作包

日期：2026-10-25；版本：0.1；分支：a；任务：M3-ANALYSIS-01。

依据[分工方案 §5.3](../../../../双组并行开发与合并方案.md)，本轮完成成员三的核心类、业务时序和汇编准备。所有新增概念都是分析提案，不冻结公共实体、数据库或 API；人工审阅与成员八复核尚未发生。

## 任务与产物

| 顺序 | 本轮工作 | 产物 |
| --- | --- | --- |
| 1 | 拉取 a，读取本地规范与远端统一 SRS、B 组供稿 | [来源与交接](05-review-and-handoff.md) |
| 2 | 细化科研实体、门户认领权限及多重性 | [类模型说明](01-core-class-model.md)，两张 PUML/SVG |
| 3 | 分析检索、申请、审核的正常与异常处理 | [交互模型说明](02-business-interactions.md)，三张 PUML/SVG |
| 4 | 汇编已收到内容、登记缺稿与两组差异 | [统一分析汇编草稿](03-unified-analysis-draft.md) |
| 5 | 核对需求覆盖、图源和文件引用 | [追踪表](traceability.csv)、[检验记录](validation-report.md) |

这里的汇编草稿是工作底稿，后续接入已有 `docs/deliverables/03-analysis/`，不另立 A 组正式分析报告。该统一目录目前位于 B 组分支，尚未合入 a。本轮不机械合并 B 组，也不覆盖其他成员供稿。

## 图表目录

| 局部图号 | 标题 | 可查看图 | 可编辑源 |
| --- | --- | --- | --- |
| M3-AN-01 | 科研实体类图 | [SVG](diagrams/core-domain.svg) | [PUML](diagrams/core-domain.puml) |
| M3-AN-02 | 认领与权限类图 | [SVG](diagrams/claim-domain.svg) | [PUML](diagrams/claim-domain.puml) |
| M3-AN-03 | 检索处理时序 | [SVG](diagrams/search-sequence.svg) | [PUML](diagrams/search-sequence.puml) |
| M3-AN-04 | 申请与本人查询时序 | [SVG](diagrams/claim-submit-sequence.svg) | [PUML](diagrams/claim-submit-sequence.puml) |
| M3-AN-05 | 认领审核时序 | [SVG](diagrams/claim-review-sequence.svg) | [PUML](diagrams/claim-review-sequence.puml) |

绘制方式：Codex 辅助生成文本图源、本地 PlantUML 渲染；不是 CodeArts 原生工程。局部图号不会替换已提交需求阶段的 M3-FIG-01/02。正式图号暂按汇编草稿映射，待成员八复核。
