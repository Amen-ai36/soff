// M-AC-02～05：认领审核页；采集任务页；登录与合作路径页。
import { describe, expect, it, vi } from 'vitest'
import { MockApiClient, demoState } from '../api/mock/MockApiClient'
import { mountRoute, settle } from '../__tests__/helpers'

function button(wrapper: Awaited<ReturnType<typeof mountRoute>>['wrapper'], text: string, index = 0) {
  return wrapper.findAll('button').filter((b) => b.text() === text)[index]!
}

describe('AdminReviewView', () => {
  it('M-AC-02：驳回理由为空时不提交并显示字段错误', async () => {
    const api = new MockApiClient({ sessionUserId: 'U03' })
    const { wrapper } = await mountRoute('/admin/review', api)
    await button(wrapper, '驳回').trigger('click')
    await settle()
    expect(wrapper.find('#reason-C-1002-error').text()).toBe('驳回理由不能为空')
    expect(api.calls.decideClaim).toBeUndefined()
  })

  it('M-AC-03：过期版本审核时显示"记录已被更新"', async () => {
    const state = demoState()
    const { wrapper } = await mountRoute('/admin/review', new MockApiClient({ state, sessionUserId: 'U03' }))
    state.claims.find((c) => c.id === 'C-1002')!.version = 9 // 模拟他人已处理
    await button(wrapper, '通过').trigger('click')
    expect(wrapper.text()).toContain('申请人将获得该门户的维护权限')
    await button(wrapper, '确认').trigger('click')
    await settle()
    expect(wrapper.text()).toContain('记录已被更新，已载入最新状态，请重新判断')
  })

  it('M-AC-04：本人申请按钮不可用', async () => {
    const { wrapper } = await mountRoute('/admin/review', new MockApiClient({ sessionUserId: 'U03' }))
    const own = wrapper.findAll('article').find((a) => a.text().includes('C-1003'))!
    expect(own.text()).toContain('不能审核本人提交的申请')
    expect(own.findAll('button')).toHaveLength(0)
  })

  it('通过后以服务端结果刷新', async () => {
    const state = demoState()
    const { wrapper } = await mountRoute('/admin/review', new MockApiClient({ state, sessionUserId: 'U03' }))
    await button(wrapper, '通过').trigger('click')
    await button(wrapper, '确认').trigger('click')
    await settle()
    expect(wrapper.text()).toContain('申请 C-1002 的审核结果：已通过')
    expect(state.owners.A01).toBe('U01')
    expect(wrapper.findAll('article').some((a) => a.text().includes('C-1002'))).toBe(false)
  })

  it('M-AC-05：普通用户访问审核页显示"无访问权限"', async () => {
    const { wrapper } = await mountRoute('/admin/review', new MockApiClient({ sessionUserId: 'U01' }))
    expect(wrapper.text()).toContain('无访问权限')
  })
})

describe('AdminTasksView', () => {
  it('按状态显示可用操作；未知数量显示"未提供"', async () => {
    const { wrapper } = await mountRoute('/admin/tasks', new MockApiClient({ sessionUserId: 'U03' }))
    const row = (id: string) => wrapper.findAll('tbody tr').find((r) => r.text().includes(id))!
    expect(row('T-301').text()).toContain('停止')
    expect(row('T-302').text()).toContain('重试')
    expect(row('T-303').findAll('button')).toHaveLength(0)
    expect(row('T-304').text()).toContain('未提供')
  })

  it('停止运行中的任务进入"安全停止中"', async () => {
    const { wrapper } = await mountRoute('/admin/tasks', new MockApiClient({ sessionUserId: 'U03' }))
    const row = wrapper.findAll('tbody tr').find((r) => r.text().includes('T-301'))!
    await row.find('button').trigger('click')
    await settle()
    expect(wrapper.text()).toContain('任务 T-301 当前状态：安全停止中')
  })

  it('未选数据源时不创建', async () => {
    const api = new MockApiClient({ sessionUserId: 'U03' })
    const { wrapper } = await mountRoute('/admin/tasks', api)
    await wrapper.find('form').trigger('submit')
    await settle()
    expect(wrapper.text()).toContain('请选择数据源')
    expect(api.calls.createTask).toBeUndefined()
  })
})

describe('LoginView', () => {
  it('登录成功后回到站内回跳地址；外部地址被忽略', async () => {
    const { wrapper, router } = await mountRoute('/login?redirect=/me/claims', new MockApiClient())
    await wrapper.find('#login-username').setValue('user1')
    await wrapper.find('#login-password').setValue('x')
    await wrapper.find('form').trigger('submit')
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/me/claims'))

    const evil = await mountRoute('/login?redirect=//evil.example', new MockApiClient())
    await evil.wrapper.find('#login-username').setValue('user1')
    await evil.wrapper.find('#login-password').setValue('x')
    await evil.wrapper.find('form').trigger('submit')
    await vi.waitFor(() => expect(evil.router.currentRoute.value.fullPath).toBe('/'))
  })

  it('失败时统一提示，不区分账号不存在与密码错误', async () => {
    const { wrapper } = await mountRoute('/login', new MockApiClient())
    await wrapper.find('#login-username').setValue('nobody')
    await wrapper.find('#login-password').setValue('x')
    await wrapper.find('form').trigger('submit')
    await settle()
    expect(wrapper.text()).toContain('账号或密码不正确')
  })
})

describe('CollabExploreView', () => {
  it('显示路径及每一步的共同成果；标注候选功能', async () => {
    const { wrapper } = await mountRoute('/explore/collab?from=A02&to=A05', new MockApiClient())
    expect(wrapper.text()).toContain('候选功能')
    expect(wrapper.text()).toContain('经过 3 步合作联系起来')
    expect(wrapper.findAll('ol li')).toHaveLength(3)
    expect(wrapper.find('ol li a').attributes('href')).toBe('/works/W01')
    expect(wrapper.text()).toContain('合作者最多的学者')
  })

  it('不连通时说明没有合作关系链', async () => {
    const { wrapper } = await mountRoute('/explore/collab?from=A01&to=A07&field=F01', new MockApiClient())
    expect(wrapper.text()).toContain('两位学者之间没有合作关系链')
  })
})
