# 本轮AI自检修正记录

2026-11-11；这是真实设计试验发现与AI修正，不是“AI生成→人工修正”案例。人工尚未提供审阅意见。

首次执行23个SQLite试验方法，21个通过、2个失败，原始失败摘要保存于 [首次失败记录](validation-initial-failures.json)。

| 问题 | 复现 | 修正与复检 |
| --- | --- | --- |
| 冻结成果行仍可修改已发布参与关系，历史合作/统计可能漂移 | `test_published_relationships_immutable`删除已发布参与关系没有报错 | 对参与、历史机构、领域关系的增删改增加冻结检查；扩展新revision仍可构建及核验后冻结的回归 |
| 已发布dataset可退回BUILDING，绕过成员冻结保护 | `test_revision_and_snapshot_immutability`可把PUBLISHED改为BUILDING | 初始状态必须BUILDING；只允许BUILDING→VERIFIED→PUBLISHED，固定版本、基线和策略元数据；回退通过权威指针选择旧合法版本，不能解冻快照 |

保留原失败断言并加强覆盖，没有删除测试或降低断言。最终结果见 [验证报告](validation-report.md)。触发器属于SQLite设计模型，生产实现仍需引擎迁移和真实并发验证。

第二轮边界审阅新增非空ID复现试验，发现SQLite的非整数PRIMARY KEY未显式声明NOT NULL时仍可接受null，`CHECK(length(id)>0)`也不能拒绝null。已在所有文本主键补充NOT NULL，保留null/空字符串断言；失败摘要见 [ID边界失败记录](validation-null-id-failure.json)。这同样是AI自检发现，没有写成人工修正。
