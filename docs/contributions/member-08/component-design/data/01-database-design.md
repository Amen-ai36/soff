# 数据库构件设计初稿

成员8/B组；2026-11-11；版本0.1，供第10周评审。输入为[成员8原接口约束](../../requirements/03-interface-constraints.md)、四份SPEC和[统一分析类模型](../../../../deliverables/03-analysis/01-core-business-class-model.md)。本轮采用PostgreSQL作为论证候选，不代表项目已选择产品或版本；物理字段也不自动成为公共接口字段。

## 1 职责分区与数据主权

| 分区 | 候选表 | 主责和边界 |
| --- | --- | --- |
| 认证 | app_account、app_role、account_role、app_session | 账号与学者分离；角色是资格；会话可撤销。服务只保存验证值/令牌摘要，禁止明文密码或令牌入库。 |
| 学术实体 | scholar、institution、scholar_institution、academic_field、achievement及参与/机构/领域关联、scholar_field | 规范ID不透明，姓名不唯一；四类成果由work_type判别，类型专属表后续按真实字段扩展。 |
| 来源追溯 | source_record、collection_task、processing_run、source_observation、update_record | 成员2/7决定任务/尝试/停止重试语义；这里提供存储衔接候选，不用认领三态覆盖任务状态。 |
| 门户与认领 | scholar_portal、portal_display、evidence_reference、claim_request、claim_evidence、review_decision、portal_grant | 申请、私有证明、有效决定和授权独立，公开展示不拥有全局成果。 |
| 治理与一致性 | audit_record、governance_request、outbox_event、idempotency_record、publication_generation、public_gate | 审计最小化；共享字段进入治理；业务写入与外发事件同事务；公开读依权威栅栏。 |

全部31表、197个字段的类型、可空性、定义及语义见[data-dictionary.csv](data-dictionary.csv)，与DDL由同一结构数据生成。此处只列关键设计，避免手抄字段造成偏差。ID使用varchar候选，不要求客户端提供UUID；年份未知是NULL，空数组表示已知无关联，0只表示已知数值零。时间使用带时区时间戳，API序列化规则另由公共契约确认。

成果参与关系以(work_id, scholar_id)表示同一规范参与者，role_description保存有依据的角色集合说明；一个人兼具多角色不因此计为多位作者。来源细分角色证据仍留在原始观测，不能为未知参与者编造学者。机构关系取成果发生时证据，不能把当前任职追溯套用到旧成果。论文、专利、项目、获奖的参与角色不全部称“论文作者”。

接口存储映射：Portal的biography对应scholar_portal.intro，interests保存授权内个人兴趣数组；个人兴趣不自动成为规范领域。Scholar.field_ids从同代scholar_field有来源分类导出。Work.doi对应achievement.doi，冲突DOI交治理，不直接覆盖既有来源事实。Governance的version对应governance_request.version。上述均为B组候选，不据此发布公共字段。

## 2 数据库能保证什么

| 不变量 | 候选约束 | 限制与补足 |
| --- | --- | --- |
| 同人同门户至多一个待审 | claim_request(applicant_id,portal_id)上WHERE status='PENDING'的唯一部分索引 | 创建仍需校验会话、目标占用、有效材料；索引冲突转可理解冲突。 |
| 同门户同时至多一有效授权 | portal_grant(portal_id)上WHERE active的唯一部分索引 | 并发竞争由数据库拒绝第二条；不能据此自动驳回另一申请。 |
| 一申请至多一次有效决定 | review_decision主键为claim_id | 待审到终态只能条件更新一次，终态不可改仍需服务事务/受控写权限。 |
| 审核不得自审 | 审核行冗余applicant_id并复合外键回申请；CHECK reviewer_id<>applicant_id | 管理员当前角色、职责范围和会话资格仍由服务复核。 |
| 材料确属申请人 | claim_evidence复合外键分别约束申请人和材料owner | 至少一项有效材料、存储对象可用性和证明充分性不能只靠外键。 |
| 展示门户和参与关系属同一学者 | portal_display冗余scholar_id，分别复合外键回门户/参与关系 | 隐藏展示不删除规范参与、全局成果和来源；默认展示可派生。 |
| 授权目标与申请相符 | grant(source_claim_id,account_id,portal_id)复合外键回申请 | 必须同时确认申请已通过；外键本身不证明APPROVED。 |

