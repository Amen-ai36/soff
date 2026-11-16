# ES索引与缓存设计初稿

成员8/B组候选；2026-11-11。输入是[SPEC-M8-SEARCH](../../requirements/specs/SPEC-M8-SEARCH.md)、[统计SPEC](../../requirements/specs/SPEC-M8-STATS.md)及已复核统一分析。索引JSON可供评审，尚未提交到ES，也未批准产品部署版本或新的公共分页协议。

## 1 字段与投影边界

[elasticsearch-mapping.json](elasticsearch-mapping.json)使用dynamic=strict，未知字段应拒绝，避免证明、会话或意外来源字段被自动收进公开索引。[官方dynamic说明](https://www.elastic.co/docs/manage-data/data-store/mapping/dynamic-field-mapping)

| 字段组 | 候选映射 | 含义 |
| --- | --- | --- |
| work_id、work_type、scholar_ids、institution_ids、field_ids、source_refs、doi | keyword | 规范ID与分类过滤、排序/聚合；姓名不作唯一标识。 |
| title | text，内置standard分析器 | 可选探索字段，不能直接当既有中文连续子串及排序契约的实现。 |
| title_norm、keywords_norm、abstract_norm | wildcard | 应用层先做NFKC、空白规范化和拉丁大小写统一；保存完整规范化值/数组，作为原基线子串候选匹配字段。 |
| title_exact | keyword | 仅保存规范化后长度≤200的题名；B候选增加q/name归一化后再次校验≤200（原始输入也受限），不把原始maxLength自动当作归一化后长度；在此条件下合法q最长200，长题名不可能全文相等，不因截断伪造精确命中。 |
| year、aggregate_version、policy_epoch | integer / long | 年份未知不填0；版本防旧事件覆盖。 |
| generation_id、updated_at、simulated | keyword / date / boolean | 返回/审计版本依据，来源与模拟标记可解释。 |

keyword适合结构化过滤与聚合，text会分析文本；wildcard可做字符模式匹配，但更适合特定高基数字段，本稿为保留课程子串语义提出候选，不声称它必然更省资源。长摘要的存储、索引成本需实测；不使用尚未安装的中文插件。[字段类型](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/field-data-types)、[keyword/wildcard](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/keyword)、[text](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/text)

## 2 原排序语义怎样落地

应用先去重查询token；不同token之间AND，每token可在题名、关键词、摘要任一字段命中。对每token/字段构造一次常量权重条件，分别贡献5/3/1；同token重复出现或同字段数组重复不重复计分。用户输入的*、?、反斜线必须按字面转义后再构造子串模式，不能直接透传query_string或脚本。

最终排序元组为：(题名与完整q相等标志降序，加权命中分降序，年份降序且NULL最后，work_id码点序升序)。全文相等标志不能用一个随意的大boost代替；候选实现可显式计算排序键或经审核的受限脚本。空q不奖励相等，年份排序不使用相关性。学者检索另外使用姓名/别名及机构领域过滤，不把作者姓名混到成果题名搜索，也不对学者提供年份排序。映射附件只覆盖公开成果投影，学者field_ids来自有证据的scholar_field关系，biography对应门户intro，interests只作个人兴趣展示。本周学者查询候选从同代不可变DB只读导出查询，按generation_id隔离，同样受gate校验，禁止直接以会变化的latest学者表混入已发布快照；字典不额外假装已实现该导出。后续如另建学者ES索引，须和成果具体索引绑定为一组发布代次后共同激活。

ES默认评分和standard分词不会自动满足这套规则。BM25、中文分词和相似词如被采用，必须另作算法变更比较、更新SPEC及夹具后共同批准。原样例q=graph应仍为W01→W02→W03，即使W02加权8高于W01的5，W01完整相等仍排第一。

## 3 合法全集、版本和分页

公开索引代次应只包含该代次合法规范成果，按work_id唯一；total必须精确统计完整合法集合，统计聚合用同一generation/data_version。仅删除当前页私有项，或默认总数上界都不满足原需求。ES若发生超时、失败分片或无法证明当前策略有效，不把部分结果当完整成功。

每次检索、详情、门户、统计和缓存命中前读取DB public_gate；BLOCKED、epoch不符或无法读取时失败关闭。公开资格收缩在权威DB同事务置BLOCKED/epoch++，异步修复后验证完整集合，条件更新READY与active_generation。响应最终物化与授权决策期间持有gate共享锁，与收缩事务互斥，再次核验epoch/状态；不在全量建索引期间持锁。旧代次、旧PIT和缓存都不能绕过新权限。本方案代价是收缩期间全局公开查询不可用，后续可细化分区栅栏，但不能未经设计回退“只过滤一页”。协议的读/写互斥和响应线性化边界由架构供稿统一说明，不能把一次读版本当成数据库外永久授权。

PIT保存ES数据视图，不保存未来公开资格。每次翻页仍检验gate。百万规模不等于把page/page_size直接映射为任意深度from/size；ES默认深翻页存在10,000结果窗口限制，候选内部采用PIT+search_after，并用work_id稳定打破并列。若对外仍保留页码契约，需要受控会话记录游标/按序回放，或针对深页给明确已批准限制；不得悄悄把page改成cursor。PIT失效或epoch变化应返回可理解失效，保留条件从第一页重查。[官方分页/PIT说明](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/paginate-search-results)

## 4 外发、重建与缓存

业务权威变更与outbox_event同事务；发布器以至少一次投递，逐项检查目标结果后记published_at。重试用稳定event_id，按aggregate_id/aggregate_version拒绝旧覆盖；逐事件租约本身不保证同一聚合的投递顺序，后续须按聚合序列化，或以完整投影及条件版本写拒绝旧事件。已被高版本覆盖的旧事件经核验后确认/记录为已替代，不无限重试旧写；批量请求整体返回成功不代表每个item成功。outbox只更新未发布的构建代或准备下一代，绝不原地修改已发布不可变具体索引。租约领取与ack按lease_token防旧工作者误确认；published_at只代表目标确认，公开发布另看generation/gate。重建读取绑定source_snapshot_ref/boundary_watermark的一致性导出并接续水位后，对照完整公开ID集合、计数和统计口径，再在未变化epoch上发布新代次。alias只方便路由，不是跨数据库与ES的原子提交保证。

| 缓存对象 | 候选键 | 失效及安全规则 |
| --- | --- | --- |
| 公开检索/统计 | generation_id、policy_epoch、规范条件、排序、分页/游标摘要、算法版本 | 命中前仍核验当前gate；epoch变化立即拒绝旧值。TTL只作容量回收，不承担撤下权限保证。 |
| 分类树 | 分类体系版本、展示语言 | 已批准分类变更后换版本；不得从来源任意增加公共领域。 |
| 机构排行榜 | 公开generation、过滤条件、统计规则版本 | 同机构内成果去重；跨机构可交叉；分母及unknown随结果一起缓存。 |
| 门户展示 | 门户版本、generation、policy_epoch | 个人隐藏更新后换门户版本；公开资格收缩仍服从gate。 |
| 私有材料/会话 | 不进入公共结果缓存 | 需要独立私有访问与撤销规则；禁止证明正文混入公共缓存。 |

候选缓存先用进程内有界缓存满足正确性，是否引入Redis由组长/架构评审决定；TTL、容量、命中率目标、集群节点和副本数量都待样本与压测，不能填虚构实测数字。缓存失效依赖不可用时明确降级到权威可核验查询，权威不可读则失败关闭。

第10周验证入口：mapping JSON语法/字段白名单、基线夹具期望、未知年份/空分母、分页并列、长题名、通配符字面、并发私有化与旧PIT、失败分片、批量item失败及缓存跨epoch。当前仅有设计附件；ES建索引、百万条导入、性能和负向运行验证均待后续实现。
