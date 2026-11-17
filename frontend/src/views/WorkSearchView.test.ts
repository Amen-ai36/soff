// S-AC-03～06：成果检索页（SPEC-M9-SEARCH-UI）。
import { describe, expect, it } from 'vitest'
import { fixtureDataset } from '../api/mock/dataset'
import { MockApiClient, demoState } from '../api/mock/MockApiClient'
import { mountRoute, settle } from '../__tests__/helpers'

function api() {
  return new MockApiClient({ state: demoState(fixtureDataset()) })
}

describe('WorkSearchView', () => {
  it('S-AC-03：q=graph 时结果顺序为 W01、W02、W03，W05 不出现', async () => {
    const { wrapper } = await mountRoute('/works?q=graph', api())
    const titles = wrapper.findAll('article h3 a').map((a) => a.attributes('href'))
    expect(titles).toEqual(['/works/W01', '/works/W02', '/works/W03'])
    expect(wrapper.text()).toContain('共 3 条，按相关度排序')
    expect(wrapper.text()).toContain('数据版本 synthetic-v1')
    expect(wrapper.text()).toContain('模拟数据')
  })

  it('S-AC-04：无匹配显示"未找到匹配结果"，不显示错误', async () => {
    const { wrapper } = await mountRoute('/works?q=nothing-matches&type=paper', api())
    expect(wrapper.text()).toContain('未找到匹配结果')
    expect(wrapper.text()).toContain('清除全部筛选')
    expect(wrapper.text()).not.toContain('服务暂时不可用')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('S-AC-04：依赖失败显示错误与追踪编号，不显示"0 条"或空结果文案', async () => {
    const client = api()
    client.setFault('searchWorks', 'DEPENDENCY_UNAVAILABLE')
    const { wrapper } = await mountRoute('/works?q=graph', client)
    expect(wrapper.text()).toContain('服务暂时不可用')
    expect(wrapper.text()).toContain('追踪编号：mock-trace-0001')
    expect(wrapper.text()).not.toContain('未找到匹配结果')
    expect(wrapper.text()).not.toMatch(/共 0 条/)
    client.setFault('searchWorks', null)
    await wrapper.find('[role="alert"] button').trigger('click')
    await settle()
    expect(wrapper.findAll('article')).toHaveLength(3)
  })

  it('S-AC-05：年份区间倒置时显示字段错误，且检索接口未被调用', async () => {
    const client = api()
    const { wrapper } = await mountRoute('/works?from=2025&to=2024', client)
    expect(wrapper.text()).toContain('起始年份不能晚于结束年份')
    expect(client.calls.searchWorks).toBeUndefined()
    expect(wrapper.text()).not.toContain('未找到匹配结果')
  })

  it('S-AC-05：在筛选面板输入倒置区间时不改变 URL', async () => {
    const { wrapper, router } = await mountRoute('/works', api())
    await wrapper.find('#year-from').setValue('2025')
    await wrapper.find('#year-to').setValue('2020')
    await wrapper.find('#year-from').element.closest('form')!.dispatchEvent(new Event('submit'))
    await settle()
    expect(wrapper.find('#year-error').text()).toBe('起始年份不能晚于结束年份')
    expect(router.currentRoute.value.query).toEqual({})
  })

  it('S-AC-06：在第 2 页修改筛选后页码复位', async () => {
    const { wrapper, router } = await mountRoute('/works?size=2&page=2', api())
    expect(wrapper.findAll('article')).toHaveLength(2)
    await wrapper.find('input[value="paper"]').setValue(true)
    await settle()
    expect(router.currentRoute.value.query).toEqual({ size: '2', type: ['paper'] })
  })

  it('移除单个筛选保留关键词', async () => {
    const { wrapper, router } = await mountRoute('/works?q=graph&type=paper&type=patent', api())
    const chip = wrapper.findAll('button').find((b) => b.text().startsWith('论文'))!
    await chip.trigger('click')
    await settle()
    expect(router.currentRoute.value.query).toEqual({ q: 'graph', type: ['patent'] })
  })

  it('页码越界显示"回到第 1 页"而不是无匹配', async () => {
    const { wrapper } = await mountRoute('/works?page=9', api())
    expect(wrapper.text()).toContain('第 9 页没有结果（共 4 条）')
    expect(wrapper.text()).not.toContain('未找到匹配结果')
  })

  it('筛选项加载失败只影响筛选面板', async () => {
    const client = api()
    client.setFault('getFacets', 'TIMEOUT')
    const { wrapper } = await mountRoute('/works?q=graph', client)
    expect(wrapper.text()).toContain('领域和机构筛选项加载失败，检索结果不受影响')
    expect(wrapper.findAll('article')).toHaveLength(3)
  })
})