PostgreSQL的部分唯一索引可约束满足谓词的行，适合“当前有效/当前待审”而保留历史；谓词只涉及本表，不能用它检查另表的证明有效性或审核角色。[官方部分索引说明](https://www.postgresql.org/docs/current/indexes-partial.html)

数据库与字典共有197字段；租约及快照边界为本轮自检后补齐的设计。没有在本稿写触发器或业务存储过程。前序申请必须为本人同门户的REJECTED，分类树不得形成多节点环，公开成果须有有效来源，PENDING不得有有效授权，APPROVED必须有有效决定与对应授权；JSONB数组类型/元素白名单也需后续schema校验；当前JSONB类型不自动证明它必为合法兴趣或别名数组。这些跨行/跨表不变量需后续受控事务或经批准约束设计，不能宣称当前DDL已全部强制。

## 3 关键事务与锁定顺序

提交认领：验证当前会话→锁定目标门户并重检占用→核验本人有效材料及待审唯一→在同一事务保存PENDING、材料关系、幂等结果和审计。幂等键按(account_id, operation_code, request_key)隔离；同键不同参数摘要冲突，同键同参数重放仍要求当前读取资格。过期清理期限待批准，幂等表到期不削弱待审/有效授权唯一约束。

审核：服务统一按“门户→申请→材料引用”的顺序锁行，重检角色回避、PENDING和expected_version。通过时条件更新申请并写有效决定、授权、审计、通知outbox及幂等结果；驳回不授权。任一步失败整笔回滚，不能把其他事务已成功的终态写回PENDING。通过前证据失效时拒绝通过并保持原状态；管理员可另作有理由驳回。事务和行锁是候选机制，数据库外对象可用性还需独立策略。[事务原子性](https://www.postgresql.org/docs/current/tutorial-transactions.html)、[行锁规则](https://www.postgresql.org/docs/current/explicit-locking.html)

维护：每次写入复核当前门户授权和版本。个人说明/展示关联可在白名单内修改；共享题名、DOI、规范归属等创建governance_request。采集更新与人工修正冲突进入治理，不静默覆盖。业务变更与最小审计、outbox同事务，通知/索引失败不回滚已提交决定。outbox领取采用短事务FOR UPDATE SKIP LOCKED并写lease_owner/lease_until/lease_token，随后提交再对外投递；租约到期可重新领取，ack/重试更新必须条件匹配lease_token，旧工作者不能确认新租约。published_at只表示destination端逐项成功确认，不代表公开代次已发布。任何业务写入口不得绕过这些事务路径直接任意改表。

证明上传202仅表示已接收并进入校验，validation_state映射接口opaque processing_state；valid仅由经批准的校验通过状态派生，候选内部VALID时为true，排队/失败均为false。failure_reason只存脱敏失败分类。临时私有对象先绑定当前账号；对象已写但元数据/排队失败时记录可追踪补偿清理意图，不暴露给公开路径；校验未通过不得用于认领。清理周期与材料限制须批准，当前没有收取真实证明。

## 4 数据、发布与百万级规划

source_record表示单成果粒度当前映射；复合输入先由成员2/7拆为有来源依据的观测。processing_run是尝试，source_observation保存哈希/规则版本/原始对象引用，update_record连接规范成果前后版本。首次启动无gate行或未配置有效代次时失败关闭，不把缺行当READY。公开统计按work_id去重，不按来源行、参与关联或展示选择计数。真实输入质量、规则版本和停止恢复须由成员2/7补齐。

普通新增或公开字段更新可保留上一已发布快照并声明data_version。公开资格收缩必须在业务事务内推进public_gate.epoch并置BLOCKED；它不是认领业务状态。新代次绑定source_snapshot_ref与boundary_watermark，来自DB一致性快照或有边界的不可变导出，不能逐行读取不同时间的latest冒称同一版本；再建立完整合法集合，验证ID集合/数量、错误数及统计口径后，在相同epoch条件下切换active_generation_id并READY。DDL只定义记录结构，无法代替完整集合验证和栅栏读协议；代次VALIDATED不自动证明它已激活。READY还必须满足active代次status=VALIDATED且policy_epoch=gate.epoch；这些跨行关系由受控事务检查，DDL中的READY非空检查不能代替它。

百万级规划先记录：规范成果数N、参与关系平均数a、机构/领域关联数i/f、来源平均数s，则主要行规模约为N(1+a+i+f+s)，另计观测历史、审计和索引副本。单字段宽度、长摘要分布、索引膨胀和副本数须用样本实测后测算，不由N推导虚假的容量或P95。首轮不先行分库分片；先验证索引选择性、批次大小、事务时长和恢复开销，技术升级由共同评审决定。

DDL包含15个显式索引，另有PK/UNIQUE隐式支撑：待审队列、申请人历史、学者成果、成果类型年份、机构/领域过滤、outbox待投递、更新追溯、来源观察、审计目标及会话检索。外键列索引按实际查询补齐；不能把“有索引”当成性能已达标。分区、索引在线建立、归档和清理必须有实测与独立迁移/回滚方案。

## 5 待决与验证入口

成员1/6与3/8需确认数据库产品/部署版本、门户与授权生命周期、公开栅栏可用性权衡、证明标准/保留期、会话策略和幂等保留期；成员2/7确认数据侧表、任务状态和观测粒度。批准后才将候选schema拆成唯一编号迁移，检查外键孤儿、既有重复待审/授权和回填来源，验证后上线；回滚先停新写、保留备份与事件，不能简单删除历史表。

需要实际数据库上的并发/回滚/权限/异常测试：同门户竞争、同申请竞争、他人材料、自审、材料失效、旧版本、事务中故障、重复事件、乱序事件、出库后崩溃、私有化期间total/统计及跨页恢复。当前仅生成设计、字典与DDL文本，尚未建库、执行迁移或完成这些运行验证。
