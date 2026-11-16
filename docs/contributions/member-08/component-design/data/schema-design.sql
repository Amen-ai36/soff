-- DRAFT M8 DATA DESIGN, 2026-11-11. PostgreSQL candidate only.
-- Not an approved migration. No database execution was performed.
-- This offline definition deliberately ends with ROLLBACK; deployment needs approved migrations.
BEGIN;

-- 登录主体与账号有效性
CREATE TABLE app_account (
  account_id varchar(64) NOT NULL PRIMARY KEY, -- 服务端生成的不透明账号ID
  login_name varchar(200) NOT NULL UNIQUE, -- 规范化登录名
  password_hash text NOT NULL, -- 经批准密码算法的验证值，不是明文
  enabled boolean NOT NULL DEFAULT true, -- 账号当前是否允许认证
  auth_version bigint NOT NULL DEFAULT 1 CHECK (auth_version > 0), -- 会话撤销/权限资格校验版本
  created_at timestamptz NOT NULL -- 创建时间
);

-- 平台角色字典
CREATE TABLE app_role (
  role_code varchar(64) NOT NULL PRIMARY KEY, -- 平台角色代码，初始值待确认
  description text NOT NULL -- 角色职责说明
);

-- 账号角色授予
CREATE TABLE account_role (
  account_id varchar(64) NOT NULL REFERENCES app_account(account_id), -- 被授予账号
  role_code varchar(64) NOT NULL REFERENCES app_role(role_code), -- 角色
  granted_at timestamptz NOT NULL, -- 授予时间
  PRIMARY KEY (account_id, role_code)
);

-- 服务端可撤销会话
CREATE TABLE app_session (
  session_id varchar(64) NOT NULL PRIMARY KEY, -- 会话内部ID，非浏览器凭据
  account_id varchar(64) NOT NULL REFERENCES app_account(account_id), -- 所属账号
  token_digest text NOT NULL UNIQUE, -- 高熵会话令牌的摘要，不存原令牌
  auth_version bigint NOT NULL, -- 创建时账号校验版本
  expires_at timestamptz NOT NULL, -- 绝对失效时间
  revoked_at timestamptz, -- 撤销时间；空表示未显式撤销
  created_at timestamptz NOT NULL -- 建立时间
);

-- 规范学者身份
CREATE TABLE scholar (
  scholar_id varchar(64) NOT NULL PRIMARY KEY, -- 学者ID，与账号ID分离
  display_name text NOT NULL, -- 公开姓名，不唯一
  aliases jsonb NOT NULL DEFAULT '[]'::jsonb, -- 公开别名数组
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0) -- 权威行版本
);

-- 规范机构
CREATE TABLE institution (
  institution_id varchar(64) NOT NULL PRIMARY KEY, -- 机构ID
  display_name text NOT NULL, -- 机构公开名称，不以名称判唯一
  aliases jsonb NOT NULL DEFAULT '[]'::jsonb -- 来源支持的别名数组
);

-- 带时间依据的任职关联
CREATE TABLE scholar_institution (
  affiliation_id varchar(64) NOT NULL PRIMARY KEY, -- 任职关系ID
  scholar_id varchar(64) NOT NULL REFERENCES scholar(scholar_id), -- 学者
  institution_id varchar(64) NOT NULL REFERENCES institution(institution_id), -- 机构
  valid_from date, -- 已知开始日期；未知保持NULL
  valid_to date, -- 已知结束日期
  evidence_ref text NOT NULL, -- 公开来源依据引用
  CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);

-- 规范领域分类
CREATE TABLE academic_field (
  field_id varchar(64) NOT NULL PRIMARY KEY, -- 领域ID
  scheme_code text NOT NULL, -- 分类体系标识
  display_name text NOT NULL, -- 领域名称
  parent_field_id varchar(64) REFERENCES academic_field(field_id), -- 分类父节点；根为空
  CHECK (parent_field_id IS NULL OR parent_field_id <> field_id)
);

