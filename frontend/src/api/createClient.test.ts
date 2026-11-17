import { describe, expect, it } from 'vitest'
import { createClient } from './createClient'
import { HttpApiClient } from './http'
import { MockApiClient } from './mock/MockApiClient'

describe('createClient（ADR-M9-02）', () => {
  it('VITE_API_MODE=http 时使用 HTTP 实现，否则使用模拟实现', () => {
    expect(createClient({ VITE_API_MODE: 'http' })).toBeInstanceOf(HttpApiClient)
    expect(createClient({})).toBeInstanceOf(MockApiClient)
    expect(createClient({ VITE_API_MODE: 'mock' }).mode).toBe('mock')
  })

  it('模拟模式下可从地址参数指定示例账号与故障', async () => {
    const api = createClient({}, { search: '?mock_user=U03&mock_fault=getFacets:RATE_LIMITED' })
    expect((await api.getSession())?.userId).toBe('U03')
    await expect(api.getFacets()).rejects.toMatchObject({ kind: 'RATE_LIMITED' })
  })
})
