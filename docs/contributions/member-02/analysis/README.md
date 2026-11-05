# 成员二：需求分析——数据接入交互模型

日期：2026-10-25；版本：0.2；分支：`member-02/analysis-20261025`。

依据[《双组并行开发与合并方案》§5.3](../../../../双组并行开发与合并方案.md)，成员二、七共同负责「采集任务、更新记录、数据清洗和数据入库」的时序图。本目录交付成员二（A 组）的类模型、交互顺序、追踪关系与图表。

## 1. 任务与产物

| 顺序 | 本轮工作 | 产物 |
| --- | --- | --- |
| 1 | 明确数据处理的类、职责边界与分析级不变量 | [数据处理的类模型](01-data-processing-class-model.md) |
| 2 | 分析采集、增量更新、清洗、入库四条协作的正常与异常路径 | [数据接入交互说明](02-data-pipeline-interactions.md)，四张 CodeArts 顺序图 |
| 3 | 登记章节映射与设计衔接事项 | [分析交接](03-analysis-handoff.md) |
| 4 | 核对需求到模型的追踪与静态校验 | [追踪表](traceability.csv)、[校验记录](validation-report.md) |

## 2. 图表目录

| 图号 | 标题 | 成图 | 导出模型 |
| --- | --- | --- | --- |
| M2-AN-01 | 采集任务执行与停止边界 | [PNG](diagrams/collection-task-sequence.png) | [XML](diagrams/collection-task-sequence-codearts.xml) |
| M2-AN-02 | 增量更新与更新记录 | [PNG](diagrams/incremental-update-sequence.png) | [XML](diagrams/incremental-update-sequence-codearts.xml) |
| M2-AN-03 | 数据清洗与去重消歧 | [PNG](diagrams/cleaning-sequence.png) | [XML](diagrams/cleaning-sequence-codearts.xml) |
| M2-AN-04 | 入库与公开投影一致性 | [PNG](diagrams/persistence-sequence.png) | [XML](diagrams/persistence-sequence-codearts.xml) |

## 3. 与既有材料的边界

1. 需求阶段的「采集任务状态图」（见 [`../requirements/03-collection-task-state-machine.md`](../requirements/03-collection-task-state-machine.md)）描述状态与迁移；M2-AN-01 描述参与者之间的消息顺序、事务边界和停止位置，不把它改称状态图，也不新增冲突状态。
2. 本目录的类是分析提案，不冻结数据库表、公共 API 或部署拓扑；与成员一整体类模型、成员三核心类模型的映射见[类模型第 4 节](01-data-processing-class-model.md#4-与成员一成员三模型的映射)。
3. 图中的「权威业务库」「索引投影」「原始载荷存储」是职责参与者，不表示已经完成存储或检索选型。
4. 成员二的需求使用逐条「验收要点」而非独立 AC 编号，追踪表因此使用 `verification` 列；汇编时可再统一映射到正式验收编号。

## 4. 绘制方式

四张 UML 顺序图均使用华为云 CodeArts Modeling 绘制，文档展示图形区域截图。