-- 有来源依据的学者规范领域分类
CREATE TABLE scholar_field (
  scholar_id varchar(64) NOT NULL REFERENCES scholar(scholar_id), -- 分类主体
  field_id varchar(64) NOT NULL REFERENCES academic_field(field_id), -- 规范领域
  evidence_ref text NOT NULL, -- 公开来源分类依据，不由个人兴趣猜测
  PRIMARY KEY (scholar_id, field_id)
);

-- 规范成果主记录
CREATE TABLE achievement (
  work_id varchar(64) NOT NULL PRIMARY KEY, -- 去重规范成果ID
  work_type text NOT NULL CHECK (work_type IN ('paper','patent','project','award')), -- paper/patent/project/award四种
  title text NOT NULL, -- 完整题名
  year integer CHECK (year IS NULL OR year BETWEEN 1000 AND 9999), -- 已知年份；未知为NULL
  keywords jsonb NOT NULL DEFAULT '[]'::jsonb, -- 公开关键词数组
  abstract text, -- 允许公开的摘要；未知为空
  visibility text NOT NULL CHECK (visibility IN ('PUBLIC','PRIVATE','WITHDRAWN')), -- 权威公开资格
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0), -- 本成果单调版本
  simulated boolean NOT NULL DEFAULT false, -- 是否模拟成果
  updated_at timestamptz NOT NULL, -- 权威更新时点
  doi text -- 经来源/治理核实的DOI；未知为空，不把冲突覆盖为唯一事实
);

-- 成果与学者的规范参与关系
CREATE TABLE achievement_participation (
  participation_id varchar(64) NOT NULL PRIMARY KEY, -- 参与关联ID
  work_id varchar(64) NOT NULL REFERENCES achievement(work_id), -- 成果
  scholar_id varchar(64) NOT NULL REFERENCES scholar(scholar_id), -- 规范学者
  role_description text, -- 来源支持的参与角色集合说明；未知为NULL
  ordinal integer CHECK (ordinal IS NULL OR ordinal > 0), -- 来源给出的顺序
  evidence_ref text NOT NULL, -- 公开参与关系依据
  UNIQUE (work_id, scholar_id),
  UNIQUE (participation_id, scholar_id)
);

-- 成果发生时机构关系
CREATE TABLE achievement_institution (
  work_id varchar(64) NOT NULL REFERENCES achievement(work_id), -- 成果
  institution_id varchar(64) NOT NULL REFERENCES institution(institution_id), -- 成果发生时机构
  evidence_ref text NOT NULL, -- 历史归属证据；不从现任机构推断
  PRIMARY KEY (work_id, institution_id)
);

-- 成果领域关系
CREATE TABLE achievement_field (
  work_id varchar(64) NOT NULL REFERENCES achievement(work_id), -- 成果
  field_id varchar(64) NOT NULL REFERENCES academic_field(field_id), -- 规范领域
  evidence_ref text NOT NULL, -- 分类依据
  PRIMARY KEY (work_id, field_id)
);

-- 单成果粒度来源身份，数据岗衔接
CREATE TABLE source_record (
  source_record_id varchar(64) NOT NULL PRIMARY KEY, -- 单成果来源记录ID
  source_code text NOT NULL, -- 经批准来源代码
  external_key text NOT NULL, -- 来源内稳定键
  current_work_id varchar(64) REFERENCES achievement(work_id), -- 当前规范映射；未映射为空
  license_ref text NOT NULL, -- 许可/使用依据引用
  source_url text NOT NULL, -- 公开来源地址
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0), -- 来源记录版本
  UNIQUE (source_code, external_key)
);

