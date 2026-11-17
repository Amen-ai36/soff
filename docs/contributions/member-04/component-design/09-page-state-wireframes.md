# 页面状态原型覆盖补充

状态：A 组候选的静态页面状态原型；用于第 10～12 周评审和实现交接，不代表前端已实现或通过真实用户测试。

`../prototypes/source/page-states.html` 是可编辑源文件，`../prototypes/source/render-page-states.ps1` 使用本机 Chrome/Edge 导出 PNG。页面固定为 1440×1000 的导出画布，内容画板为 1366×920，便于在 PPT 中保持比例。

## 页面覆盖矩阵

| 需求页面 | 页面状态证据 | 主要评审点 |
| --- | --- | --- |
| UI4-P01 首页与检索入口 | `../prototypes/images/home.png` | 关键词检索优先、公开统计口径 |
| UI4-P02 检索结果 | `../prototypes/images/results.png` | 条件快照、筛选、空结果入口 |
| UI4-P03 成果详情 | `../prototypes/images/state-detail.png` | 公开字段、来源状态、关联入口 |
| UI4-P04 学者门户 | `../prototypes/images/portal.png` | 公开简介、成果和认领入口 |
| UI4-P05 公开统计 | `../prototypes/images/state-stats.png` | 时间范围、分母、未知值和可读列表替代 |
| UI4-P06 登录 | `../prototypes/images/state-login.png` | 会话恢复边界、提交反馈和权限提示 |
| UI4-P07/P08 认领申请与状态 | `../prototypes/images/claim.png` | 申请、审核中、结果未知和返回路径 |
| UI4-P09 门户维护 | `../prototypes/images/state-maintenance.png` | 授权边界、版本冲突、保存与索引同步 |
| UI4-P10 纠错与反馈 | `../prototypes/images/state-feedback.png` | 公开对象、隐私隔离、反馈状态 |
| UI4-P11 认领审核工作台 | `../prototypes/images/state-review.png` | 申请锁定、通过/驳回理由、通知失败 |
| UI4-P12 采集任务概览 | `../prototypes/images/state-tasks.png` | 任务/尝试/批次/发布水位和重试反馈 |

## 使用边界

- PNG 是静态评审证据，不能替代真实浏览器交互、键盘测试、对比度检查或端到端测试。
- 示例姓名、成果、数量、版本和时间均为模拟值；公共字段和状态仍以统一 SRS、API 契约和业务确认结果为准。
- 页面状态原型补齐了 P03、P05、P06、P09～P12 的可视化证据，但不意味着这些页面已由成员 4 实现。
