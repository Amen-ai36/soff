# 架构与构件设计 · 实际检验结果

2026-11-11；状态：**PASS**。Python 3.13.2，SQLite 3.45.3。

命令：`python docs/contributions/member-03/component-design/validate.py`。只使用标准库和临时内存数据库。

- 静态检查：34个本地引用、16条需求、24项AC定义映射、4张图源、18个候选API操作、175个内部引用、12项固定Git来源。
- SQLite：25个试验方法，0项失败、0项错误；覆盖约束、事务六处故障回滚、顺序争用、幂等、不可变快照与发布指针/水位。
- OpenAPI仅执行自定义结构/引用/敏感字段/安全与版本规则检查，未使用正式验证器。
- Mermaid仅检查源文件入口，未执行渲染器或CodeArts导入。

详细结果与失败堆栈见 [JSON结果](validation-results.json)，试验代码见 [validate.py](validate.py)。

未执行：真实HTTP接口、生产数据库多连接并发与锁、ES映射/召回/排序、百万数据及性能、真实会话/材料核验、人工交叉复核和联合批准、CodeArts原生导出。追踪覆盖不是AC业务验收通过，SQLite试验不是系统测试或生产迁移。
