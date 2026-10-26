# 图表目录

以下7张图均由本轮PlantUML源在本地实际渲染，提供PUML、SVG、PNG。类/属性/消息表达分析职责，不冻结公共实体或接口。

- M8-AN-CLS-01 科研实体与展示关系：[PUML](core-domain.puml) · [SVG](core-domain.svg) · [PNG](core-domain.png)。类与方法表示分析职责；类型判别不决定继承、数据库表或字段。学者、机构、领域按规范标识区分，展示选择不拥有全局成果。

- M8-AN-CLS-02 门户认领、决定与授权：[PUML](claim-domain.puml) · [SVG](claim-domain.svg) · [PNG](claim-domain.png)。账号不是学者。PENDING 不产生维护权。APPROVED/REJECTED 为单个申请终态，驳回后补充材料另建新申请。

- M8-AN-SEQ-01 检索请求处理：[PUML](search-sequence.puml) · [SVG](search-sequence.svg) · [PNG](search-sequence.png)。关键词规范化、加权分与完全相等优先级沿用已有 SPEC；不在分析阶段暗换 BM25。旧响应覆盖保护由页面负责。

- M8-AN-SEQ-02 提交认领与结果恢复：[PUML](claim-submit-sequence.puml) · [SVG](claim-submit-sequence.svg) · [PNG](claim-submit-sequence.png)。幂等重放仍核验当前身份和对象读取资格；无效输入不创建申请，私有材料不进入公开门户。

- M8-AN-SEQ-03 管理员认领审核：[PUML](claim-review-sequence.puml) · [SVG](claim-review-sequence.svg) · [PNG](claim-review-sequence.png)。图中原子边界是业务要求；事务、条件写或等价机制待构件设计。提交后通知的可靠保存及恢复另交架构设计。

- M8-AN-SEQ-04 授权内维护与共享字段纠错：[PUML](maintenance-sequence.puml) · [SVG](maintenance-sequence.svg) · [PNG](maintenance-sequence.png)。维护和统计图补齐成员3现有稿中的衔接说明，为分析供稿，不定义新API。

- M8-AN-SEQ-05 同版本统计与口径解释：[PUML](statistics-sequence.puml) · [SVG](statistics-sequence.svg) · [PNG](statistics-sequence.png)。统计与检索采用相同公开范围和版本语义；未知值不伪造为零，空数据成功和依赖失败分别反馈。

本地图不等于CodeArts原生模型；需要平台工程时由实际绘图人按课程要求建立。
