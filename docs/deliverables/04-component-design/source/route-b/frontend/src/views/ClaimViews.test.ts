// P-AC-03、P-AC-04：认领申请页；门户维护冲突处理。
import { describe, expect, it } from 'vitest'
import { MockApiClient, demoState } from '../api/mock/MockApiClient'
import { mountRoute, settle } from '../__tests__/helpers'

describe('ClaimApplyView', () => {
  it('P-AC-03：步骤 1 为空时出现错误且焦点在说明字段', async () => {
    const { wrapper } = await mountRoute('/scholars/A04/claim', new MockApiClient({ sessionUserId: 'U04' }))
    await wrapper.find('form').trigger('submit')
    await settle()
    expect(wrapper.find('#claim-statement-error').text()).toBe('请填写你与该学者的关系')
    expect(document.activeElement?.id).toBe('claim-statement')
  })

  it('P-AC-04：完整提交后显示编号与"审核中"，不显示维护入口；上一步保留内容', async () => {
    const api = new MockApiClient({ sessionUserId: 'U04' })
    const { wrapper } = await mountRoute('/scholars/A04/claim', api)
    await wrapper.find('#claim-statement').setValue('本人即该学者')
    await wrapper.find('form').trigger('submit')
    await settle()
    await wrapper.find('form').trigger('submit')
    await settle()
    expect(wrapper.find('#claim-homepageUrl-error').text()).toBe('请至少提供一项证明材料')
    await wrapper.find('#claim-homepageUrl').setValue('https://example.org/me')
    await wrapper.find('form').trigger('submit')
    await settle()
    await wrapper.findAll('button').find((b) => b.text() === '上一步')!.trigger('click')
    await settle()
    expect((wrapper.find('#claim-homepageUrl').element as HTMLInputElement).value).toBe('https://example.org/me')
    await wrapper.find('form').trigger('submit')
    await settle()
    await wrapper.find('#claim-consent').setValue(true)
    await wrapper.find('form').trigger('submit')
    await settle()
    expect(wrapper.text()).toContain('申请已提交')
    expect(wrapper.text()).toMatch(/C-\d+/)
    expect(wrapper.text()).toContain('审核中')
    expect(wrapper.text()).toContain('审核通过前你还不能维护该门户')
    expect(wrapper.findAll('a').some((a) => a.text() === '维护门户')).toBe(false)
  })

  it('网络中断后重试使用同一 request_key，不产生第二个申请', async () => {
    const state = demoState()
    const api = new MockApiClient({ state, sessionUserId: 'U04' })
    const { wrapper } = await mountRoute('/scholars/A04/claim', api)
    await wrapper.find('#claim-statement').setValue('本人')
    await wrapper.find('form').trigger('submit')
    await settle()
    await wrapper.find('#claim-institutionEmail').setValue('a04@example.org')
    await wrapper.find('form').trigger('submit')
    await settle()
    await wrapper.find('#claim-consent').setValue(true)
    api.setFault('submitClaim', 'NETWORK', { once: true })
    await wrapper.find('form').trigger('submit')
    await settle()
    expect(wrapper.text()).toContain('提交是否成功尚未确认')
    const before = state.claims.length
    await wrapper.find('form').trigger('submit')
    await settle()
    expect(wrapper.text()).toContain('申请已提交')
    expect(state.claims.length).toBe(before + 1)
  })

  it('门户已被认领时不显示表单', async () => {
    const { wrapper } = await mountRoute('/scholars/A03/claim', new MockApiClient({ sessionUserId: 'U04' }))
    expect(wrapper.text()).toContain('该门户已被认领，无法申请')
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('已有审核中申请时不显示表单', async () => {
    const { wrapper } = await mountRoute('/scholars/A01/claim', new MockApiClient({ sessionUserId: 'U01' }))
    expect(wrapper.text()).toContain('你已提交过该门户的申请（C-1002）')
    expect(wrapper.find('form').exists()).toBe(false)
  })
})

describe('PortalMaintainView', () => {
  it('版本冲突时提示并保留未保存的输入', async () => {
    const state = demoState()
    const api = new MockApiClient({ state, sessionUserId: 'U02' })
    const { wrapper } = await mountRoute('/scholars/A03/maintain', api)
    state.profiles.A03!.version += 1 // 模拟他人先保存
    await wrapper.find('#profile-bio').setValue('我未保存的新简介')
    await wrapper.findAll('form')[0]!.trigger('submit')
    await settle()
    expect(wrapper.text()).toContain('记录已被更新，已载入最新版本')
    expect((wrapper.find('#profile-bio').element as HTMLTextAreaElement).value).toBe('我未保存的新简介')
    await wrapper.findAll('form')[0]!.trigger('submit')
    await settle()
    expect(wrapper.text()).toContain('已保存。')
    expect(state.profiles.A03!.bio).toBe('我未保存的新简介')
  })

  it('批量隐藏需确认并显示实际变化条数', async () => {
    const state = demoState()
    const { wrapper } = await mountRoute('/scholars/A03/maintain', new MockApiClient({ state, sessionUserId: 'U02' }))
    await wrapper.find('#select-W09').setValue(true)
    await wrapper.find('#select-W10').setValue(true)
    await wrapper.findAll('button').find((b) => b.text() === '隐藏所选')!.trigger('click')
    expect(wrapper.text()).toContain('将隐藏 2 项。隐藏只影响你的门户展示，不删除成果，也不影响其他作者。')
    await wrapper.findAll('button').find((b) => b.text() === '确认')!.trigger('click')
    await settle()
    expect(wrapper.text()).toContain('已隐藏 2 项')
    expect(state.profiles.A03!.hidden).toEqual(['W09', 'W10'])
  })

  it('非所有者显示"无访问权限"', async () => {
    const { wrapper } = await mountRoute('/scholars/A03/maintain', new MockApiClient({ sessionUserId: 'U01' }))
    expect(wrapper.text()).toContain('无访问权限')
  })
})
