# 方案A构件组合与替换点

## 组合方式

方案A沿用架构阶段的模块化核心加独立Worker。在线API负责认证、认领、门户、检索和统计；Worker负责来源读取、清洗、去重、消歧、候选保存及检索投影。权威事务存储保存业务事实，搜索存储保存可重建公开投影。

```text
Web/Admin
  -> Application Ports
     -> Auth / Claim-Portal / Query-Statistics / Task-Governance
        -> Authoritative Store
Task-Governance -> Durable Work Queue or Task Table -> ETL Worker
ETL Worker -> Source Adapter -> Normalize/Deduplicate -> Authoritative Store
Authoritative Store -> Projection Builder -> Search Index
```

## 可替换点

| 替换点 | A组候选 | 替换约束 |
| --- | --- | --- |
| 任务调度 | 持久化任务表加Worker | task、attempt、checkpoint和幂等键语义不变 |
| 清洗消歧 | 规则链与候选评分 | 强键冲突、低置信隔离和治理入口不变 |
| 检索投影 | 版本化索引与发布水位 | 公开ID集合、排序分页和total口径不变 |
| API实现 | 模块化应用服务 | 公共请求响应、错误和权限不变 |
| UI实现 | 管理端与门户页面 | 页面状态不得改写业务终态 |

只读影子运行用于比较A/B结果；切换期间保持单一权威写入方。迁移顺序为适配器、只读查询、投影、任务执行，最后才切换写请求。每次切换都保留回切版本和对账结果。

## 重点设计检查

数据库与搜索索引不同步时，Query模块必须依据公开策略处理受影响结果，不能把索引缺失假装成无结果。认领决定与门户授权必须先在权威存储完成，通知属于后续可重试工作。来源撤下或隐私变化后，公开查询、total和统计均需采用当前合法集合。
