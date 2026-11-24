// 检索条件与 URL 参数的互相转换、校验和修改规则。
// 依据：SPEC-M9-SEARCH-UI 第 2～4 节；ADR-M9-03；IA9-RULE-03、04、05。

import { WORK_SORTS, WORK_TYPES } from './types'
import type { ScholarQuery, WorkQuery, WorkSort, WorkType } from './types'

export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100
export const MAX_KEYWORD_LENGTH = 200
export const MIN_YEAR = 1000
export const MAX_YEAR = 9999

/** 与 vue-router 的 LocationQuery 兼容。 */
export type RawQuery = Record<string, string | null | (string | null)[] | undefined>
export type UrlQuery = Record<string, string | string[]>

export interface Parsed<T> {
  query: T
  errors: Record<string, string>
}

export const MESSAGES = {
  keywordTooLong: `关键词不能超过 ${MAX_KEYWORD_LENGTH} 个字符`,
  unknownType: '包含未知的成果类型',
  yearInvalid: `年份应为 ${MIN_YEAR} 到 ${MAX_YEAR} 之间的整数`,
  yearOrder: '起始年份不能晚于结束年份',
  sortInvalid: '不支持的排序方式',
  pageInvalid: '页码应为不小于 1 的整数',
  pageSizeInvalid: `每页条数应为 1 到 ${MAX_PAGE_SIZE} 之间的整数`,
} as const

export function emptyWorkQuery(): WorkQuery {
  return {
    q: '',
    types: [],
    yearFrom: null,
    yearTo: null,
    fieldIds: [],
    institutionIds: [],
    sort: 'relevance',
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  }
}

export function emptyScholarQuery(): ScholarQuery {
  return { name: '', fieldIds: [], institutionIds: [], page: 1, pageSize: DEFAULT_PAGE_SIZE }
}

function values(raw: RawQuery, key: string): string[] {
  const v = raw[key]
  if (v === undefined || v === null) return []
  const list = Array.isArray(v) ? v : [v]
  return list.filter((x): x is string => typeof x === 'string')
}

function first(raw: RawQuery, key: string): string | null {
  const list = values(raw, key)
  return list.length > 0 ? list[0]! : null
}

function uniqueNonEmpty(list: string[]): string[] {
  const out: string[] = []
  for (const item of list) {
    const t = item.trim()
    if (t !== '' && !out.includes(t)) out.push(t)
  }
  return out
}

function parseIntStrict(text: string): number | null {
  const t = text.trim()
  if (!/^-?\d+$/.test(t)) return null
  const n = Number(t)
  return Number.isSafeInteger(n) ? n : null
}

/** 年份文本 → 数值；空文本为 null；非法时返回 error。 */
export function parseYear(text: string | null): { value: number | null; error: string | null } {
  if (text === null || text.trim() === '') return { value: null, error: null }
  const n = parseIntStrict(text)
  if (n === null || n < MIN_YEAR || n > MAX_YEAR) return { value: null, error: MESSAGES.yearInvalid }
  return { value: n, error: null }
}

/** 校验年份区间。错误键为 yearFrom / yearTo。供 URL 解析和筛选面板共用。 */
export function validateYearRange(
  fromText: string | null,
  toText: string | null,
): { yearFrom: number | null; yearTo: number | null; errors: Record<string, string> } {
  const errors: Record<string, string> = {}
  const from = parseYear(fromText)
  const to = parseYear(toText)
  if (from.error) errors.yearFrom = from.error
  if (to.error) errors.yearTo = to.error
  if (from.value !== null && to.value !== null && from.value > to.value) errors.yearTo = MESSAGES.yearOrder
  return { yearFrom: from.value, yearTo: to.value, errors }
}

function parseKeyword(text: string | null, errors: Record<string, string>, key: string): string {
  const q = (text ?? '').trim()
  if (q.length > MAX_KEYWORD_LENGTH) errors[key] = MESSAGES.keywordTooLong
  return q
}

function parsePaging(raw: RawQuery, errors: Record<string, string>): { page: number; pageSize: number } {
  let page = 1
  let pageSize = DEFAULT_PAGE_SIZE
  const pageText = first(raw, 'page')
  if (pageText !== null) {
    const n = parseIntStrict(pageText)
    if (n === null || n < 1) errors.page = MESSAGES.pageInvalid
    else page = n
  }
  const sizeText = first(raw, 'size')
  if (sizeText !== null) {
    const n = parseIntStrict(sizeText)
    if (n === null || n < 1 || n > MAX_PAGE_SIZE) errors.pageSize = MESSAGES.pageSizeInvalid
    else pageSize = n
  }
  return { page, pageSize }
}

