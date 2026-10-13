# SPEC-DATA-001 数据源适配与字段级许可

> 追踪：R02、R14
> 责任：成员 2

## 1. 目标

为 API、分页导出、冻结文件和人工 CSV 提供统一只读适配器，把来源数据转换为带来源证据的 `SourceRecord`，并按字段保存访问、采集、存储、展示和导出权限。

## 2. 不在范围

- 不实现页面抓取绕过登录、验证码或限流。
- 不决定检索排序。
- 不把来源原始载荷直接作为公开响应。

## 3. 输入

```text
source_config
  source_id
  access_mode: api | paginated_export | frozen_file | manual_csv
  endpoint_template
  auth_ref
  query_scope
  page_strategy
  rate_limit
  timeout
  field_map
  license_snapshot_ref
  field_policy_ref
```

`auth_ref` 只引用秘密存储，不放密钥值。`query_scope` 必须是有界主题、机构、年份、venue、记录数或来源游标。

## 4. 输出

```text
SourceRecord
  source_id
  source_record_id
  source_url
  fetched_at
  source_version
  raw_payload_hash
  raw_storage_ref
  content_type
  parsed_fields
  source_identifiers
  license_snapshot_ref
  field_policy_ref
  request_trace_id
```

## 5. 处理流程

1. 校验 source_config 与字段级许可快照存在。
2. 生成确定性请求计划；分页、游标或文件切片必须有终止条件。
3. 发送请求并记录状态码、内容类型、响应时间、字节数和重定向。
4. 对响应做成功判定：状态码、内容类型、编码和结构必须同时满足。
5. 若返回挑战页、登录页、HTML 错误页或未知结构，终止该批并记录 `SOURCE_CONTRACT_MISMATCH`。
6. 解析响应到 `SourceRecord`，不覆盖原始载荷引用。
7. 执行字段级许可映射，未获授权的字段标记 `restricted`。
8. 输出批摘要：请求数、成功数、失败数、字节数、限流次数和解析错误数。

## 6. 成功判定

HTTP 200 不等于成功。至少同时满足：

- 状态码在配置成功集合内；
- 内容类型与适配器预期一致；
- 根结构和必需字段满足契约；
- 响应不是挑战、登录、验证码或服务错误页面；
- 返回数量不超过配置上限。

## 7. 错误码

| 错误码 | 含义 | 默认重试 |
| --- | --- | --- |
| SOURCE_AUTH_REQUIRED | 缺少或失效授权 | 否，等待人工 |
| SOURCE_RATE_LIMITED | 429 或来源限流 | 是，遵守 Retry-After |
| SOURCE_NETWORK_TIMEOUT | 连接或读取超时 | 是 |
| SOURCE_CONTRACT_MISMATCH | 内容类型或结构异常 | 否，先人工确认 |
| SOURCE_PARSE_ERROR | 已识别内容但解析失败 | 视错误类型 |
| SOURCE_POLICY_BLOCKED | 许可或条款阻止访问 | 否 |
| SOURCE_DATA_INVALID | 记录隔离或字段非法 | 否，进入质量队列 |

## 8. 安全与合规

- User-Agent 标记项目、版本和联系邮箱。
- 默认单并发，不跨来源共享匿名代理或轮换凭证。
- 原始终端和认证引用不进入前端。
- 日志只保留请求摘要、响应元数据和哈希，不记录完整敏感载荷。
- 字段级权限至少包含 `access`、`collect`、`store`、`display`、`export`。

## 9. 验收与测试

1. 离线固定响应可重复解析，字段映射稳定。
2. 401、403、429、超时、HTML 挑战页和空结果分别产生不同错误码。
3. 相同 source_config 和查询范围生成相同请求清单。
4. 受限字段不能出现在公开 DTO。
5. 适配器停用后不能新增 SourceRecord，但既有数据可审计和下线。
