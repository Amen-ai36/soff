# 技术资料与适用边界

核查日期：2026-11-11。只引用官方技术资料；文档描述产品能力，本项目选型和保证仍需实现验证。具体部署版本未冻结，CSS的API兼容范围需再次核查。

| ID | 官方资料 | 本包用途 |
| --- | --- | --- |
| S01 | [AWS：Transactional outbox](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html) | 同事务写事件意图、重复及顺序边界；仅借用模式，不选用AWS部署 |
| S02 | [Elastic：Index API](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-index) | 外部版本写入及版本冲突处理 |
| S03 | [Elastic：Optimistic concurrency](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/optimistic-concurrency-control) | ES内部序列控制不等于DB聚合版本 |
| S04 | [Elastic：Paginate search results](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/paginate-search-results) | 深页窗口、search_after、PIT与排序稳定性 |
| S05 | [Elastic：Aliases](https://www.elastic.co/docs/manage-data/data-store/aliases) | 别名多动作及部分失败注意事项，不能外推跨库原子性 |
| S06 | [PostgreSQL：Explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html) | 候选数据库中的行锁、事务互斥依据 |
| S07 | [华为云：OBS权限控制](https://support.huaweicloud.com/intl/en-us/perms-cfg-obs/obs_40_0001.html) | 私有对象与授权边界 |
| S08 | [华为云：临时URL](https://support.huaweicloud.com/intl/en-us/perms-cfg-obs/obs_40_0009.html) | 临时授权能力及持有链接的访问风险 |

输入项目文档：main快照的AGENT/AGENTS/README、统一分析01/02/06及成员8原SPEC。统一分析已复核，当前公共候选语义和实施工作仍按差异表处理；本次不推翻10月27日复核事实。
