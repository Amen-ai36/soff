// P-AC-08、T-AC-04：路由守卫只做登录引导；关闭创新功能后核心路由仍完整。
import { describe, expect, it } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import { MockApiClient } from '../api/mock/MockApiClient'
import { createSessionStore } from '../composables/useSession'
import { FEATURES } from '../features/registry'
import { buildRoutes, createAppRouter } from '../router'

const CORE = ['home', 'works', 'work', 'scholars', 'scholar', 'claim', 'maintain', 'my-claims', 'stats', 'login', 'admin-review', 'admin-tasks']

function router(api: MockApiClient, features = [...FEATURES]) {
  return createAppRouter({ history: createMemoryHistory(), features, session: createSessionStore(api) })
}

describe('路由', () => {
  it('T-AC-04：关闭全部功能后合作路径路由不存在，核心路由仍在', () => {
    const off = router(new MockApiClient(), [])
    expect(off.hasRoute('collab')).toBe(false)
    for (const name of CORE) expect(off.hasRoute(name), name).toBe(true)
    expect(router(new MockApiClient()).hasRoute('collab')).toBe(true)
    expect(buildRoutes([]).at(-1)!.name).toBe('not-found')
  })

  it('P-AC-08：未登录访问需登录页面时跳到登录页并带回跳地址', async () => {
    const r = router(new MockApiClient())
    await r.push('/me/claims?x=1')
    expect(r.currentRoute.value.path).toBe('/login')
    expect(r.currentRoute.value.query.redirect).toBe('/me/claims?x=1')
  })

  it('已登录时放行；管理页不按角色拦截，由服务端返回 403', async () => {
    const r = router(new MockApiClient({ sessionUserId: 'U01' }))
    await r.push('/admin/review')
    expect(r.currentRoute.value.name).toBe('admin-review')
  })

  it('公开页面不需要登录；未知地址进入 404 页', async () => {
    const r = router(new MockApiClient())
    await r.push('/stats')
    expect(r.currentRoute.value.name).toBe('stats')
    await r.push('/no/such/page')
    expect(r.currentRoute.value.name).toBe('not-found')
    expect(document.title).toContain('页面不存在')
  })
})
