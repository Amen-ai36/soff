# 来源及收件复核

本轮日期2026-11-09，b已快进到ca84369；origin/main为982ddca。统一分析于2026-10-27已经用户确认复核完成，不再将旧个人稿的“未收到/待复核”当作全队当前状态。分析复核完成不等于架构决策或运行验收完成。

## 公开资料

S1 [Microsoft N-tier](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/n-tier)：逻辑职责与部署层次区别。

S2 [Microsoft Microservices](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/microservices)：独立业务边界和运维代价。

S3 [Microsoft Pipes and Filters](https://learn.microsoft.com/en-us/azure/architecture/patterns/pipes-and-filters)：ETL阶段拆分及输入输出契约。

S4 [Transactional Outbox](https://microservices.io/patterns/data/transactional-outbox.html)：同事务保存事件、独立投递及重复消费风险。

S5 [华为云CSS产品说明](https://support.huaweicloud.com/intl/zh-cn/productdesc-css/css_04_0001.html)：托管Elasticsearch/OpenSearch能力。以上2026-11-09查阅；不借产品说明推断本项目配置已实测。

## 仓库固定来源

- [统一分析范围](https://github.com/Amen-ai36/soff/blob/982ddca/docs/deliverables/03-analysis/01-core-business-class-model.md)：百万目标、统一对象边界。
- [分析差异与复核](https://github.com/Amen-ai36/soff/blob/982ddca/docs/deliverables/03-analysis/06-review-and-conflicts.md)：旧规模、任务状态、有效决定与审计、完整合法集合。
- [成员2架构供稿](https://github.com/Amen-ai36/soff/blob/3d907270af22d524467c3b2aba75b24b178b213b/docs/contributions/member-02/architecture/01-data-pipeline-architecture.md)：实际来源位于独立远程分支，固定SHA详见source-manifest.json。
- [成员7分析](../../member-07/analysis/03-analysis-handoff.md)：候选发布、双进度、停止/重试差异。
- [成员8核心模型](../../member-08/analysis/01-core-class-model.md)与[复核](../../member-08/analysis/04-review-and-comparison.md)：有效决定与尝试审计分离、公开范围。
- [成员6对象边界](../analysis/01-business-object-boundaries.md)：整体模型来源，审核记录歧义按最新统一分析澄清。

本轮不修改旧分析或公共SRS。队员架构缺稿与既有分析已完成是不同状态，不能混写。
