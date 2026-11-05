# 需求建模：数据采集与治理交付入口

版本：1.0
日期：2026-10-12
编制：成员 2

## 1. 本目录的定位

依据《双组并行开发与合并方案》第 5.2 节，成员 2、7 共同负责：

- 数据采集、清洗、去重、消歧和增量更新需求；
- 上述模块对应的核心模块 SPEC；
- 采集任务状态图；
- 候选数据源的许可、字段和实际可访问性验证。

## 2. 文件清单

| 文件 | 内容 | 状态 |
| --- | --- | --- |
| [01-data-pipeline-requirements.md](01-data-pipeline-requirements.md) | 采集、清洗、去重、消歧、增量更新和数据质量需求 | 已完成 |
| [specs/SPEC-DATA-001-source-adapter.md](specs/SPEC-DATA-001-source-adapter.md) | 数据源适配与字段级许可 SPEC | 已完成 |
| [specs/SPEC-DATA-002-collection-task.md](specs/SPEC-DATA-002-collection-task.md) | 采集任务编排、重试、停止和幂等 SPEC | 已完成 |
| [specs/SPEC-DATA-003-cleaning-normalization.md](specs/SPEC-DATA-003-cleaning-normalization.md) | 清洗、标准化和字段保留 SPEC | 已完成 |
| [specs/SPEC-DATA-004-dedup-disambiguation.md](specs/SPEC-DATA-004-dedup-disambiguation.md) | 成果去重、作者消歧和机构归一化 SPEC | 已完成 |
| [specs/SPEC-DATA-005-incremental-update.md](specs/SPEC-DATA-005-incremental-update.md) | 水位线、增量更新和冲突处理 SPEC | 已完成 |
| [specs/SPEC-DATA-006-quality-gate.md](specs/SPEC-DATA-006-quality-gate.md) | 数据质量规则、计数和公开准入 SPEC | 已完成 |
| [03-collection-task-state-machine.md](03-collection-task-state-machine.md) | 采集任务状态、事件、守卫、动作和异常恢复 | 已完成 |
| [diagrams/collection-task-state-codearts.png](diagrams/collection-task-state-codearts.png) | 状态图 CodeArts Modeling 成品截图 | 已完成 |
| [diagrams/collection-task-state-codearts.xml](diagrams/collection-task-state-codearts.xml) | 状态机模型导出文件 | 已完成 |
| [diagrams/README.md](diagrams/README.md) | 状态图图元清单与迁移清单 | 已完成 |
| [evidence/2026-10-12-source-accessibility-validation.md](evidence/2026-10-12-source-accessibility-validation.md) | 候选数据源许可、字段和实际访问结果 | 已完成 |

## 3. 需求追踪

| 上游需求 | 本文承接内容 |
| --- | --- |
| R02 四类成果采集或导入 | DR-COL-001 至 DR-COL-014，SPEC-DATA-001、002 |
| R03 清洗、去重、作者消歧、机构归一化 | DR-CLN、DR-DED、DR-DIS、DR-INS 系列，SPEC-DATA-003、004 |
| R04 增量更新与采集任务管理 | DR-INC 系列，SPEC-DATA-002、005，状态机 |
| R05 至少 10,000 条成果 | DR-COUNT-001 至 DR-COUNT-005，SPEC-DATA-006 |
| R11 采集到统计完整链路 | DR-PIPE-001 至 DR-PIPE-008 |
| R14 数据合规、来源追溯、模拟标记 | DR-GOV-001 至 DR-GOV-012，SPEC-DATA-001、006 |

## 4. 当前结论

1. 一期数据主链建议使用 OpenAlex、DBLP、CORDIS、NSF 和正式获奖公告；EPO OPS、USPTO 作为专利候选，NSFC 和 CNIPA 公共页面只做授权后的补充。
2. “10,000 条”按公共 canonical 表中去重、字段校验通过、许可通过且允许公开的记录统计，不把原始抓取行、失败行、重复来源行和待授权数据计入。
3. 数据源适配、采集任务、清洗、去重消歧、增量更新和质量闸门必须分别具有独立 SPEC 和测试入口。
4. 两组应使用同一冻结输入和同一验收样本；算法实现可以不同，公共字段语义、来源追溯和计数口径必须一致。
5. 当前 NSFC、EPO OPS、CORDIS DET API 和部分中国官方页面缺少本机可用的人工授权或访问凭证，未取得授权前不得转为核心自动链路。

## 5. 实施基线

具体实现参数、数量分布、专利接入路线和字段级许可配置以本版需求与证据口径为基线；实现阶段不得降低来源追溯、字段级许可、去重后计数和失败隔离要求。