export function parseWorkQuery(raw: RawQuery): Parsed<WorkQuery> {
  const errors: Record<string, string> = {}
  const q = parseKeyword(first(raw, 'q'), errors, 'q')

  const types: WorkType[] = []
  for (const t of uniqueNonEmpty(values(raw, 'type'))) {
    if ((WORK_TYPES as readonly string[]).includes(t)) types.push(t as WorkType)
    else errors.types = MESSAGES.unknownType
  }

  const years = validateYearRange(first(raw, 'from'), first(raw, 'to'))
  Object.assign(errors, years.errors)

  let sort: WorkSort = 'relevance'
  const sortText = first(raw, 'sort')
  if (sortText !== null && sortText !== '') {
    if ((WORK_SORTS as readonly string[]).includes(sortText)) sort = sortText as WorkSort
    else errors.sort = MESSAGES.sortInvalid
  }

  const { page, pageSize } = parsePaging(raw, errors)

  return {
    query: {
      q,
      types,
      yearFrom: years.yearFrom,
      yearTo: years.yearTo,
      fieldIds: uniqueNonEmpty(values(raw, 'field')),
      institutionIds: uniqueNonEmpty(values(raw, 'inst')),
      sort,
      page,
      pageSize,
    },
    errors,
  }
}

/** 只写入非默认值，保持 URL 简短；与 parseWorkQuery 互逆。 */
export function serializeWorkQuery(query: WorkQuery): UrlQuery {
  const out: UrlQuery = {}
  if (query.q !== '') out.q = query.q
  if (query.types.length > 0) out.type = [...query.types]
  if (query.yearFrom !== null) out.from = String(query.yearFrom)
  if (query.yearTo !== null) out.to = String(query.yearTo)
  if (query.fieldIds.length > 0) out.field = [...query.fieldIds]
  if (query.institutionIds.length > 0) out.inst = [...query.institutionIds]
  if (query.sort !== 'relevance') out.sort = query.sort
  if (query.page !== 1) out.page = String(query.page)
  if (query.pageSize !== DEFAULT_PAGE_SIZE) out.size = String(query.pageSize)
  return out
}

/** R1：除单独翻页外，任何条件变化后回到第 1 页。 */
export function updateWorkQuery(query: WorkQuery, patch: Partial<WorkQuery>): WorkQuery {
  const onlyPage = Object.keys(patch).every((k) => k === 'page')
  return { ...query, ...patch, page: onlyPage ? (patch.page ?? query.page) : 1 }
}

export type FilterKey = 'types' | 'fieldIds' | 'institutionIds' | 'years'

/** R2：移除一个筛选值，关键词与其他筛选保留，回到第 1 页。 */
export function removeFilter(query: WorkQuery, key: FilterKey, value?: string): WorkQuery {
  switch (key) {
    case 'years':
      return updateWorkQuery(query, { yearFrom: null, yearTo: null })
    case 'types':
      return updateWorkQuery(query, { types: query.types.filter((t) => t !== value) })
    case 'fieldIds':
      return updateWorkQuery(query, { fieldIds: query.fieldIds.filter((t) => t !== value) })
    case 'institutionIds':
      return updateWorkQuery(query, { institutionIds: query.institutionIds.filter((t) => t !== value) })
  }
}

/** R3：清除全部筛选，保留关键词与排序。 */
export function clearFilters(query: WorkQuery): WorkQuery {
  return updateWorkQuery(query, { types: [], yearFrom: null, yearTo: null, fieldIds: [], institutionIds: [] })
}

export function hasFilters(query: WorkQuery): boolean {
  return (
    query.types.length > 0 ||
    query.yearFrom !== null ||
    query.yearTo !== null ||
    query.fieldIds.length > 0 ||
    query.institutionIds.length > 0
  )
}

/** 两次查询是否只有页码不同（用于判断"翻页时数据已更新"）。 */
export function differsOnlyByPage(a: WorkQuery | ScholarQuery, b: WorkQuery | ScholarQuery): boolean {
  if (a.page === b.page) return false
  return JSON.stringify({ ...a, page: 0 }) === JSON.stringify({ ...b, page: 0 })
}

export function parseScholarQuery(raw: RawQuery): Parsed<ScholarQuery> {
  const errors: Record<string, string> = {}
  const name = parseKeyword(first(raw, 'name'), errors, 'name')
  if (first(raw, 'sort') !== null) errors.sort = '学者检索不支持排序参数'
  const { page, pageSize } = parsePaging(raw, errors)
  return {
    query: {
      name,
      fieldIds: uniqueNonEmpty(values(raw, 'field')),
      institutionIds: uniqueNonEmpty(values(raw, 'inst')),
      page,
      pageSize,
    },
    errors,
  }
}

export function serializeScholarQuery(query: ScholarQuery): UrlQuery {
  const out: UrlQuery = {}
  if (query.name !== '') out.name = query.name
  if (query.fieldIds.length > 0) out.field = [...query.fieldIds]
  if (query.institutionIds.length > 0) out.inst = [...query.institutionIds]
  if (query.page !== 1) out.page = String(query.page)
  if (query.pageSize !== DEFAULT_PAGE_SIZE) out.size = String(query.pageSize)
  return out
}

export function updateScholarQuery(query: ScholarQuery, patch: Partial<ScholarQuery>): ScholarQuery {
  const onlyPage = Object.keys(patch).every((k) => k === 'page')
  return { ...query, ...patch, page: onlyPage ? (patch.page ?? query.page) : 1 }
}
