# REST API与异步端口候选

依据 AUTH/SEARCH/CLAIM/STATS、03-interface-constraints 与 SPEC-M3-DESIGN-001。[OpenAPI JSON](models/openapi.candidate.json)采用3.0.3，`x-status: proposed`；只在成员三目录存放。路径、Cookie名、字段及HTTP映射均待成员1/6与3/8共同确认，不能被前端作为已发布契约。

## 1 端口目录

| 候选端口 | 方法 | 输入/输出与边界 |
| --- | --- | --- |
| /candidate/v1/sessions | POST/DELETE | 凭据建立会话、退出撤销；不回显密码；私有响应no-store |
| /candidate/v1/works、/scholars | GET | 条件、排序、分页、版本；成果/学者分别返回，总数为成功合法全集计数 |
| /candidate/v1/works/{work_id}、/portals/{portal_id} | GET | 当前可公开详情/门户；来源、版本、四类栏目；无权/不存在中性404 |
| /candidate/v1/portals/{portal_id}/works | GET | 按四类过滤门户成果、稳定分页；应用该门户展示选择，不改变公共成果与公共统计 |
| /candidate/v1/claims | POST/GET | 本人材料引用、门户、说明；幂等创建；GET只查本人且可按幂等键恢复超时结果 |
| /candidate/v1/claims/{claim_id} | GET | 本人或职责内审核者；其他主体中性404 |
| /candidate/v1/claims/{claim_id}/decision | POST | 决定/理由＋预期版本＋幂等键；非本人管理员；冲突409 |
| /candidate/v1/admin/claims | GET | 职责内审核列表及受控材料ID；管理员资格不自动解除自审回避，禁止公开缓存 |
| /candidate/v1/portals/{portal_id}/profile | PATCH | 当前授权、白名单简介/兴趣、预期版本＋幂等；返回已保存版本及同步状态 |
| /candidate/v1/portals/{portal_id}/display-choices/{work_id} | PATCH | 当前门户授权、hidden与预期门户版本；服务端定位同学者参与关联，不删除共享成果 |
| /candidate/v1/governance-requests | POST | 授权用户提交公共纠错引用与说明，不能直接覆盖成果 |
| /candidate/v1/statistics | GET | 同版本精确分布/排名/关系/热点、分母/未知/规则版本 |
| /candidate/v1/analysis-jobs | POST | 大统计任务持久受理，202仅代表受理；当前主体的幂等键复用结果 |
| /candidate/v1/analysis-jobs/{job_id} | GET | 本人或职责内管理员查询进度/结果；取结果复核公开策略；不能据任务完成绕过撤权 |

所有创建/维护/审核响应超时可能已提交，按幂等查询或同键同参数重放；同键不同参数冲突。请求中的身份、角色、owner字段按白名单拒绝，主体只来自当前会话。表单里的申请ID不是授权证明。

## 2 错误与版本

400字段不合法，401会话无效，403操作无权，404对象不可访问，409版本/占用/幂等冲突，429过密，503依赖/同步不可用。错误正文仅含候选category、message、可选字段错误及request_id，不含堆栈、凭据或材料正文；这些是语义类别，未分配正式机器错误码。

默认page=1、page_size=20，上限100；年份1000～9999，范围不得倒置。多值用重复query参数；空数组代表不限定，未知领域不伪造成ID。成果允许relevance/year_asc/year_desc，学者仅relevance。写版本使用请求体 `expected_version`；仅审核和维护要求，初次申请没有前置资源版本。同一响应返回数据集、策略、规则版本，旧快照失效返回409。

OpenAPI表达基本类型与状态；起止年份关系、同键参数哈希、对象授权、材料有效性、事务以及字段许可不能靠文档自动保证，服务实现必须补校验。静态脚本仅做结构/引用/规则核查，没有冒充正式OpenAPI验证器或HTTP契约测试。

## 3 内部异步协议

| 命令/事件 | 必需语义 | 幂等与失败 |
| --- | --- | --- |
| AppendNormalizedBatch（与2/7协作） | task_ref、epoch、batch_key、预期检查点、规范候选/来源/处置、规则版本 | 批次事务校验租约代次与检查点；重复batch返回原回执，异载荷冲突 |
| ProjectRevision | event_id、target_dataset、aggregate_id、revision、projection_hash、action | 至少一次；同版本同哈希重放；旧版本不覆盖；同版本异哈希隔离 |
| PreparePublication | base_dataset、target_dataset、policy_version、manifest_ref | 构建不可变目标，记录完整集合/字段核验，失败不推进水位 |
| ConfirmPublication | expected_pointer_epoch、task_epoch、停止状态、policy_version、核验引用及来源水位 | 权威条件事务，指针与水位共同变更，竞争失败重建基线 |
| ComputeStatistics | 主体、输入指纹、数据集/策略/算法版本、分析类别 | 持久账本受理；任务重试不重复结果，查询需当前权限；不新增采集公共状态 |

outbox只传ID、版本和受控引用，消费端按最小权限取获准字段；不能把私有证明打包进消息。租约、退避、死信/隔离、重试预算由2/7、5/10共同确认。analysis-jobs的QUEUED/RUNNING/SUCCEEDED/FAILED只是本包内部统计任务候选，不替换采集任务状态机；响应不暴露原始异常。

证明上传/下载涉及尚未批准的材料类型、大小、存储和保留规则；采集控制沿用2/7任务SPEC，公共HTTP契约需对应岗位联合细化。本包已给出审核列表和展示维护候选，不能据此声称全部API可运行。
