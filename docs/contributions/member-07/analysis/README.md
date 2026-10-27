# 成员7 数据采集与处理需求分析

日期：2026-10-27。方案：B组。来源基线：b@90ff356。状态：个人分析供稿，供成员3汇编、成员8复核及成员1/6确认公共规则；不另立第二套正式报告。

本周将已有需求和SPEC展开为业务对象、协作消息、失败恢复和版本发布条件。A组成员2的四图划分仅作为组织方式参考，业务规则取自B组成员7/6/8/9及统一SRS。没有复制A组的任务恢复、非法DOI或事务外发日志方案。

## 先看什么

文件版：[Word章节供稿](成员7-B组数据处理需求分析供稿.docx)、[整包阅读入口](阅读入口.html)、[Word版式检查](word-layout-review.md)。Word保留正文，完整参考图单独提供，避免缩印后无法照画。

1. [CodeArts绘图清单](04-codearts-drawing-guide.md)：本周应手动画的四张顺序图、生命线顺序、消息、组合片段和导出要求。
2. [数据对象和关系](01-data-object-model.md)：任务、批次、来源、更新、规范成果与发布版本的分析职责。
3. [四条数据交互](02-data-pipeline-interactions.md)：前置条件、正常路径、异常路径和图的衔接。
4. [交接与方案比较](03-analysis-handoff.md)：B组规则、前端问题答复、未决项及汇编位置。
5. [分析走查清单](05-walkthrough.md)、[追踪表](traceability.csv)、[检查记录](validation-report.md)。
6. [展示供稿与问答](slides/slide-content.md)：交成员5/10汇编，不是全组最终PPT。

## 本周图表

| 图号 | 图名 | 本地参考图 | CodeArts工作 |
| --- | --- | --- | --- |
| M7-AN-SEQ-01 | 采集任务执行与安全停止 | [PNG](diagrams/collection-task-sequence.png) / [SVG](diagrams/collection-task-sequence.svg) / [PUML](diagrams/collection-task-sequence.puml) | [已归档 PNG](diagrams/codearts/M7-AN-SEQ-01-codearts.png) |
| M7-AN-SEQ-02 | 增量更新与更新记录 | [PNG](diagrams/incremental-update-sequence.png) / [SVG](diagrams/incremental-update-sequence.svg) / [PUML](diagrams/incremental-update-sequence.puml) | [已归档 SVG](diagrams/codearts/M7-AN-SEQ-02-codearts.svg) |
| M7-AN-SEQ-03 | 数据清洗与保守去重消歧 | [PNG](diagrams/cleaning-sequence.png) / [SVG](diagrams/cleaning-sequence.svg) / [PUML](diagrams/cleaning-sequence.puml) | [已归档 SVG](diagrams/codearts/M7-AN-SEQ-03-codearts.svg) |
| M7-AN-SEQ-04 | 候选版本入库与确认发布 | [PNG](diagrams/publication-sequence.png) / [SVG](diagrams/publication-sequence.svg) / [PUML](diagrams/publication-sequence.puml) | [已归档 SVG，保持用户提供版本](diagrams/codearts/M7-AN-SEQ-04-codearts.svg) |
| M7-AN-CLS-01 | 数据侧对象关系 | [PNG](diagrams/data-domain.png) / [SVG](diagrams/data-domain.svg) / [PUML](diagrams/data-domain.puml) | 给核心类图作者的局部输入，不额外要求重画全系统类图 |

四张顺序图共同构成课程要求的数据采集入库交互模型。SEQ-01控制任务，SEQ-02决定增量输入，SEQ-03逐记录处理，SEQ-04分“候选保存”和“最终发布”两段；不是把四条路径机械串成一次重复执行。

## 完成边界

已编制B组文字、图源、走查、追踪和展示供稿，并归档用户提供的四张CodeArts导出图。`diagrams/`根目录仍为PlantUML参考图，`diagrams/codearts/`才是平台导出文件，二者不混称。图4按用户要求原样提交。[导出登记](diagrams/codearts/README.md)记录文件校验和、图1至3的平台定位及图4工程定位待补事项。PNG/SVG是图像导出，不等于可编辑工程源备份。Word为个人章节供稿；本人理解审阅、成员8复核、全组汇编和课堂提交尚待完成。

本包没有生产代码、数据库表设计、公共API、真实一万条/百万条导入或性能测试。检查记录只证明所列静态检查。依据根目录AGENT，本阶段文档整理不新建核心代码AI日志；如课堂另要求AI声明，应如实说明AI辅助文字、图源、平台绘图及检查，用户提供导出文件并负责理解和审阅，不伪造纯人工创作或审签记录。
