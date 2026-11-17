# B 组前端原型（成员 9，方案 B 候选）

学术成果分享平台的浏览器端实现。分支 `b`，对应 B 组候选实现，不是团队已选定的主版本。

技术栈（ADR-M9-01，Proposed，待成员 1、6 确认）：Vue 3.5、vue-router 4.6、TypeScript 5.9、Vite 8、Vitest 5。

## 环境

- Node.js 22.12 或以上（开发时使用 24.14.1）。
- 安装时 npm 会对间接依赖 `nopt@10.0.1`、`abbrev@5.0.0`（来自 `@vue/test-utils` → `js-beautify`）给出 `EBADENGINE` 警告，它们要求 Node ^24.15.0；不影响下列命令执行，升级 Node 到 24.15 以上可消除。

## 命令

以下命令均已在 2026-11-11 实际执行并通过。

```bash
npm install        # 安装依赖
npm run dev        # 开发服务器 http://localhost:5173（默认模拟模式）
npm run typecheck  # vue-tsc 类型检查
npm test           # 单元与组件测试（22 个文件，239 个测试）
npm run coverage   # 测试并输出覆盖率
npm run build      # 类型检查 + 生产构建，输出到 dist/
```

## 运行模式

| 变量 | 取值 | 作用 |
| --- | --- | --- |
| `VITE_API_MODE` | `http` | 使用真实后端；其他值或未设置时使用模拟实现 |
| `VITE_API_BASE` | 默认 `/api` | 真实后端接口前缀 |
| `VITE_FEATURES` | 未设置：启用全部创新候选；空字符串：全部关闭；或逗号分隔的功能 ID | 创新功能开关 |

**模拟模式只用于开发、演示和测试。** 数据全部为合成数据（基于成员 8 的合成夹具），页面顶部有提示；不校验密码，示例账号 `user1`、`scholar1`、`admin1`、`admin2` 用任意非空密码即可登录。生产构建必须设置 `VITE_API_MODE=http`。

模拟模式下的演示参数：`?mock_user=U03` 以示例账号进入；`?mock_fault=searchWorks:DEPENDENCY_UNAVAILABLE` 让某个接口返回指定错误。

## 目录

```text
src/
  domain/        纯函数：查询校验、显示规则、加载状态、表单校验、合作图算法（不依赖 vue 与 api）
  api/port.ts    ApiClient 接口
  api/http.ts    HTTP 实现；对未冻结契约的 18 项假设只在此文件
  api/mock/      模拟实现与合成数据
  composables/   会话、异步加载、提交防重
  components/    界面组件
  views/         页面
  features/      创新功能注册表与开关
  styles/        CSS 与颜色令牌
  __tests__/     分层依赖检查、路由测试、测试辅助
```

分层依赖规则由 `src/__tests__/architecture.test.ts` 检查，违反时测试失败。

## 相关文档

- 架构：`docs/contributions/member-09/architecture/`
- 界面规范与原型：`docs/contributions/member-09/component-design/`
- 实现说明与测试结果：`docs/contributions/member-09/implementation/README.md`