-- 学者公开门户
CREATE TABLE scholar_portal (
  portal_id varchar(64) NOT NULL PRIMARY KEY, -- 内部不透明门户ID
  scholar_id varchar(64) NOT NULL REFERENCES scholar(scholar_id), -- 门户展示主体
  intro text, -- 授权内个人说明
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0), -- 门户版本
  updated_at timestamptz NOT NULL, -- 最近更新时点
  interests jsonb NOT NULL DEFAULT '[]'::jsonb, -- 授权内个人兴趣字符串数组；不当作规范领域ID
  UNIQUE (scholar_id),
  UNIQUE (portal_id, scholar_id)
);

-- 可选个人展示配置
CREATE TABLE portal_display (
  portal_id varchar(64) NOT NULL REFERENCES scholar_portal(portal_id), -- 门户
  participation_id varchar(64) NOT NULL REFERENCES achievement_participation(participation_id), -- 被展示参与关系
  scholar_id varchar(64) NOT NULL REFERENCES scholar(scholar_id), -- 冗余用于复合FK验证同一学者
  visible boolean NOT NULL DEFAULT true, -- 个人展示选择，不影响成果公共资格
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0), -- 展示配置版本
  PRIMARY KEY (portal_id, participation_id),
  FOREIGN KEY (portal_id, scholar_id) REFERENCES scholar_portal(portal_id, scholar_id),
  FOREIGN KEY (participation_id, scholar_id) REFERENCES achievement_participation(participation_id, scholar_id)
);

-- 私有认领材料元数据
CREATE TABLE evidence_reference (
  evidence_id varchar(64) NOT NULL PRIMARY KEY, -- 材料引用ID，非下载凭据
  owner_account_id varchar(64) NOT NULL REFERENCES app_account(account_id), -- 材料归属
  private_object_key text NOT NULL, -- 私有对象存储键，不向公众返回
  media_type text NOT NULL, -- 经校验实际类型
  size_bytes bigint NOT NULL CHECK (size_bytes > 0), -- 材料字节数
  validation_state text NOT NULL, -- 材料校验结果；具体安全流程待设计
  created_at timestamptz NOT NULL, -- 上传时间
  expires_at timestamptz, -- 按已批准保留策略计算，未定不假填期限
  failure_reason text, -- 脱敏校验失败分类；客户端映射可理解说明，不存证明正文或堆栈
  UNIQUE (evidence_id, owner_account_id)
);

-- 三态认领申请
CREATE TABLE claim_request (
  claim_id varchar(64) NOT NULL PRIMARY KEY, -- 申请ID，API候选application_id映射
  applicant_id varchar(64) NOT NULL REFERENCES app_account(account_id), -- 会话确定的申请人
  portal_id varchar(64) NOT NULL REFERENCES scholar_portal(portal_id), -- 目标门户，通过scholar_id解析
  status text NOT NULL CHECK (status IN ('PENDING','APPROVED','REJECTED')), -- 申请业务状态
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0), -- 乐观并发版本
  previous_claim_id varchar(64) REFERENCES claim_request(claim_id), -- 驳回后新申请的前序引用
  created_at timestamptz NOT NULL, -- 有效创建时点
  decided_at timestamptz, -- 成功决定时间；待审为空
  UNIQUE (claim_id, applicant_id),
  UNIQUE (claim_id, applicant_id, portal_id),
  CHECK (previous_claim_id IS NULL OR previous_claim_id <> claim_id),
  CHECK ((status = 'PENDING' AND decided_at IS NULL) OR (status <> 'PENDING' AND decided_at IS NOT NULL))
);

-- 申请材料与归属约束
CREATE TABLE claim_evidence (
  claim_id varchar(64) NOT NULL REFERENCES claim_request(claim_id), -- 申请
  evidence_id varchar(64) NOT NULL REFERENCES evidence_reference(evidence_id), -- 材料
  applicant_id varchar(64) NOT NULL REFERENCES app_account(account_id), -- 同一申请人/材料所有人
  PRIMARY KEY (claim_id, evidence_id),
  FOREIGN KEY (claim_id, applicant_id) REFERENCES claim_request(claim_id, applicant_id),
  FOREIGN KEY (evidence_id, applicant_id) REFERENCES evidence_reference(evidence_id, owner_account_id)
);

