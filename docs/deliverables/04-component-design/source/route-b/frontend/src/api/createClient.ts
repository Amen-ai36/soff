// 根据环境变量选择 ApiClient 实现（ADR-M9-02）。只在启动代码中使用，页面不直接引用。

import { HttpApiClient } from './http'
import { MockApiClient, parseMockFault } from './mock/MockApiClient'
import type { ApiClient } from './port'

export interface ClientEnv {
  VITE_API_MODE?: string
  VITE_API_BASE?: string
}

export function createClient(env: ClientEnv, location?: { search: string }): ApiClient {
  if (env.VITE_API_MODE === 'http') return new HttpApiClient({ baseUrl: env.VITE_API_BASE })

  // 以下参数只在模拟模式生效，用于演示和截图：
  // ?mock_user=U03 以示例账号进入；?mock_fault=searchWorks:DEPENDENCY_UNAVAILABLE 模拟故障。
  const params = new URLSearchParams(location?.search ?? '')
  const client = new MockApiClient({ latencyMs: 200, sessionUserId: params.get('mock_user') })
  const fault = parseMockFault(location?.search ?? '')
  if (fault) client.setFault(fault.method, fault.kind)
  return client
}
