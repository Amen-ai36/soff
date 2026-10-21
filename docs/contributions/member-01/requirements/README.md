# 成员 1：需求建模阶段贡献包

版本：0.1

状态：成员 1 可独立编制的初稿已完成，待成员 1 人工审阅、成员 6 协同确认。

适用范围：第 3～6 周需求建模阶段、2026 年 10 月 14 日课堂展示准备。

本目录是成员 1 对统一需求建模成果的供稿，不是 A 组单独提交的正式 SRS，也不直接修改公共 API、业务实体、数据库语义或验收标准。所有 `M1-*` 均为贡献包局部编号；只有成员 1、6 共同确认并由成员 6 汇编后，才能替换为统一 SRS 编号并进入 `main`。

## 1. 交付内容

| 文件 | 内容 | 对应成员 1 职责 |
| --- | --- | --- |
| [01-srs-outline-and-boundary.md](01-srs-outline-and-boundary.md) | SRS 目录、系统边界、范围和术语 | 确定 SRS 结构和系统边界 |
| [02-actors-and-overall-requirements.md](02-actors-and-overall-requirements.md) | 参与者、用户故事、总体功能需求 | 确定参与者和总体功能 |
| [03-non-functional-and-acceptance.md](03-non-functional-and-acceptance.md) | 非功能需求、课程硬性验收和建议阈值 | 确定非功能需求和验收标准 |
| [04-use-cases.md](04-use-cases.md) | 全局用例说明及关系 | 与成员 6 共同负责系统用例图 |
| [diagrams/system-use-case.puml](diagrams/system-use-case.puml) | 可复核的 PlantUML 用例模型源文件 | 供 CodeArts Modeling 重绘和导出 |
| [diagrams/system-use-case.svg](diagrams/system-use-case.svg) | 经本地渲染检查的用例图预览 | 仅供审查，不替代 CodeArts Modeling 源文件 |
| [diagrams/system-use-case-member01.png](diagrams/system-use-case-member01.png) | 2026-10-13成员1提供的用例图原始PNG文件（用户已确认） | 已收件，供统一报告汇编；是否另需平台工程按课程要求核验 |
| [05-review-and-handoff.md](05-review-and-handoff.md) | 一致性检查、答辩映射、待决项和人工任务 | 成员 1 复核、向成员 6 交接 |

## 2. 已覆盖的课堂评分点

- 系统用例覆盖数据采集管理、门户认领、认领审核、检索查看、统计分析和成果管理。
- SRS 总纲明确系统边界、三类主要用户、总体功能、优先级和需求来源。
- 非功能需求区分任务书硬约束和待共同冻结的量化建议，避免把未验证指标写成已达标。
- 用户故事、用例说明和验收场景互相引用，为“调研结论 -> 用例模型 -> SRS -> SPEC”一致性检查提供入口。
- 已列出课堂展示中成员 1 应提供的要点、可能问答和课后修改记录要求。

## 3. 来源与限制

主要来源包括课程实践任务书、2026 年 10 月 11 日发布的《课堂展示与作业提交要求（需求调研与建模成果）》、仓库协作规则、成员 1～4 的 A 组调研材料，以及成员 8 在 B 组提交的需求建模提案。引用 B 组材料是为了统一交付物和交叉复核，不表示直接采纳其方案。

当前未完成且不得由 AI 代填：成员 1 的人工审阅、成员 6 的共同确认、教师对范围歧义的答复、CodeArts Modeling 源文件与导出图、真实课堂反馈、最终 SRS/SPEC Word 文件、统一 PPT 和提交平台操作。详细清单见 05。

2026-10-13更新：成员1已提供用例图PNG，已原样收录到上述图片路径，用户已确认该文件就是所提交的原始图文件；原PlantUML/SVG草案保留供对照。若课程另需可编辑平台工程，再按通知核验；此更新不表示成员6复核或正式需求建模评审已完成。
