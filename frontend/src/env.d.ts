/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `http` 使用真实后端；其他值或未设置时使用模拟实现（ADR-M9-02）。 */
  readonly VITE_API_MODE?: string
  /** 真实后端的接口前缀，默认 `/api`（契约假设 A-01）。 */
  readonly VITE_API_BASE?: string
  /** 启用的创新功能 ID，逗号分隔；未设置时启用全部登记功能，空字符串表示全部关闭。 */
  readonly VITE_FEATURES?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}
