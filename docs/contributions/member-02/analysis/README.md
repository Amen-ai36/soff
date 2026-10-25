# 成员二：需求分析——数据接入交互模型

日期：2026-10-25；版本：0.1；分支：`a`。

依据[《双组并行开发与合并方案》§5.3](../../../../双组并行开发与合并方案.md)，成员二、七共同负责「采集任务、更新记录、数据清洗和数据入库」的时序图。本目录只提供成员二（A 组）的分析供稿，不另立 A 组正式分析报告；正式汇编由成员三负责、成员八复核，最终接入统一目录 `docs/deliverables/03-analysis/`。

## 1. 任务与产物

| 顺序 | 本轮工作 | 产物 |
| --- | --- | --- |
| 1 | 明确数据处理的类、职责边界与分析级不变量 | [数据处理的类模型](01-data-processing-class-model.md) |
| 2 | 分析采集、增量更新、清洗、入库四条协作的正常与异常路径 | [数据接入交互说明](02-data-pipeline-interactions.md)，四张 PUML/SVG |
| 3 | 登记交接输入、开放问题与汇编映射 | [分析交接](03-analysis-handoff.md) |
| 4 | 核对需求到模型的追踪与静态校验 | [追踪表](traceability.csv)、[校验记录](validation-report.md) |

## 2. 图表目录

| 局部图号 | 标题 | 可查看图 | 可编辑源 |
| --- | --- | --- | --- |
| M2-AN-01 | 采集任务执行与停止边界 | [SVG](diagrams/collection-task-sequence.svg) | [PUML](diagrams/collection-task-sequence.puml) |
| M2-AN-02 | 增量更新与更新记录 | [SVG](diagrams/incremental-update-sequence.svg) | [PUML](diagrams/incremental-update-sequence.puml) |
| M2-AN-03 | 数据清洗、标准化与去重消歧 | [SVG](diagrams/cleaning-sequence.svg) | [PUML](diagrams/cleaning-sequence.puml) |
| M2-AN-04 | 入库与公开投影一致性 | [SVG](diagrams/persistence-sequence.svg) | [PUML](diagrams/persistence-sequence.puml) |

## 3. 与既有材料的边界

1. 需求阶段的「采集任务状态图」（见 [`../requirements/03-collection-task-state-machine.md`](../requirements/03-collection-task-state-machine.md)）描述状态与迁移；M2-AN-01 描述参与者之间的消息顺序、事务边界和停止位置，不把它改称状态图，也不新增冲突状态。
2. 本目录的类是分析提案，不冻结数据库表、公共 API 或部署拓扑；与成员一整体类模型、成员三核心类模型的映射见第 5 节。
3. 图中的「权威业务库」「索引投影」「原始载荷存储」是职责参与者，不表示已经完成存储或检索选型。
4. 成员二的需求使用逐条「验收要点」而非独立 AC 编号，追踪表因此使用 `verification` 列；汇编时可再统一映射到正式验收编号。

## 4. 绘制方式

Codex 辅助生成 PlantUML 文本源，本地 PlantUML 1.2024.7 渲染 SVG；**不是 CodeArts 原生工程**。局部图号 M2-AN-01..04 不替换需求阶段的图号，正式图号由汇编负责人在统一目录中分配。

## 5. 与其他岗位的衔接

| 对象 | 本目录提供 | 对方需返回 |
| --- | --- | --- |
| 成员一/六 | 数据任务、批次、来源记录与规范成果的职责边界和时序 | 与整体类模型、公共实体的命名与基数意见 |
| 成员三/八 | 数据接入的四条时序、版本与发布一致性规则 | 汇编编号、跨图一致性复核、与检索/统计模型的接口 |
| 成员四/九 | 「已保存」「待索引」「部分失败」的语义 | 页面如何区分这些状态、错误与重试提示 |
| 成员五/十 | 可检查的不变量与异常场景 | 一致性核查、测试与展示材料引用 |
| 成员七（B 组） | A 组方案与时序 | B 组差异对照，公共字段语义与计数口径 |