-- 每申请一次有效业务决定
CREATE TABLE review_decision (
  claim_id varchar(64) NOT NULL REFERENCES claim_request(claim_id), -- 对应申请
  reviewer_id varchar(64) NOT NULL REFERENCES app_account(account_id), -- 有当前审核资格的账号
  applicant_id varchar(64) NOT NULL REFERENCES app_account(account_id), -- 通过复合FK确定申请人
  decision text NOT NULL CHECK (decision IN ('APPROVED','REJECTED')), -- 有效决定
  reason text NOT NULL CHECK (length(btrim(reason)) > 0), -- 通过/驳回理由
  expected_version bigint NOT NULL, -- 提交期望版本
  result_version bigint NOT NULL, -- 决定后版本
  decided_at timestamptz NOT NULL, -- 决定提交时点
  PRIMARY KEY (claim_id),
  FOREIGN KEY (claim_id, applicant_id) REFERENCES claim_request(claim_id, applicant_id),
  CHECK (reviewer_id <> applicant_id),
  CHECK (expected_version > 0 AND result_version = expected_version + 1)
);

-- 门户维护资格及历史
CREATE TABLE portal_grant (
  grant_id varchar(64) NOT NULL PRIMARY KEY, -- 授权ID
  portal_id varchar(64) NOT NULL REFERENCES scholar_portal(portal_id), -- 目标门户
  account_id varchar(64) NOT NULL REFERENCES app_account(account_id), -- 获权账号
  source_claim_id varchar(64) NOT NULL REFERENCES claim_request(claim_id), -- 通过申请
  active boolean NOT NULL DEFAULT true, -- 当前是否有效
  granted_at timestamptz NOT NULL, -- 授权时点
  revoked_at timestamptz, -- 依法撤销时点；策略待批准
  UNIQUE (source_claim_id),
  FOREIGN KEY (source_claim_id, account_id, portal_id) REFERENCES claim_request(claim_id, applicant_id, portal_id),
  CHECK ((active AND revoked_at IS NULL) OR (NOT active AND revoked_at IS NOT NULL))
);

-- 最小操作轨迹，不存证明正文
CREATE TABLE audit_record (
  audit_id varchar(64) NOT NULL PRIMARY KEY, -- 审计记录ID
  actor_id varchar(64) NOT NULL REFERENCES app_account(account_id), -- 服务端确定的操作者
  action_code text NOT NULL, -- 动作语义
  target_type text NOT NULL, -- 对象类型
  target_id varchar(64) NOT NULL, -- 目标ID；跨类型由服务验证
  claim_id varchar(64) REFERENCES claim_request(claim_id), -- 认领轨迹可选申请关联
  result_code text NOT NULL, -- 操作结果
  before_version bigint, -- 操作前版本
  after_version bigint, -- 操作后版本
  occurred_at timestamptz NOT NULL -- 发生时点
);

-- 共享字段纠错与来源冲突
CREATE TABLE governance_request (
  governance_id varchar(64) NOT NULL PRIMARY KEY, -- 治理请求ID
  requester_id varchar(64) NOT NULL REFERENCES app_account(account_id), -- 请求人
  work_id varchar(64) NOT NULL REFERENCES achievement(work_id), -- 目标成果
  expected_version bigint NOT NULL, -- 防旧版本覆盖
  proposed_public_change jsonb NOT NULL, -- 经白名单过滤的公共字段建议
  state_code text NOT NULL, -- 治理流程状态，待跨岗批准
  created_at timestamptz NOT NULL, -- 创建时间
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0) -- 治理请求条件写/响应版本
);

