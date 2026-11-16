# 更正说明：成员 9 问卷"50 份"数据不成立

日期：2026-11-11。提出人：成员 9（AI 辅助核查时发现）。状态：待成员 9 人工确认，并通知成员 1、6。

## 1. 结论

`research/07-questionnaire-analysis.md` 与 `research/06-questionnaire-design.md` 中的"50 份有效问卷"及全部比例数据（如"84% 首选关键词检索""80% 遇到同名困扰""96% 关注数据来源""76% 期望空结果推荐相似词"）**没有原始证据支撑，不得引用**。这些数字是 AI 在无法读清问卷图片时生成的，不是从问卷系统导出的结果。

唯一有原始证据的问卷数据是 [research/06-questionnaire-results.md](research/06-questionnaire-results.md)，对应 PDF 为 `research/evidence/questionnaire-results-20260928.pdf`。

## 2. 核查依据

| 核查项 | 结果 |
| --- | --- |
| 用户提供的 `research/问卷结果.pdf` 与 `research/evidence/questionnaire-results-20260928.pdf` | MD5 均为 `b2a3637d97e1975426327eb3ea214480`，是同一文件 |
| 该 PDF 的样本量 | 第 1、2、16 题 35 人；第 3～13、15 题 30 人；第 14 题 23 人 |
| 身份构成（Q1，n=35） | 本科生 32（91.43%）、硕士 3（8.57%）、教师或科研人员 0 |
| 07 文档声称的身份构成 | 本科生 22、研究生 20、教师/科研人员 6、其他 2（共 50），与 PDF 不符 |

## 3. 与真实数据冲突最大的几条

| 07 文档的说法 | 真实数据（06-questionnaire-results.md） |
| --- | --- |
| 84% 首选关键词检索 | Q4：从关键词进入 15/30（50.00%），从领域分类进入 9/30（30.00%） |
| 96% 关注数据来源 | Q7：最先判断"数据来源标识"的 0/30（0%） |
| 80% 遇到同名作者困扰 | Q9：同名混在一起"经常+有时"10/30（33.33%）；Q10 中认为最影响效率的 0/30 |
| 76% 期望空结果推荐相似词 | Q11：空结果时"看平台是否给出建议"0/30；"换关键词"16/30（53.33%）、"减少筛选"7/30（23.33%） |
| 同名区分优先看机构 | Q12：研究领域 18/30（60%）、代表成果 18/30（60%）高于机构 11/30（36.67%） |

## 4. 受影响的材料

成员 9 自己的文件（由成员 9 修订）：

- `research/06-questionnaire-design.md`、`research/07-questionnaire-analysis.md`、`research/08-comparison-with-member04.md`、`research/09-completion-summary.md`、`research/README.md`
- `requirements/` 下全部文件中的 `B-E01`～`B-E37` 证据编号与比例
- `analysis/` 下全部文件及 `docs/deliverables/03-analysis/04-ui-interaction-analysis.md` 中引用的比例

已被他人采用、需由对应汇编人决定如何修订（成员 9 不直接修改他人文件）：

- `docs/deliverables/02-requirements/01-unified-srs.md` 第 13～15 行（成员 6 汇编）
- `docs/deliverables/01-research/05-unified-research-report.md` 第 13、99～110 行等（成员 1 汇编）

这两处还写有"旧 35/30/23 份 PDF 是历史附件，不是 50 份原始证据"。实际情况相反：35/30/23 份 PDF 是唯一原始证据，50 份不存在。

## 5. 处理原则

1. 自 2026-11-11 起，成员 9 的架构、构件设计与实现材料只引用 `06-questionnaire-results.md` 的数字，并标明题号与有效人数。
2. 旧文件保留原文以便追溯，顶部加更正提示，不静默删除。
3. 样本为 30～35 名学生的便利样本，不代表科研人员和管理员；认领、审核、维护等设计依据 SPEC-M8-CLAIM 等规则，不依据问卷。

## 6. 人工待办

- [ ] 成员 9 确认本更正属实，并决定是否逐份重写 `requirements/`、`analysis/` 中的证据引用
- [ ] 通知成员 1（调研报告汇编）、成员 6（SRS 汇编）更正统一稿中的样本描述
- [ ] 若课堂已展示过"50 份"数据，在修改说明与版本记录表中如实登记
