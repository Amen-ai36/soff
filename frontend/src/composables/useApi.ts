import { inject, type InjectionKey } from 'vue'
import type { ApiClient } from '../api/port'

export const API_KEY: InjectionKey<ApiClient> = Symbol('ApiClient')

export function useApi(): ApiClient {
  const api = inject(API_KEY)
  if (!api) throw new Error('未注入 ApiClient：请在启动代码中 provide(API_KEY, client)')
  return api
}
