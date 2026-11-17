// 模拟实现中的检索：按 SPEC-M8-SEARCH v0.1 基线编写，用于前端开发与测试。服务端实现以成员 3、8 为准。
// 本文件对 SPEC 的解释：
// - 词命中按规范化后的子串判断（SPEC 第 2 条"中文按连续子串匹配"，拉丁词这里也按子串处理）。
// - 成果：每个词须至少命中题名、关键词、摘要之一（AND）。
// - 学者：至少命中一个词即入选，再按命中词数排序（SPEC 第 6 条"按不同 token 命中数降序"）。

import { compareCodePoints, normalizeText } from '../../domain/compare'
import type { ScholarQuery, WorkQuery } from '../../domain/types'
import type { MockDataset, MockScholar, MockWork } from './dataset'

export function tokenize(q: string): string[] {
  const n = normalizeText(q)
  return n === '' ? [] : [...new Set(n.split(' '))]
}

interface ScoredWork {
  work: MockWork
  exact: boolean
  score: number
}

function scoreWork(work: MockWork, tokens: string[], normalizedQuery: string): ScoredWork | null {
  const title = normalizeText(work.title)
  const keywords = work.keywords.map(normalizeText)
  const abstract = normalizeText(work.abstract)
  let score = 0
  for (const t of tokens) {
    const inTitle = title.includes(t)
    const inKeywords = keywords.some((k) => k.includes(t))
    const inAbstract = abstract.includes(t)
    if (!inTitle && !inKeywords && !inAbstract) return null
    // 每个不同的词在每个字段最多计一次（SPEC 第 5 条）。
    score += (inTitle ? 5 : 0) + (inKeywords ? 3 : 0) + (inAbstract ? 1 : 0)
  }
  // 空查询不计完全相等奖励。
  return { work, exact: normalizedQuery !== '' && title === normalizedQuery, score }
}

export function matchesWorkFilters(work: MockWork, q: Pick<WorkQuery, 'types' | 'yearFrom' | 'yearTo' | 'fieldIds' | 'institutionIds'>): boolean {
  if (!work.public) return false
  if (q.types.length > 0 && !q.types.includes(work.type)) return false
  if (q.yearFrom !== null || q.yearTo !== null) {
    // 时间过滤排除未知年份（SPEC 第 4 条）。
    if (work.year === null) return false
    if (q.yearFrom !== null && work.year < q.yearFrom) return false
    if (q.yearTo !== null && work.year > q.yearTo) return false
  }
  if (q.fieldIds.length > 0 && !work.fieldIds.some((f) => q.fieldIds.includes(f))) return false
  if (q.institutionIds.length > 0 && !work.institutionIds.some((i) => q.institutionIds.includes(i))) return false
  return true
}

/** 年份降序，未知年份在末尾。 */
export function compareYearDesc(a: { year: number | null }, b: { year: number | null }): number {
  if (a.year === b.year) return 0
  if (a.year === null) return 1
  if (b.year === null) return -1
  return b.year - a.year
}

function compareYearAsc(a: { year: number | null }, b: { year: number | null }): number {
  if (a.year === b.year) return 0
  if (a.year === null) return 1
  if (b.year === null) return -1
  return a.year - b.year
}

export function rankWorks(dataset: MockDataset, query: WorkQuery): MockWork[] {
  const tokens = tokenize(query.q)
  const normalizedQuery = normalizeText(query.q)
  const scored: ScoredWork[] = []
  for (const work of dataset.works) {
    if (!matchesWorkFilters(work, query)) continue
    const s = scoreWork(work, tokens, normalizedQuery)
    if (s !== null) scored.push(s)
  }
  const byId = (x: ScoredWork, y: ScoredWork) => compareCodePoints(x.work.id, y.work.id)
  if (query.sort === 'year_desc') scored.sort((x, y) => compareYearDesc(x.work, y.work) || byId(x, y))
  else if (query.sort === 'year_asc') scored.sort((x, y) => compareYearAsc(x.work, y.work) || byId(x, y))
  else {
    scored.sort(
      (x, y) =>
        Number(y.exact) - Number(x.exact) || y.score - x.score || compareYearDesc(x.work, y.work) || byId(x, y),
    )
  }
  return scored.map((s) => s.work)
}

export function rankScholars(dataset: MockDataset, query: ScholarQuery): MockScholar[] {
  const tokens = tokenize(query.name)
  const normalizedQuery = normalizeText(query.name)
  const rows: { scholar: MockScholar; exact: boolean; hits: number }[] = []
  for (const s of dataset.scholars) {
    if (query.fieldIds.length > 0 && !s.fieldIds.some((f) => query.fieldIds.includes(f))) continue
    if (query.institutionIds.length > 0 && !s.institutionIds.some((i) => query.institutionIds.includes(i))) continue
    const name = normalizeText(s.name)
    const hits = tokens.filter((t) => name.includes(t)).length
    if (tokens.length > 0 && hits === 0) continue
    rows.push({ scholar: s, exact: normalizedQuery !== '' && name === normalizedQuery, hits })
  }
  rows.sort(
    (x, y) => Number(y.exact) - Number(x.exact) || y.hits - x.hits || compareCodePoints(x.scholar.id, y.scholar.id),
  )
  return rows.map((r) => r.scholar)
}

export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  return items.slice((page - 1) * pageSize, page * pageSize)
}
