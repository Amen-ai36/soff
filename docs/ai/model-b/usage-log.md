# 模型 B 使用日志（B 组）

按 `AGENT.md` 第 8 节，只记录核心代码相关的 AI 活动。本文件由成员 10 维护（方案第 6 节）；以下条目由成员 9 的任务产生，交成员 10 收录。

## B-M9-001 B 组前端原型首个版本

| 项 | 内容 |
| --- | --- |
| 日期 | 2026-11-11 |
| 成员 | 成员 9（使用者）；AI 为代码智能体 |
| 模型 | Claude Opus 5.5（`claude-opus-5-5`），通过 Claude Code 使用 |
| 任务 | 按 SPEC-M9-SEARCH-UI、SPEC-M9-PORTAL-CLAIM-UI、SPEC-M9-ADMIN-UI、SPEC-M9-STATS-COLLAB-UI 实现 B 组前端全部核心页面与创新候选页面 |
| 对应 SPEC | 上述 4 份（`docs/contributions/member-09/component-design/specs/`）；依赖 SPEC-M8-SEARCH、SPEC-M8-CLAIM、SPEC-M8-STATS、SPEC-M8-AUTH v0.1 |
| 提示词 | [prompts/B-M9-001.md](prompts/B-M9-001.md) |
| 生成范围 | `frontend/` 全部文件：domain 14 个、api 9 个、composables 4 个、components 6 个、views 14 个（含 404 页）、features 1 个、router 与入口文件，及 22 个测试文件 |
| 测试命令 | `npm run typecheck`、`npm test`、`npm run coverage`、`npm run build`（工作目录 `frontend/`） |
| 测试结果 | 类型检查 0 错误；22 个文件 239 个测试全部通过；domain/api/composables/features 行覆盖率 99.36%；构建成功 |
| AI 自查修正 | 见 [correction-cases.md](correction-cases.md) B-M9-C01～C06，均为 AI 在执行测试、截图后自行发现并修正 |
| 人工审查 | **审查人**：成员 9（本次审查由用户委托，记录执行：Codex）；**日期**：2026-11-17。<br>**结论**：有条件通过，作为 B 组候选稿进入阶段交付；尚不是团队已选定的主版本。对照 4 份 UI SPEC、分层约束和本条列出的重点，检查了路由与鉴权引导、成果/学者检索、筛选分页、门户与认领、门户维护、审核与采集任务、统计与合作路径、错误/重试状态、开放重定向防护和分层依赖，未发现需立即修复的阻断性缺陷。<br>**实际验证**：`npm run typecheck`（0 错误）；`npm test`（22 个文件、239 个测试通过）；`npm run coverage`（语句 98.32%、分支 95.58%、函数 98.76%、行 99.36%）；`npm run build`（成功，Vite 转换 98 个模块）。覆盖率配置只统计 `domain/api/composables/features`，不代表全量视图与组件覆盖率。<br>**本次修改**：未修改核心代码；已有 AI 自查修正见 [correction-cases.md](correction-cases.md)。<br>**保留问题**：尚未与真实后端联调，`api/http.ts` 的 18 项契约假设仍待成员 3、8 确认；模拟数据规模和真实用户可用性仍待验证；`MockApiClient` 的主页 URL 校验与 `domain` 校验强度不完全一致、认领列表加载失败时的入口提示需在联调中复核。 |
| 遗留问题 | 未与真实后端联调；18 项契约假设待成员 3、8 确认；见实现说明第 6 节 |

### 建议人工重点审查

1. `src/api/mock/search.ts` 第 1～6 行写明的对 SPEC-M8-SEARCH 的解释（拉丁词按子串匹配、学者至少命中一个词），需成员 8 确认是否符合本意。
2. `src/api/http.ts` 中 18 项契约假设，尤其是 A-17（`url:`、`email:` 前缀的证明材料引用）和 A-18（`statement` 字段），这两项是成员 9 对契约的新增建议。
3. `src/api/mock/MockApiClient.ts` 中认领审核的并发规则（门户已有所有者时第二份申请保持 PENDING），需与 SPEC-M8-CLAIM 第 5 条对照。
4. `src/domain/redirect.ts` 的开放重定向防护。
5. 测试中没有断言被放宽或删除；可抽查 `views/*.test.ts` 的断言是否确实对应 SPEC 验收条件。
