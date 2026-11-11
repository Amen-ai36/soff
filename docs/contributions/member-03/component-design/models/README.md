# 机器可读设计资产

本目录全部为成员三内部候选，不是公共迁移或契约发布目录。

- `001_candidate_schema.sql` / `001_candidate_down.sql`：SQLite约束与事务试验模型，只在临时库运行。
- `openapi.candidate.json`：OpenAPI 3.0.3草案；未部署HTTP端点，未经正式验证器与公共契约测试。
- `work-index.candidate.json` / `scholar-index.candidate.json`：严格公开字段映射；未连接ES验证，未承诺默认分词和SPEC排序等价。

E-R关系的可编辑源在上一级diagrams目录；审阅时同时核对说明文档、SQL和图源。生产引擎选择后需正式迁移评审及真实并发试验。
