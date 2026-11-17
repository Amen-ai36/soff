# 成员 9：功能实现阶段说明（方案 B，前端）

日期：2026-11-11。阶段：第 10～17 周（本次为首个可运行版本）。分支：`b`。汇编负责人：成员 5。复核负责人：成员 10。

## 1. 职责与完成范围

方案第 5.6 节：成员 4、9 分别完成两组**全部核心前端页面和各自创新功能**。代码位于仓库根目录 [`frontend/`](../../../../frontend/)。

| 核心功能（方案第 3 节） | 前端页面 | 状态 |
| --- | --- | --- |
| 1 登录、认证、角色和权限 | 登录页；需登录页面的登录引导；管理入口按角色显示 | 已实现（模拟）；会话机制待 SPEC-M8-AUTH 选型 |
| 5 分类检索、过滤、分页、排序、详情 | 首页、成果检索、成果详情、学者检索 | 已实现 |
| 6 学者门户与成果展示 | 学者门户（四类成果标签） | 已实现 |
| 7 认领申请、审核、通过、驳回 | 三步认领申请、我的认领、认领审核 | 已实现 |
| 8 认领后的成果维护 | 门户维护（个人资料、成果展示隐藏/恢复） | 已实现；可改字段待成员 3、8 确认 |
| 9 采集任务创建、停止、重试、状态 | 采集任务管理页 | 已实现；状态按成员 7 候选 |
| 10 机构排名、类型分布、领域分布 | 统计分析页（另含领域热点、合作关系） | 已实现 |
| 创新（候选） | 合作路径探索 | 已实现；是否计为团队创新待确认 |
| 2、3、4、11 采集、清洗、入库、完整链路 | 不属于前端 | — |

**当前所有页面运行在模拟模式**：B 组后端（成员 8）尚未提供可调用的接口。HTTP 实现已按接口约束提案编写并有单元测试，但没有与真实后端联调。

## 2. 实际执行的验证

全部在 2026-11-11 于本机执行（Windows 11，Node.js 24.14.1，npm 11.11.0），工作目录 `frontend/`。

| 命令 | 结果 |
| --- | --- |
| `npm install` | 成功，145 个包；有 2 条 `EBADENGINE` 警告（见 [frontend/README.md](../../../../frontend/README.md)） |
| `npm run typecheck` | 通过，0 个错误 |
| `npm test` | 22 个测试文件、239 个测试全部通过 |
| `npm run coverage` | 见第 3 节 |
| `npm run build` | 成功；25 个资源文件，合计 211.4 KiB，gzip 后 86.0 KiB |
| `npm run dev` + Edge 无头截图 | 14 个页面截图，见 [构件设计原型](../component-design/README.md) |

## 3. 覆盖率

`AGENT.md` 第 7 节要求核心模块中至少 3 个模块行覆盖率不低于 80%。覆盖率统计范围为 `domain/`、`api/`、`composables/`、`features/`（不含 `.vue` 页面，页面由组件测试覆盖行为）。

| 范围 | 行 | 语句 | 分支 | 函数 |
| --- | ---: | ---: | ---: | ---: |
| 合计 | 99.36% | 98.32% | 95.58% | 98.76% |

| 模块 | 行覆盖率 |
| --- | ---: |
| `domain/searchQuery.ts`（检索条件校验与修改规则） | 100% |
| `domain/collabGraph.ts`（合作路径与中心度） | 100% |
| `domain/display.ts`（显示规则） | 100% |
| `domain/claimForm.ts`（认领表单校验） | 100% |
| `api/http.ts`（HTTP 实现） | 100% |
| `api/mock/search.ts`、`stats.ts`（按 SPEC-M8 编写的模拟检索与统计） | 100% |
| `api/mock/MockApiClient.ts` | 98.11% |
| `features/registry.ts` | 90.00% |
| 其余文件 | 100% |

## 4. SPEC 验收与测试对应

| SPEC | 验收编号 | 测试文件 |
| --- | --- | --- |
| [SPEC-M9-SEARCH-UI](../component-design/specs/SPEC-M9-SEARCH-UI.md) | S-AC-01、02 | `domain/searchQuery.test.ts` |
| | S-AC-03 | `api/mock/search.test.ts`、`views/WorkSearchView.test.ts` |
| | S-AC-04、05、06 | `views/WorkSearchView.test.ts` |
| | S-AC-07、08 | `domain/display.test.ts`、`views/ScholarAndStatsViews.test.ts` |
| | S-AC-09 | `composables/useAsync.test.ts` |
| [SPEC-M9-PORTAL-CLAIM-UI](../component-design/specs/SPEC-M9-PORTAL-CLAIM-UI.md) | P-AC-01 | `domain/portalEntry.test.ts` |
| | P-AC-02 | `domain/claimForm.test.ts` |
| | P-AC-03、04 | `views/ClaimViews.test.ts` |
| | P-AC-05、07 | `api/mock/MockApiClient.test.ts` |
| | P-AC-06 | `views/ScholarAndStatsViews.test.ts` |
| | P-AC-08 | `__tests__/router.test.ts` |
| [SPEC-M9-ADMIN-UI](../component-design/specs/SPEC-M9-ADMIN-UI.md) | M-AC-01 | `domain/taskState.test.ts` |
| | M-AC-02、03、05 | `views/AdminAndMiscViews.test.ts` |
| | M-AC-04、06 | `views/AdminAndMiscViews.test.ts`、`api/mock/MockApiClient.test.ts` |
| [SPEC-M9-STATS-COLLAB-UI](../component-design/specs/SPEC-M9-STATS-COLLAB-UI.md) | T-AC-01 | `api/mock/stats.test.ts` |
| | T-AC-02 | `domain/display.test.ts` |
| | T-AC-03 | `domain/collabGraph.test.ts` |
| | T-AC-04 | `features/registry.test.ts`、`__tests__/router.test.ts` |
| | T-AC-05 | `views/ScholarAndStatsViews.test.ts` |
| 架构文档 01 第 2 节 | 分层依赖 | `__tests__/architecture.test.ts` |
| UI9-A11Y-05 | 对比度 | `domain/misc.test.ts` |

