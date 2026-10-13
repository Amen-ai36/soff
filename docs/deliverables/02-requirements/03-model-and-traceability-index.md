# 模型、原型与需求追踪索引

2026-10-13。下列原图与源材料统一收件，不表示各图均已通过UML评审。最终提交一套模型，由对应搭档消除差异。

| 图/材料 | 方案A | 方案B | 共同行动 |
| --- | --- | --- | --- |
| 系统用例图 | [成员1用户提交PNG](../../contributions/member-01/requirements/diagrams/system-use-case-member01.png)、[用例说明](../../contributions/member-01/requirements/04-use-cases.md) | [成员6CodeArts导出PNG](../../contributions/member-06/showcase-20261014/models/codearts/system-use-case-member06.png)、[平台入口与说明](../../contributions/member-06/showcase-20261014/models/codearts/README.md)、[用例说明](../../contributions/member-06/showcase-20261014/02-use-case-model.md) | 成员1、6选定统一角色、边界与粒度 |
| 采集任务状态图 | [成员2PNG](../../contributions/member-02/requirements/diagrams/collection-task-state-codearts.png)、[XML源文件](../../contributions/member-02/requirements/diagrams/collection-task-state-codearts.xml)、[状态说明](../../contributions/member-02/requirements/03-collection-task-state-machine.md) | [成员7用户SVG](../../contributions/member-07/requirements/diagrams/collection-state-codearts.svg)、[语义源稿](../../contributions/member-07/requirements/diagrams/collection-state.puml)、[说明](../../contributions/member-07/requirements/diagrams/README.md) | 成员2、7确认停止/重试等语义，1、6确认公共状态 |
| 认领活动图 | [成员3PNG](../../contributions/member-03/requirements/diagrams/claim-activity.png)、[来源说明](../../contributions/member-03/requirements/diagrams/README.md) | [成员8SVG](../../contributions/member-08/requirements/diagrams/claim-activity.svg)、[PUML](../../contributions/member-08/requirements/diagrams/claim-activity.puml) | 成员3、8核对审核回避、并发及授权 |
| 认领状态图 | [成员3PNG](../../contributions/member-03/requirements/diagrams/claim-state.png)、[PUML](../../contributions/member-03/requirements/diagrams/claim-state.puml) | [成员8SVG](../../contributions/member-08/requirements/diagrams/claim-state.svg)、[PUML](../../contributions/member-08/requirements/diagrams/claim-state.puml) | 不将自动生成参考图宣称CodeArts平台工程 |
| 页面原型 | [成员4线框说明](../../contributions/member-04/prototypes/low-fidelity-wireframes.md)、[HTML源](../../contributions/member-04/prototypes/source/wireframes.html) | [成员9页面需求](../../contributions/member-09/research/04-page-requirements.md)及requirements交互草图 | 成员4、9统一核心交互，辅助界面可不同 |

成员1PNG按用户说明已作为原始图文件收到，不能再写成“成员1未交图”。PNG与可编辑平台工程是不同格式，如教师明确要求可编辑模型，按通知另核验；不自行更改用户的收件判断。

此前[成员1、6参考图](diagrams/README.md)保留供复画对照，其中同步时间与欠交状态描述仅反映当时状态；本索引是最新收件口径。两份候选系统图不表示须上交两张正式图。成员5模型为整理附件，不重复算一组独立新图。

## 需求追踪资料

| 责任 | 原始追踪入口 | 使用方式 |
| --- | --- | --- |
| 成员1、6 | SRS总体需求及[成员6映射](../../contributions/member-06/showcase-20261014/03-traceability-review.md) | 总体功能到原编号映射，冲突交共同确认 |
| 成员2、7 | 数据模块规范及[成员7验收追踪](../../contributions/member-07/requirements/03-acceptance-and-traceability.md) | 数据需求→规则→样例→预期 |
| 成员3、8 | [成员3CSV](../../contributions/member-03/requirements/traceability.csv)、[成员8CSV](../../contributions/member-08/requirements/traceability.csv) | 业务需求→用例→SPEC→验收 |
| 成员4、9 | [成员4CSV](../../contributions/member-04/requirements/traceability.csv)、[成员9交接](../../contributions/member-09/requirements/05-traceability-and-handoff.md) | 页面、问卷假设与UI验收 |
| 成员5、10 | [成员5需求表](../../contributions/member-05/requirements/需求追踪表.csv)、[成员10核查表](../../contributions/member-10/requirements/需求追踪与验收核查表.csv) | 收件与覆盖核查，保留各自原编号 |

追踪采用“成员命名空间+原始ID”，不因M1-FR-08、R08或其他编号相似就自动认定同义。统一需求到模块的关系见SRS第4节；冻结前逐条检查模型、SPEC和验收是否一致。
