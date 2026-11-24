// S-AC-08：同名学者提示；P-AC-06：门户入口；T-AC-05：统计区块独立。
import { describe, expect, it } from 'vitest'
import { fixtureDataset } from '../api/mock/dataset'
import { MockApiClient, demoState } from '../api/mock/MockApiClient'
import { mountRoute } from '../__tests__/helpers'

describe('ScholarSearchView', () => {
  it('S-AC-08：同名学者全部保留，标注同名并给出区分线索', async () => {
    const api = new MockApiClient({ state: demoState(fixtureDataset()) })
    const { wrapper } = await mountRoute('/scholars?name=示例学者甲', api)
    expect(wrapper.findAll('article')).toHaveLength(2)
    expect(wrapper.text()).toContain('当前结果中有同名学者')
    expect(wrapper.findAll('.badge-warning')).toHaveLength(2)
    const labels = wrapper.findAll('article')[0]!.findAll('dt').map((d) => d.text())
    expect(labels).toEqual(['研究领域', '代表成果', '机构'])
    const links = wrapper.findAll('article h3 a').map((a) => a.attributes('href'))
    expect(links).toEqual(['/scholars/A01', '/scholars/A02'])
  })

  it('学者检索带排序参数时提示错误且不请求', async () => {
    const api = new MockApiClient()
    const { wrapper } = await mountRoute('/scholars?sort=year_desc', api)
    expect(wrapper.text()).toContain('学者检索不支持排序参数')
    expect(api.calls.searchScholars).toBeUndefined()
  })
})

describe('ScholarPortalView（P-AC-06）', () => {
  it('未登录、未认领：登录后申请认领', async () => {
    const { wrapper } = await mountRoute('/scholars/A02', new MockApiClient())
    expect(wrapper.text()).toContain('未认领：门户信息由平台整理，未经本人确认')
    const link = wrapper.findAll('a').find((a) => a.text().includes('登录后申请认领'))!
    expect(link.attributes('href')).toBe('/login?redirect=/scholars/A02/claim')
  })

  it('本人已认领：维护门户', async () => {
    const { wrapper } = await mountRoute('/scholars/A03', new MockApiClient({ sessionUserId: 'U02' }))
    expect(wrapper.text()).toContain('已认领：认领关系已审核通过，不代表平台为全部成果背书')
    expect(wrapper.findAll('a').some((a) => a.text() === '维护门户')).toBe(true)
  })

  it('他人已认领：无入口', async () => {
    const { wrapper } = await mountRoute('/scholars/A03', new MockApiClient({ sessionUserId: 'U01' }))
    expect(wrapper.text()).toContain('该门户已被认领。')
    expect(wrapper.findAll('a').some((a) => /维护门户|申请认领/.test(a.text()))).toBe(false)
  })

  it('本人有审核中申请：查看进度', async () => {
    const { wrapper } = await mountRoute('/scholars/A01', new MockApiClient({ sessionUserId: 'U01' }))
    expect(wrapper.text()).toContain('你已提交申请（C-1002），查看审核进度')
  })

  it('成果按类型分标签，空类型显示明确空态', async () => {
    const { wrapper } = await mountRoute('/scholars/A03?type=paper', new MockApiClient())
    expect(wrapper.text()).toContain('暂无论文。')
    expect(wrapper.text()).toContain('全部（3）')
    expect(wrapper.text()).toContain('科研项目（1）')
  })

  it('功能开关关闭时不显示合作路径入口', async () => {
    const on = await mountRoute('/scholars/A01', new MockApiClient())
    expect(on.wrapper.text()).toContain('查看该学者的合作路径')
    const off = await mountRoute('/scholars/A01', new MockApiClient(), [])
    expect(off.wrapper.text()).not.toContain('查看该学者的合作路径')
  })
})

describe('StatsView（T-AC-05）', () => {
  it('一个区块失败时其他区块仍显示', async () => {
    const api = new MockApiClient({ state: demoState(fixtureDataset()) })
    api.setFault('getInstitutionRanking', 'DEPENDENCY_UNAVAILABLE')
    const { wrapper } = await mountRoute('/stats', api)
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('成果类型分布')
    expect(wrapper.text()).toContain('25.0%')
    expect(wrapper.text()).toContain('示例领域：图计算')
    expect(wrapper.text()).toContain('—（上一年无数据）')
  })

  it('非法年份范围不请求统计', async () => {
    const api = new MockApiClient()
    const { wrapper } = await mountRoute('/stats?from=abc', api)
    expect(wrapper.text()).toContain('统计范围有误')
    expect(api.calls.getTypeDistribution).toBeUndefined()
  })
})
