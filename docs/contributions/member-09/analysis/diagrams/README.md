# 需求分析阶段图表说明（成员 9）

状态：成员 9 分析阶段草案。PlantUML 语义稿，不作为 CodeArts 平台实操证据。

## 图表清单

| 文件 | 类型 | 对应文档 | 说明 |
| --- | --- | --- | --- |
| [frontend-load-state.puml](frontend-load-state.puml) | 状态机图 | [02-frontend-state-model.md](../02-frontend-state-model.md) 第 3 节 | 前端数据加载状态机，含 7 个状态与转换规则 |
| [search-interaction-sequence.puml](search-interaction-sequence.puml) | 时序图 | [01-page-interaction-model.md](../01-page-interaction-model.md) 第 4.1、4.2 节 | 关键词检索与组合筛选交互序列，含异常分支 |
| [claim-interaction-sequence.puml](claim-interaction-sequence.puml) | 时序图 | [01-page-interaction-model.md](../01-page-interaction-model.md) 第 4.6、4.7 节 | 认领提交与状态查询交互序列，含冲突处理 |

## 与其他岗位图表的分工

本目录只覆盖成员 9 职责范围（用户与页面交互、前端状态、异常反馈），不重复其他岗位的图：

| 图表 | 负责岗位 | 位置 |
| --- | --- | --- |
| 总体用例图 | 成员 1、6 | `docs/deliverables/02-requirements/diagrams/` |
| 核心业务类图 | 成员 3、8 | 分析阶段待提交 |
| 认领审核活动图 | 成员 3、8 | `docs/deliverables/02-requirements/diagrams/` |
| 认领申请状态图（业务状态） | 成员 3、8 | `docs/deliverables/02-requirements/diagrams/` |
| 检索处理时序图（服务端） | 成员 3、8 | 分析阶段待提交 |
| 采集任务状态图 | 成员 2、7 | `docs/contributions/member-07/requirements/diagrams/` |
| 数据清洗与入库时序图 | 成员 2、7 | 分析阶段待提交 |

**边界说明**：本目录的时序图描述界面与服务的交互契约层面（用户看到什么、何时看到），成员 3、8 的时序图描述服务内部处理流程。两者在"服务请求/响应"处衔接，不重叠。

**状态图边界**：本目录的状态机是前端可观察状态（加载中、已展开等），成员 3、8 的认领申请状态图是后端业务状态（`PENDING`、`APPROVED` 等）。前端状态不覆盖业务状态，见 [02-frontend-state-model.md](../02-frontend-state-model.md) 第 1.1 节。

## 渲染方式

```bash
# 单个文件
plantuml frontend-load-state.puml

# 全部导出 SVG
plantuml -tsvg *.puml
```

在线渲染：http://www.plantuml.com/plantuml/

## 未完成项

- [ ] 在 CodeArts 中建立对应图表（PlantUML 稿不替代平台实操）
- [ ] 导出清晰图片供 PPT 使用
- [ ] 与成员 4 对照方案 A 的交互图，确认差异

---

**编制人**：成员 9
**编制日期**：2026-10-13
