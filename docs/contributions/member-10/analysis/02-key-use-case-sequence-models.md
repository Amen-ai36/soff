# 关键用例交互模型（时序图）

- 阶段：第 7–8 周需求分析
- 贡献：成员 10（方案 B 支撑材料）
- 状态：需求分析候选稿；不冻结具体技术栈、数据库或 API 路径。
- 依据：课程任务书要求的数据采集入库、门户认领审核、检索请求处理三条时序图；统一需求 R01–R14。

## 1. 数据采集、清洗与入库

```mermaid
sequenceDiagram
    autonumber
    actor Admin as 数据管理员
    participant UI as 管理后台
    participant Task as 采集任务管理
    participant Collector as 数据采集器
    participant ETL as 清洗与消歧
    participant Store as 规范成果存储
    participant Index as 检索索引/统计
    participant Log as 更新记录与审计

    Admin->>UI: 创建任务（来源、范围、时间窗口）
    UI->>Task: 校验并提交任务配置
    Task->>Log: 记录创建人、配置版本
    Task-->>UI: 返回任务标识与初始状态
    Task->>Collector: 启动采集
    Collector->>Collector: 校验响应状态、类型和结构
    alt 来源可用且响应合法
        Collector->>ETL: 提交原始来源记录
        ETL->>ETL: 标准化、去重、作者消歧、机构归一化
        alt 数据合格
            ETL->>Store: 幂等写入/更新规范成果
            Store-->>ETL: 返回新增、更新或跳过结果
            ETL->>Index: 请求增量刷新
            Index-->>ETL: 返回刷新结果
        else 数据冲突或字段不合格
            ETL->>Log: 记录隔离项和失败原因
        end
    else 限流、拒绝或响应结构异常
        Collector->>Log: 记录来源错误与失败计数
        Collector-->>Task: 返回失败或可重试结果
    end
    ETL->>Log: 记录各阶段输入、成功、跳过、失败数
    Task-->>UI: 更新任务状态和进度
    UI-->>Admin: 展示结果、错误摘要和重试入口
```

**分析约束**

- 创建任务时冻结来源、范围和配置版本，方便复现。
- 重试必须幂等；重复执行不能重复增加同一规范成果的计数。
- `401/403`、验证码或明确拒绝不得通过绕过限制继续采集；`429` 应按来源策略退避。
- 数据库写入成功但索引刷新失败时，保留待同步状态并支持重试，不能把整条链路误报为完全成功。
- 各阶段分别计数，避免仅以“请求成功”推断“数据已入库且可检索”。

## 2. 门户认领与审核

```mermaid
sequenceDiagram
    autonumber
    actor ScholarUser as 申请用户
    participant UI as 门户/认领页面
    participant Auth as 认证与权限服务
    participant Claim as 认领申请服务
    participant Evidence as 受控证明存储
    actor Reviewer as 审核管理员
    participant Scholar as 学者档案/授权关系
    participant Audit as 审计记录

    ScholarUser->>UI: 选择目标学者门户并填写申请
    UI->>Auth: 检查登录状态
    Auth-->>UI: 返回认证结果
    UI->>Claim: 提交申请与证明引用
    Claim->>Claim: 检查完整性、重复申请、门户占用
    Claim->>Evidence: 保存受控证明引用
    Claim->>Audit: 记录申请提交事件
    Claim-->>UI: 返回待审核状态
    UI-->>ScholarUser: 显示申请编号与状态

    Reviewer->>Claim: 打开待审核申请
    Claim->>Evidence: 按权限读取证明
    Evidence-->>Claim: 返回审核所需材料
    Claim-->>Reviewer: 展示目标门户上下文、冲突和申请历史
    Reviewer->>Claim: 通过或填写驳回理由
    Claim->>Claim: 再次检查自审和门户占用冲突
    alt 审核通过且不存在冲突
        Claim->>Scholar: 建立账号—学者授权关系
        Scholar-->>Claim: 返回授权写入结果
        Claim->>Audit: 原子记录通过结论和授权事件
        Claim-->>UI: 返回已通过状态
    else 驳回或发生冲突
        Claim->>Audit: 记录驳回理由或冲突结果
        Claim-->>UI: 返回驳回/待处理状态
    end
    UI-->>ScholarUser: 展示结果和下一步操作
```

**分析约束**

- 姓名匹配仅用于定位候选门户，不是认领通过的充分条件。
- 审核者不得审核自己的申请；审核结论必须有理由或可追溯依据。
- 申请通过与授权建立必须保持一致。若授权写入失败，不得显示为已通过。
- 证明材料仅对获授权的审核人员可见，不进入公开页面、普通日志或检索索引。
- 驳回后可按规则重新提交新申请，历史申请保留。

## 3. 检索请求处理

```mermaid
sequenceDiagram
    autonumber
    actor Visitor as 普通用户
    participant UI as 检索页面
    participant Search as 检索服务
    participant Policy as 公开范围/过滤规则
    participant Index as 检索索引
    participant Detail as 成果与学者详情服务
    participant Audit as 访问/错误日志

    Visitor->>UI: 输入关键词、类型、领域、年份和排序
    UI->>Search: 提交检索条件与分页参数
    Search->>Search: 校验参数并规范化查询
    Search->>Policy: 获取允许公开的范围和过滤条件
    Policy-->>Search: 返回有效约束
    Search->>Index: 执行检索、过滤、排序和分页
    alt 检索成功且有结果
        Index-->>Search: 返回命中项与分页信息
        Search->>Detail: 补充必要的详情/关联信息
        Detail-->>Search: 返回公开字段、来源与更新时间
        Search-->>UI: 返回结果、排序说明和分页信息
        UI-->>Visitor: 展示列表及可追溯信息
    else 检索成功但无结果
        Index-->>Search: 返回空命中集合
        Search-->>UI: 返回空列表和当前条件
        UI-->>Visitor: 显示放宽条件建议
    else 检索依赖失败
        Index-->>Search: 返回依赖错误
        Search->>Audit: 记录失败类别和关联请求
        Search-->>UI: 返回可识别错误，不伪装为空列表
        UI-->>Visitor: 展示可重试提示并保留查询条件
    end
```

**分析约束**

- 空结果与依赖不可用是不同业务结果，不能混为一谈。
- 排序字段、筛选条件、页码和每页条数应被校验；排序口径应能向用户解释。
- 只返回允许公开的字段，认领证明、审核备注、凭证和内部审计内容不得出现在结果中。
- 同名学者需要展示机构、领域或代表成果等上下文，不自动合并身份。
- 详情服务或索引暂时不可用时，返回明确错误或降级状态，不拼造虚假数据。

## 4. 模型与需求追踪

| 交互模型 | 相关需求 | 关键验收观察 |
|---|---|---|
| 数据采集入库 | R02、R03、R04、R05、R11、R14 | 同一批次能追溯来源、阶段计数、失败原因；重复重试不产生重复规范成果 |
| 门户认领审核 | R01、R07、R08、R09、R14 | 未登录不能提交；待审核不授予权限；自审被阻止；通过与授权一致；证明不公开 |
| 检索请求处理 | R01、R05、R06、R07、R10、R14 | 支持过滤分页排序；区分空结果和依赖失败；仅公开合法字段 |

## 5. 待评审事项

- 是否需要把“检索学者”和“检索成果”拆成两个独立时序图。
- 采集链路中的“待审核数据”是否由平台统一业务规则控制，还是特定来源适配器处理。
- 统计服务是检索请求的同步调用，还是独立的分析请求；本模型只表达业务边界。
- 认领申请的正式状态值域、超时处理、申诉与撤回规则需由成员 1、6 确认。
