# 数据构件官方技术依据

核查日期：2026-11-11。只依据官方文档说明能力边界；文档版本不等于项目已批准部署版本，不复制长段原文。

| 来源 | 支撑内容 | 用法/限制 |
| --- | --- | --- |
| [PostgreSQL Partial Indexes](https://www.postgresql.org/docs/current/indexes-partial.html) | 部分谓词索引及满足谓词行的唯一性 | 用于当前待审、当前有效授权；不能跨表判定材料或管理员身份。 |
| [PostgreSQL Transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html) | 多步骤提交/回滚的原子事务语义 | 支撑决定、授权、审计和outbox同事务候选；不声称包中已执行数据库。 |
| [PostgreSQL SELECT](https://www.postgresql.org/docs/current/sql-select.html) | SKIP LOCKED适合队列式领取，不是通用一致查询 | 外发短事务领取并写租约，外部投递后以租约令牌条件确认。 |
| [PostgreSQL Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html) | 显式行锁、持锁到事务结束及锁竞争 | 采用统一门户→申请锁顺序，仍需实际并发验证。 |
| [Elastic Dynamic Mapping](https://www.elastic.co/docs/manage-data/data-store/mapping/dynamic-field-mapping) | strict遇未知字段拒绝映射 | 公开投影采用字段白名单；不是替代服务端授权。 |
| [Elastic Field Types](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/field-data-types) | text/keyword的分析与结构化用途 | 业务ID/分类使用keyword；公开title全文字段不直接等同原子串基线。 |
| [Elastic Keyword Family](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/keyword) | keyword、wildcard适用与限制 | wildcard子串策略是本项目候选推导，必须压测；不宣称官方推荐用于所有学术文本。 |
| [Elastic Text Fields](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/text) | analyzed文本及默认评分/聚合边界 | 不以默认评分替换已有完全相等优先与5/3/1命中规则。 |
| [Elastic Pagination](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/paginate-search-results) | 深分页窗口、稳定并列键、PIT/search_after | PIT固定数据而非未来权限；页码到游标需公共协议设计。 |

PostgreSQL与Elastic官方文档支持上述机制，本项目采用哪些产品、版本与参数仍待成员1/6及相关岗位共同批准。安全公开栅栏、具体表模型和缓存键属于本轮设计推导，不标成第三方产品提供的端到端保证。
