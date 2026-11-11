# ES字段、排序、缓存与统计构件

依据 SEARCH/STATS 与 SPEC-M3-DESIGN-001；[成果映射](models/work-index.candidate.json)和[学者映射](models/scholar-index.candidate.json)为严格白名单提案。未选ES版本、分析器插件或客户端，不能据本文件声称映射已在集群创建。

## 1 投影字段

成果文档ID对应规范work_id，在不可变dataset物理目标内唯一。字段包含work_id、revision、dataset_version、policy_version、projection_hash、四类type、公开title/比较键、获准keywords与abstract、year及year_unknown、organization_ids、field_ids、scholar_ids、来源公开引用、is_simulated、updated_at。`dynamic: strict` 防止未声明私有字段漏入；nested来源只包含公开source_id、公开链接/标签，不放原始载荷或个人材料引用。

学者投影单独存 scholar_id、姓名、别名、比较键、机构/领域线索与版本；姓名不唯一。由于机构语义不同，学者当前机构与成果历史机构不得混用。缺少来源显示未知，不编造链接。year未知为null并显式标记unknown；映射自身不保证业务枚举与标记一致，投影构建器另行校验。

## 2 排序与召回设计

`keyword`比较键只表达规范化结果，不宣称默认normalizer具备Python casefold/NFKC完全等价能力。规范化由版本化投影构建器生成并用共同夹具核验；非空查询精确匹配奖励高于5/3/1得分。每token每字段一次命中，不重复堆分，未知年份末尾，ID码点序。

底层原生全文结果仅能作待核验召回，不能直接替代SPEC的连续子串匹配。先有正确性参考执行器，再比较全量命中ID、分数及顺序，召回不全必须阻断；不允许限制候选前K后算total。百万性能若不满足，提交算法/契约变更评审或完善可证明无漏召回索引，不私改验收。

## 3 缓存与聚合

首轮进程内有界缓存，键包含规范化查询指纹、数据集/策略/排序规则版本与页信息。缓存响应前复查当前权威版本，策略故障则拒绝受影响缓存命中；TTL只控制资源占用。私有路径与会话响应no-store。无新的缓存服务依赖。

统计以完整合法规范成果集合计算；类型互斥，机构/领域多值分别计1，未知不参加实体排名。合作图按规范作者集合枚举无序对；本人展示隐藏不改统计。近似基数与截断桶不满足精确口径；异步统计结果记录输入指纹、版本、分母、未知、算法版本，取结果时复查当前策略。

## 4 未来实测用例

执行SEARCH夹具顺序与24项AC关联检查；增加全角GRAPH、中文子串、重复token、同分ID、未知年份、受限摘要撤权、同条数异ID、旧事件覆盖和双版本翻页。索引重建时核对全部ID及投影字段哈希；百万规模记录重建空间与耗时。此列表是实现验收输入，不是本轮ES测试结果。