-- 任务存储边界，最终字段归成员2/7
CREATE TABLE collection_task (
  task_id varchar(64) NOT NULL PRIMARY KEY, -- 采集任务ID
  created_by varchar(64) NOT NULL REFERENCES app_account(account_id), -- 有任务管理资格的创建者
  source_code text NOT NULL, -- 经批准来源
  state_code text NOT NULL, -- 任务状态映射待数据岗批准
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0), -- 条件写版本
  created_at timestamptz NOT NULL -- 创建时间
);

-- 每次尝试与恢复过程
CREATE TABLE processing_run (
  run_id varchar(64) NOT NULL PRIMARY KEY, -- 执行尝试ID，与任务分离
  task_id varchar(64) NOT NULL REFERENCES collection_task(task_id), -- 所属任务
  attempt_no integer NOT NULL CHECK (attempt_no > 0), -- 正整数尝试序号
  state_code text NOT NULL, -- 运行状态，非认领状态
  checkpoint_ref text, -- 有据可复现检查点引用
  started_at timestamptz NOT NULL, -- 开始时间
  finished_at timestamptz, -- 完成时点
  UNIQUE (task_id, attempt_no)
);

-- 原始观测与处理版本追溯
CREATE TABLE source_observation (
  observation_id varchar(64) NOT NULL PRIMARY KEY, -- 观测ID
  run_id varchar(64) NOT NULL REFERENCES processing_run(run_id), -- 本次运行
  source_record_id varchar(64) NOT NULL REFERENCES source_record(source_record_id), -- 来源身份
  payload_hash varchar(64) NOT NULL, -- 原始内容摘要
  raw_object_key text NOT NULL, -- 受许可控制的原始载荷引用
  rule_version text NOT NULL, -- 处理规则版本
  observed_at timestamptz NOT NULL -- 观测时点
);

-- 规范成果变更追溯
CREATE TABLE update_record (
  update_id varchar(64) NOT NULL PRIMARY KEY, -- 更新记录ID
  work_id varchar(64) NOT NULL REFERENCES achievement(work_id), -- 规范成果
  observation_id varchar(64) REFERENCES source_observation(observation_id), -- 数据岗输入观测，人工变更可空
  before_version bigint, -- 初次入库之前无版本
  after_version bigint NOT NULL, -- 本次变更后版本
  rule_version text NOT NULL, -- 规则/人工治理版本
  updated_at timestamptz NOT NULL -- 变更时点
);

-- 本地事务外发事件
CREATE TABLE outbox_event (
  event_id varchar(64) NOT NULL PRIMARY KEY, -- 事件ID，重复投递稳定不变
  aggregate_type text NOT NULL, -- 业务聚合类型
  aggregate_id varchar(64) NOT NULL, -- 聚合ID
  aggregate_version bigint NOT NULL CHECK (aggregate_version > 0), -- 聚合单调版本
  event_type text NOT NULL, -- 事件语义
  destination text NOT NULL, -- 单一消费者目的地；多目的各建事件
  payload jsonb NOT NULL, -- ID/版本或公共投影；禁止证明正文
  created_at timestamptz NOT NULL, -- 与业务同事务创建
  published_at timestamptz, -- 目标成功逐项ack后记录
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0), -- 投递尝试数
  next_attempt_at timestamptz, -- 重试调度时点
  last_error text, -- 脱敏错误分类，不存敏感正文
  lease_owner text, -- 租约工作者标识，不作认证凭据
  lease_until timestamptz, -- 短租约失效时点
  lease_token varchar(64), -- 领取代次令牌；ack时条件匹配防旧工作者误确认
  CHECK ((lease_owner IS NULL AND lease_until IS NULL AND lease_token IS NULL) OR (lease_owner IS NOT NULL AND lease_until IS NOT NULL AND lease_token IS NOT NULL))
);

