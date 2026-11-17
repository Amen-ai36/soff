// T-AC-01：模拟统计与 SPEC-M8-STATS"小规模可复核样例"一致。
import { describe, expect, it } from 'vitest'
import { fixtureDataset } from './dataset'
import { collaborations, fieldDistribution, hotspots, institutionRanking, typeDistribution } from './stats'

const ds = fixtureDataset()
const all = { types: [], yearFrom: null, yearTo: null }

describe('SPEC-M8-STATS 样例', () => {
  it('类型分布：公开 4 条，每类各 1，W05 非公开排除', () => {
    const t = typeDistribution(ds, all)
    expect(t.denominator).toBe(4)
    expect(t.groups.map((g) => [g.type, g.count, g.share])).toEqual([
      ['paper', 1, 0.25],
      ['patent', 1, 0.25],
      ['project', 1, 0.25],
      ['award', 1, 0.25],
    ])
    expect(t.dataVersion).toBe('synthetic-v1')
  })

  it('机构排名：I01=2、I02=2 并列第 1，无机构 1 条', () => {
    const r = institutionRanking(ds, all)
    expect(r.rows.map((x) => [x.rank, x.institution.id, x.count])).toEqual([
      [1, 'I01', 2],
      [1, 'I02', 2],
    ])
    expect(r.unknownCount).toBe(1)
  })

  it('并列后续跳号（1、1、3）', () => {
    const extra = fixtureDataset()
    extra.works.push({ ...extra.works[2]!, id: 'W90', institutionIds: ['I03'], public: true })
    extra.works.push({ ...extra.works[2]!, id: 'W91', institutionIds: ['I01'], public: true })
    expect(institutionRanking(extra, all).rows.map((x) => [x.rank, x.institution.id, x.count])).toEqual([
      [1, 'I01', 3],
      [2, 'I02', 2],
      [3, 'I03', 1],
    ])
    const tie = fixtureDataset()
    tie.works.push({ ...tie.works[2]!, id: 'W92', institutionIds: ['I03'], public: true })
    expect(institutionRanking(tie, all).rows.map((x) => x.rank)).toEqual([1, 1, 3])
  })

  it('领域分布：F01=2、F02=1，无领域 1 条', () => {
    const f = fieldDistribution(ds, all)
    expect(f.rows.map((x) => [x.field.id, x.count, x.share])).toEqual([
      ['F01', 2, 0.5],
      ['F02', 1, 0.25],
    ])
    expect(f.unknownCount).toBe(1)
  })

  it('合作关系：A01—A02 共享 W01、W02，边权为 2；W01 中重复的 A01 只计一次', () => {
    const c = collaborations(ds, { fieldIds: [], institutionIds: [] })
    expect(c.edges).toEqual([{ a: 'A01', b: 'A02', weight: 2, workIds: ['W01', 'W02'] }])
    expect(c.nodes.map((n) => n.id)).toEqual(['A01', 'A02', 'A03'])
    expect(c.unknownCount).toBe(1)
  })

  it('领域热点：2024 年 F01/F02 各 50%；2025 年 F01 100%；年份未知 1 条', () => {
    const h = hotspots(ds, all)
    expect(h.unknownCount).toBe(1)
    expect(h.years.map((y) => [y.year, y.denominator, y.rows.map((r) => [r.field.id, r.count, r.share, r.delta])])).toEqual([
      [2024, 2, [['F01', 1, 0.5, null], ['F02', 1, 0.5, null]]],
      [2025, 1, [['F01', 1, 1, 0]]],
    ])
  })

  it('空集合时占比为 null，不算 0/0', () => {
    const t = typeDistribution(ds, { types: [], yearFrom: 2030, yearTo: 2031 })
    expect(t.denominator).toBe(0)
    expect(t.groups.every((g) => g.count === 0 && g.share === null)).toBe(true)
  })

  it('过滤范围与检索一致', () => {
    expect(typeDistribution(ds, { types: ['paper'], yearFrom: null, yearTo: null }).denominator).toBe(1)
    expect(collaborations(ds, { fieldIds: ['F02'], institutionIds: [] }).edges).toEqual([])
  })
})