`AGENT.md` 第 7 节要求覆盖的异常情况：错误输入（检索参数、表单）、空数据（无匹配、空门户类型、统计分母为 0）、重复数据（重复申请、幂等重放、重复作者）、权限不足（非管理员、非所有者、自审）、依赖失败（检索、筛选项、统计单块失败）均有测试。

### 4.1 与成员 8 夹具的一致性

模拟检索与统计使用成员 8 的合成夹具 `demo-data.json` 原样副本（测试逐字节比对原文件），并验证了 SPEC-M8-SEARCH、SPEC-M8-STATS 中写明的预期结果：

- `q=graph` 时顺序为 W01、W02、W03，W05（非公开）排除；
- 类型各 1、机构 I01=2、I02=2、无机构 1；领域 F01=2、F02=1、无领域 1；
- A01—A02 边权为 2；2024 年 F01、F02 各 50%，2025 年 F01 100%，年份未知 1。

这说明前端对接口语义的理解与成员 8 的规范一致；不说明后端实现正确。

## 5. 方案 A/B 比较指标（方案 B 取值）

对应 [架构文档](../architecture/01-presentation-layer.md) 第 7 节：

| 指标 | 方案 B |
| --- | --- |
| 核心功能页面覆盖 | 与浏览器相关的 7 项全部有页面，另有 1 个创新候选页面 |
| 前端测试数 | 22 个文件，239 个测试 |
| domain 与 api 行覆盖率 | 合计 99.36% |
| 生产构建体积 | 211.4 KiB（gzip 86.0 KiB） |
| 对未冻结契约的假设数 | 18 项，集中在 `api/http.ts` |
| 正文颜色对比度最低值 | 6.02（WCAG AA 要求 4.5） |
| 源码规模 | TypeScript 3119 行（不含测试）、21 个 Vue 组件 2289 行 |

## 6. 已知问题与限制

| 问题 | 影响 | 处理 |
| --- | --- | --- |
| 未与真实后端联调 | HTTP 实现中的 18 项契约假设可能与成员 3、8 的实现不一致 | 契约冻结后只需修改 `api/http.ts`；联调时补契约测试 |
| 会话机制未定 | 是否需要 CSRF 头、登录接口形式未确定 | 已预留 CSRF 头注入（默认读取页面 meta） |
| 模拟数据规模小 | 13 条公开成果，无法验证 10,000 条以上数据下的分页与统计性能 | 规模验证依赖成员 7、8 的真实数据 |
| 证明材料只支持链接和邮箱引用 | 没有文件上传 | 材料存储方案待成员 8 提案第 5 节确认 |
| 合作路径在浏览器端计算 | 关系边达到数千条以上会变慢 | ADR-M9-04 后果中已写明改为后端计算的条件 |
| 未做真实用户可用性测试 | 设计依据只有 30～35 名学生的问卷 | 列入人工待办 |
| CodeArts 流水线未配置 | 构建只在本机验证 | 成员 10 配置，需 Node 22.12 以上 |
| `features/registry.ts` 中 `enabledFeatures()` 未被单测直接覆盖 | 它只读取构建变量后调用已测试的 `parseFeatureFlags` | 不处理 |

## 7. AI 使用记录

本阶段属于核心代码，按 `AGENT.md` 第 8 节记录。记录写在 [`docs/ai/model-b/usage-log.md`](../../../ai/model-b/usage-log.md)，提示词在 `docs/ai/model-b/prompts/`，人工修正案例在 `correction-cases.md`。

## 8. 人工待办

- [x] 成员 9 本人审阅 `frontend/` 代码，并在 AI 使用记录中填写"人工审查"一栏（AI 记录中已列出需要重点审查的部分）
- [x] 在本机执行一次 `npm install && npm test && npm run build`，确认结果与第 2 节一致
- [ ] 与成员 8 对照 18 项契约假设，B 组后端可用后改为 `VITE_API_MODE=http` 联调
- [ ] 与成员 10 配置 CodeArts 构建（Node 22.12+；生产构建设置 `VITE_API_MODE=http`）
- [ ] 与成员 4 交换方案 A 前端的比较指标，填入统一的差异对比表