-- 同主体同操作请求幂等
CREATE TABLE idempotency_record (
  account_id varchar(64) NOT NULL REFERENCES app_account(account_id), -- 操作主体
  operation_code text NOT NULL, -- 操作语义范围
  request_key varchar(200) NOT NULL, -- 客户端幂等键；不得写入秘密
  request_digest varchar(64) NOT NULL, -- 规范化参数摘要
  result_ref jsonb NOT NULL, -- 最小结果引用，不复制证明正文
  created_at timestamptz NOT NULL, -- 与业务同事务保存
  expires_at timestamptz NOT NULL, -- 按批准策略计算
  PRIMARY KEY (account_id, operation_code, request_key)
);

-- 完整不可变公开检索代次
CREATE TABLE publication_generation (
  generation_id varchar(64) NOT NULL PRIMARY KEY, -- 发布代次ID
  concrete_index text NOT NULL UNIQUE, -- 具体不可变索引名，不仅是alias
  data_version text NOT NULL UNIQUE, -- 公开响应数据版本
  policy_epoch bigint NOT NULL CHECK (policy_epoch > 0), -- 该代次覆盖的权威权限epoch
  status text NOT NULL CHECK (status IN ('BUILDING','VALIDATED','RETIRED')), -- 发布生命周期内部状态
  live_count bigint CHECK (live_count IS NULL OR live_count >= 0), -- 全量合法ID数
  id_set_checksum text, -- 规范ID集合对账摘要
  validated_at timestamptz, -- 验证完成时点
  created_at timestamptz NOT NULL, -- 创建时点
  source_snapshot_ref text NOT NULL, -- DB一致性快照/不可变导出引用，绑定公开代次
  boundary_watermark text NOT NULL -- 导出与接续事件的明确边界水位
);

-- 全局公开安全栅栏
CREATE TABLE public_gate (
  gate_id varchar(64) NOT NULL PRIMARY KEY, -- 固定单例public，不是业务ID协议
  epoch bigint NOT NULL CHECK (epoch > 0), -- 可见性收缩时单调递增
  state text NOT NULL CHECK (state IN ('READY','BLOCKED')), -- 阻断或可查询
  active_generation_id varchar(64) REFERENCES publication_generation(generation_id), -- 已核验代次；初始化可为空
  updated_at timestamptz NOT NULL, -- 最近权威变更时点
  CHECK (gate_id = 'public'),
  CHECK (state <> 'READY' OR active_generation_id IS NOT NULL)
);
CREATE UNIQUE INDEX uq_pending_claim ON claim_request (applicant_id, portal_id) WHERE status = 'PENDING';
CREATE UNIQUE INDEX uq_active_portal_grant ON portal_grant (portal_id) WHERE active;
CREATE INDEX ix_claim_queue ON claim_request (created_at, claim_id) WHERE status = 'PENDING';
CREATE INDEX ix_claim_applicant ON claim_request (applicant_id, created_at DESC);
CREATE INDEX ix_participation_scholar ON achievement_participation (scholar_id, work_id);
CREATE INDEX ix_work_filter ON achievement (work_type, year, work_id) WHERE visibility = 'PUBLIC';
CREATE INDEX ix_work_institution ON achievement_institution (institution_id, work_id);
CREATE INDEX ix_work_field ON achievement_field (field_id, work_id);
CREATE INDEX ix_outbox_pending ON outbox_event (next_attempt_at, created_at, event_id) WHERE published_at IS NULL;
CREATE INDEX ix_outbox_aggregate ON outbox_event (aggregate_type, aggregate_id, aggregate_version);
CREATE INDEX ix_update_work ON update_record (work_id, after_version);
CREATE INDEX ix_observation_source ON source_observation (source_record_id, observed_at);
CREATE INDEX ix_audit_target ON audit_record (target_type, target_id, occurred_at);
CREATE INDEX ix_session_account ON app_session (account_id, expires_at);
CREATE INDEX ix_scholar_field ON scholar_field (field_id, scholar_id);

-- No triggers or business transaction procedures are supplied. See design document.
ROLLBACK;
