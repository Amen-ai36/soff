// S-AC-03：模拟检索与 SPEC-M8-SEARCH 夹具预期一致；夹具文件与成员 8 原文件一致。
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { emptyScholarQuery, emptyWorkQuery } from '../../domain/searchQuery'
import { demoDataset, fixtureDataset } from './dataset'
import { paginate, rankScholars, rankWorks, tokenize } from './search'

const fixture = fixtureDataset()
const ids = (list: { id: string }[]) => list.map((x) => x.id)

describe('夹具来源', () => {
  it('member08-fixture.json 与成员 8 原文件逐字节一致', () => {
    const copy = readFileSync(resolve(process.cwd(), 'src/api/mock/member08-fixture.json'))
    const original = readFileSync(resolve(process.cwd(), '../docs/contributions/member-08/requirements/fixtures/demo-data.json'))
    expect(copy.equals(original)).toBe(true)
  })

  it('演示数据集保留夹具记录原样，并只增加合成记录', () => {
    const demo = demoDataset()
    expect(demo.works.slice(0, fixture.works.length)).toEqual(fixture.works)
    expect(demo.scholars.slice(0, fixture.scholars.length)).toEqual(fixture.scholars)
    const refs = new Set([...demo.institutions, ...demo.fields].map((r) => r.id))
    for (const w of demo.works) for (const id of [...w.institutionIds, ...w.fieldIds]) expect(refs.has(id), id).toBe(true)
  })
})

describe('rankWorks（SPEC-M8-SEARCH）', () => {
  it('q=graph：完全匹配优先，其后按加权分数；不匹配与非公开排除', () => {
    // 夹具说明：W01=5（完全匹配）、W02=8、W03=1；W04 不匹配；W05 非公开。
    expect(ids(rankWorks(fixture, { ...emptyWorkQuery(), q: 'graph' }))).toEqual(['W01', 'W02', 'W03'])
    expect(ids(rankWorks(fixture, { ...emptyWorkQuery(), q: ' GRAPH ' }))).toEqual(['W01', 'W02', 'W03'])
  })

  it('多词须全部命中（AND）', () => {
    expect(ids(rankWorks(fixture, { ...emptyWorkQuery(), q: 'graph methods' }))).toEqual(['W02'])
    expect(ids(rankWorks(fixture, { ...emptyWorkQuery(), q: 'graph award' }))).toEqual([])
  })

  it('空查询返回全部公开成果；年份排序未知年份在末尾', () => {
    expect(ids(rankWorks(fixture, emptyWorkQuery()))).toEqual(['W02', 'W01', 'W03', 'W04'])
    expect(ids(rankWorks(fixture, { ...emptyWorkQuery(), sort: 'year_desc' }))).toEqual(['W02', 'W01', 'W03', 'W04'])
    expect(ids(rankWorks(fixture, { ...emptyWorkQuery(), sort: 'year_asc' }))).toEqual(['W01', 'W03', 'W02', 'W04'])
  })

  it('过滤：不同维度 AND，同维度 OR；设置年份时排除未知年份', () => {
    expect(ids(rankWorks(fixture, { ...emptyWorkQuery(), types: ['paper', 'award'] }))).toEqual(['W01', 'W04'])
    expect(ids(rankWorks(fixture, { ...emptyWorkQuery(), yearFrom: 2024 }))).toEqual(['W02', 'W01', 'W03'])
    expect(ids(rankWorks(fixture, { ...emptyWorkQuery(), yearTo: 2024 }))).toEqual(['W01', 'W03'])
    expect(ids(rankWorks(fixture, { ...emptyWorkQuery(), fieldIds: ['F01'], institutionIds: ['I02'] }))).toEqual(['W01'])
  })

  it('演示数据中的非公开记录不出现', () => {
    expect(ids(rankWorks(demoDataset(), emptyWorkQuery()))).not.toContain('W15')
  })
})

describe('rankScholars', () => {
  it('同名学者全部保留，按 ID 排序', () => {
    expect(ids(rankScholars(fixture, { ...emptyScholarQuery(), name: '示例学者甲' }))).toEqual(['A01', 'A02'])
  })

  it('完全匹配优先，其次按命中词数', () => {
    expect(ids(rankScholars(fixture, { ...emptyScholarQuery(), name: '学者' }))).toEqual(['A01', 'A02', 'A03'])
    expect(ids(rankScholars(fixture, { ...emptyScholarQuery(), name: '示例学者乙' }))).toEqual(['A03'])
    expect(ids(rankScholars(fixture, { ...emptyScholarQuery(), name: '甲 乙' }))).toEqual(['A01', 'A02', 'A03'])
  })

  it('按机构、领域过滤', () => {
    expect(ids(rankScholars(fixture, { ...emptyScholarQuery(), institutionIds: ['I02'] }))).toEqual(['A02', 'A03'])
    expect(ids(rankScholars(fixture, { ...emptyScholarQuery(), fieldIds: ['F02'] }))).toEqual(['A03'])
  })
})

describe('工具', () => {
  it('tokenize 去重并规范化', () => {
    expect(tokenize('  Graph  graph Data ')).toEqual(['graph', 'data'])
    expect(tokenize('   ')).toEqual([])
  })

  it('paginate：越界页为空', () => {
    expect(paginate([1, 2, 3], 2, 2)).toEqual([3])
    expect(paginate([1, 2, 3], 3, 2)).toEqual([])
  })
})
