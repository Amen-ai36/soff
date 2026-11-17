import { describe, expect, it } from 'vitest'
import { MockApiClient } from '../api/mock/MockApiClient'
import { createSessionStore } from './useSession'

describe('SessionStore', () => {
  it('并发调用 ensureLoaded 只请求一次', async () => {
    const api = new MockApiClient({ sessionUserId: 'U03' })
    const store = createSessionStore(api)
    await Promise.all([store.ensureLoaded(), store.ensureLoaded()])
    await store.ensureLoaded()
    expect(api.calls.getSession).toBe(1)
    expect(store.state.session?.userId).toBe('U03')
    expect(store.isAdmin.value).toBe(true)
  })

  it('无法确认会话时按未登录处理并记录失败', async () => {
    const api = new MockApiClient({ sessionUserId: 'U01' })
    api.setFault('getSession', 'DEPENDENCY_UNAVAILABLE')
    const store = createSessionStore(api)
    await store.ensureLoaded()
    expect(store.state.session).toBeNull()
    expect(store.state.loaded).toBe(true)
    expect(store.state.failure?.kind).toBe('DEPENDENCY_UNAVAILABLE')
  })

  it('登录与退出', async () => {
    const store = createSessionStore(new MockApiClient())
    await store.login('user1', 'x')
    expect(store.state.session?.userId).toBe('U01')
    expect(store.isAdmin.value).toBe(false)
    await store.logout()
    expect(store.state.session).toBeNull()
    await expect(store.login('user1', '')).rejects.toMatchObject({ kind: 'UNAUTHENTICATED' })
  })
})
