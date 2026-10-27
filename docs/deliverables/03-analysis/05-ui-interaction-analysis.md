# 统一用户交互、前端状态与异常反馈

2026-10-27，接入成员4/9实际供稿及成员7/8答复。原04-ui-interaction-analysis.md是成员9早期单方供稿，保留作来源；当前统一说明以本文件及06差异表为入口。

## 1 输入与边界

[成员4](../../contributions/member-04/analysis/README.md)提供页面交互、视图迁移、异常、追踪及展示页稿；[成员9](../../contributions/member-09/analysis/README.md)提供交互用例、五类状态、异常组合及待决问题。二者不定义最终URL、机器码或业务状态枚举。

问卷采用成员9的50份汇总，便利样本不推广总体；不根据旧供稿比例补编原始答卷或访谈。具体比例须回到统一报告和原题范围核对，不重复传播未经确认的数字。

## 2 检索与门户交互

共同流程为输入、校验、请求、加载、展示结果或可解释反馈。筛选变化重置分页；详情返回保留条件；按规范实体ID打开门户；同名区分信息必须来自可公开证据。

新请求对应新的界面上下文，旧请求迟到不能覆盖新结果。重复点击应受控，服务端仍须验证权限、参数与幂等，不能只依赖按钮禁用。

| 情形 | 页面表达 | 禁止推断 |
| --- | --- | --- |
| 尚未查询 | 初始入口或示例 | 不先显示0条结果 |
| 合法查询无匹配 | 空态与修改条件建议 | 不把故障当空态 |
| 依赖失败 | 明确失败、保留非敏感条件及恢复入口 | 不虚构最新数据或正常成功 |
| 版本无法复现 | 刷新并重新确认条件 | 不承诺跨版本分页不重不漏 |
| 未知字段 | 未提供或未知，按口径单列 | 不替换为真实机构或数值0 |

显式点击筛选与即时应用都是候选，尚不把某组方式设为已批准公共行为。

## 3 认领、审核与维护反馈

登录成功、材料上传、申请创建和授权建立是不同事件。待审不展示维护权；通过后按当前授权显示维护入口。补充操作可作为新表单本地状态，不能把旧驳回申请改回待审。

写请求超时只说明页面尚未收到确定结果。页面显示结果待确认，按原幂等语义或有权查询恢复；不能换新键重复提交，不能用本地计时判定会话失效。冲突保留非敏感输入，按权限刷新权威结果，不暴露其他申请人信息。

保存成功但待同步时如实反馈。通知失败不撤销审核决定；隐藏本人展示不删除共享成果。会话失效清除私有展示及敏感草稿，重新登录后查询当前结果。

## 4 状态与参数

INITIAL/LOADING/RESULTS/EMPTY/ERROR/STALE、输入、展开和上传中属于页面状态；申请待审/通过/驳回属于业务状态。页面只映射展示，不以本地状态改变服务端终态。

成员9的300ms加载、10秒本地超时、30天年龄提示均为候选参数，不是后端性能保证、业务失败证明或快照失效依据。阈值和会话有效期待共同确认。

## 5 图表与交接

| 内容 | A组 | B组 |
| --- | --- | --- |
| 检索交互 | [成员4原图](../../contributions/member-04/analysis/diagrams/rendered/01-search-and-view-sequence.png) | [成员9图源](../../contributions/member-09/analysis/diagrams/search-interaction-sequence.puml) |
| 认领交互 | [成员4原图](../../contributions/member-04/analysis/diagrams/rendered/02-claim-sequence.png) | [成员9图源](../../contributions/member-09/analysis/diagrams/claim-interaction-sequence.puml) |
| 视图状态 | [成员4原图](../../contributions/member-04/analysis/diagrams/rendered/03-frontend-view-state.png) | [成员9图源](../../contributions/member-09/analysis/diagrams/frontend-load-state.puml) |

[成员8后端问题逐项答复](../../contributions/member-08/analysis/03-frontend-handoff.md)、[成员7数据发布和未知值答复](../../contributions/member-07/analysis/03-analysis-handoff.md)保留原问题编号。这些是书面意见，未伪造双方接受或人工签字。
