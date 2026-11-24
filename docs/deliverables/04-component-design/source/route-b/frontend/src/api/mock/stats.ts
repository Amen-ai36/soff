// 模拟实现中的统计：按 SPEC-M8-STATS v0.1 第 1～6 条编写。服务端实现以成员 3、8 为准。

import { compareCodePoints } from '../../domain/compare'
import type {
  CollabEdge,
  CollabFilter,
  Collaborations,
  FieldDistribution,
  HotspotRow,
  HotspotYear,
  Hotspots,
  InstitutionRanking,
  Ref,
  StatsFilter,
  StatsMeta,
  TypeDistribution,
} from '../../domain/types'
import { WORK_TYPES } from '../../domain/types'
import type { MockDataset, MockWork } from './dataset'
import { matchesWorkFilters } from './search'

function share(count: number, denominator: number): number | null {
  return denominator === 0 ? null : count / denominator
}

function refName(list: Ref[], id: string): Ref {
  return list.find((r) => r.id === id) ?? { id, name: null }
}

/** 统计范围 S：公开、按类型与年份过滤后的规范成果（夹具中成果 ID 已去重）。 */
export function statsScope(dataset: MockDataset, filter: StatsFilter): MockWork[] {
  return dataset.works.filter((w) =>
    matchesWorkFilters(w, { types: filter.types, yearFrom: filter.yearFrom, yearTo: filter.yearTo, fieldIds: [], institutionIds: [] }),
  )
}

function meta(dataset: MockDataset, denominator: number, unknownCount: number, countingRule: string): StatsMeta {
  return { denominator, unknownCount, countingRule, dataVersion: dataset.dataVersion, updatedAt: dataset.updatedAt }
}

export function typeDistribution(dataset: MockDataset, filter: StatsFilter): TypeDistribution {
  const scope = statsScope(dataset, filter)
  const groups = WORK_TYPES.map((type) => {
    const count = scope.filter((w) => w.type === type).length
    return { type, count, share: share(count, scope.length) }
  })
  return { ...meta(dataset, scope.length, 0, '四类互斥，每条成果计一次，各类之和等于分母'), groups }
}

/** 并列同名次，后续跳号（1、1、3）；展示按数量降序、ID 升序。 */
export function institutionRanking(dataset: MockDataset, filter: StatsFilter): InstitutionRanking {
  const scope = statsScope(dataset, filter)
  const counts = new Map<string, number>()
  let unknown = 0
  for (const w of scope) {
    const ids = new Set(w.institutionIds)
    if (ids.size === 0) unknown++
    for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  const sorted = [...counts].sort(([a, x], [b, y]) => y - x || compareCodePoints(a, b))
  const rows = sorted.map(([id, count]) => ({
    rank: 1 + sorted.filter(([, c]) => c > count).length,
    institution: refName(dataset.institutions, id),
    count,
  }))
  return {
    ...meta(dataset, scope.length, unknown, '多机构成果在每个机构各计一次，各机构合计可能超过成果总数'),
    rows,
  }
}

export function fieldDistribution(dataset: MockDataset, filter: StatsFilter): FieldDistribution {
  const scope = statsScope(dataset, filter)
  const counts = new Map<string, number>()
  let unknown = 0
  for (const w of scope) {
    const ids = new Set(w.fieldIds)
    if (ids.size === 0) unknown++
    for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  const rows = [...counts]
    .sort(([a, x], [b, y]) => y - x || compareCodePoints(a, b))
    .map(([id, count]) => ({ field: refName(dataset.fields, id), count, share: share(count, scope.length) }))
  return { ...meta(dataset, scope.length, unknown, '多领域成果在每个领域各计一次，占比之和可能超过 100%'), rows }
}

export function hotspots(dataset: MockDataset, filter: StatsFilter): Hotspots {
  const scope = statsScope(dataset, filter)
  const byYear = new Map<number, Map<string, number>>()
  const denominators = new Map<number, number>()
  let unknownYear = 0
  for (const w of scope) {
    if (w.year === null) {
      unknownYear++
      continue
    }
    denominators.set(w.year, (denominators.get(w.year) ?? 0) + 1)
    const counts = byYear.get(w.year) ?? new Map<string, number>()
    for (const f of new Set(w.fieldIds)) counts.set(f, (counts.get(f) ?? 0) + 1)
    byYear.set(w.year, counts)
  }
  const years: HotspotYear[] = [...denominators.keys()]
    .sort((a, b) => a - b)
    .map((year) => {
      const denominator = denominators.get(year)!
      const counts = byYear.get(year)!
      const prevExists = denominators.has(year - 1)
      const prev = byYear.get(year - 1)
      const rows: HotspotRow[] = [...counts]
        .sort(([a, x], [b, y]) => y - x || compareCodePoints(a, b))
        .map(([id, count]) => ({
          field: refName(dataset.fields, id),
          count,
          share: share(count, denominator),
          // 上一年没有任何记录时差量为 null，不用缺失年份补 0（SPEC 第 5 条）。
          delta: prevExists ? count - (prev?.get(id) ?? 0) : null,
        }))
      return { year, denominator, rows }
    })
  return { ...meta(dataset, scope.length, unknownYear, '按年份统计，分母为当年成果数；年份未知的记录单列'), years }
}

export function collaborations(dataset: MockDataset, filter: CollabFilter): Collaborations {
  const scope = dataset.works.filter((w) =>
    matchesWorkFilters(w, { types: [], yearFrom: null, yearTo: null, fieldIds: filter.fieldIds, institutionIds: filter.institutionIds }),
  )
  const edges = new Map<string, CollabEdge>()
  const nodeIds = new Set<string>()
  let unknown = 0
  for (const w of scope) {
    const ids = [...new Set(w.scholarIds)].sort(compareCodePoints)
    if (ids.length === 0) unknown++
    ids.forEach((id) => nodeIds.add(id))
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const key = `${ids[i]}\u0000${ids[j]}`
        const edge = edges.get(key) ?? { a: ids[i]!, b: ids[j]!, weight: 0, workIds: [] }
        edge.workIds.push(w.id)
        edge.weight = edge.workIds.length
        edges.set(key, edge)
      }
    }
  }
  const nodes = [...nodeIds].sort(compareCodePoints).map((id) => ({
    id,
    name: dataset.scholars.find((s) => s.id === id)?.name ?? null,
  }))
  const edgeList = [...edges.values()].sort((x, y) => y.weight - x.weight || compareCodePoints(x.a, y.a) || compareCodePoints(x.b, y.b))
  return {
    ...meta(dataset, scope.length, unknown, '每对学者按共同成果去重计权；不生成自环；同机构不视为合作'),
    nodes,
    edges: edgeList,
  }
}
