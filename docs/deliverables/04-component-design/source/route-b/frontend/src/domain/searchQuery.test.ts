// S-AC-01、S-AC-02：URL 参数解析、校验与修改规则（SPEC-M9-SEARCH-UI 第 2～4 节）。
import { describe, expect, it } from 'vitest'
import {
  MESSAGES,
  clearFilters,
  differsOnlyByPage,
  emptyScholarQuery,
  emptyWorkQuery,
  hasFilters,
  parseScholarQuery,
  parseWorkQuery,
  parseYear,
  removeFilter,
  serializeScholarQuery,
  serializeWorkQuery,
  updateScholarQuery,
  updateWorkQuery,
  validateYearRange,
} from './searchQuery'
import type { WorkQuery } from './types'

const full: WorkQuery = {
  q: '图 计算',
  types: ['paper', 'award'],
  yearFrom: 2020,
  yearTo: 2025,
  fieldIds: ['F01', 'F02'],
  institutionIds: ['I01'],
  sort: 'year_desc',
  page: 3,
  pageSize: 50,
}

describe('parseWorkQuery', () => {
  it('空参数得到默认查询且无错误', () => {
    expect(parseWorkQuery({})).toEqual({ query: emptyWorkQuery(), errors: {} })
  })

  it('解析全部合法参数，并去除首尾空白与重复值', () => {
    const { query, errors } = parseWorkQuery({
      q: '  图 计算 ',
      type: ['paper', 'award', 'paper'],
      from: '2020',
      to: '2025',
      field: ['F01', ' F02 ', 'F01', ''],
      inst: 'I01',
      sort: 'year_desc',
      page: '3',
      size: '50',
    })
    expect(errors).toEqual({})
    expect(query).toEqual(full)
  })

  it('忽略 null 值，单值与数组形式等价', () => {
    expect(parseWorkQuery({ type: [null, 'patent'], q: null }).query.types).toEqual(['patent'])
    expect(parseWorkQuery({ type: 'patent' }).query.types).toEqual(['patent'])
  })

  it.each([
    [{ q: 'x'.repeat(201) }, 'q', MESSAGES.keywordTooLong],
    [{ type: 'book' }, 'types', MESSAGES.unknownType],
    [{ from: '999' }, 'yearFrom', MESSAGES.yearInvalid],
    [{ to: '10000' }, 'yearTo', MESSAGES.yearInvalid],
    [{ from: '2020.5' }, 'yearFrom', MESSAGES.yearInvalid],
    [{ from: 'abc' }, 'yearFrom', MESSAGES.yearInvalid],
    [{ from: '2025', to: '2024' }, 'yearTo', MESSAGES.yearOrder],
    [{ sort: 'citations' }, 'sort', MESSAGES.sortInvalid],
    [{ page: '0' }, 'page', MESSAGES.pageInvalid],
    [{ page: '-1' }, 'page', MESSAGES.pageInvalid],
    [{ page: '1.5' }, 'page', MESSAGES.pageInvalid],
    [{ size: '0' }, 'pageSize', MESSAGES.pageSizeInvalid],
    [{ size: '101' }, 'pageSize', MESSAGES.pageSizeInvalid],
  ])('非法参数 %o 产生字段错误', (raw, key, message) => {
    expect(parseWorkQuery(raw).errors[key]).toBe(message)
  })

  it('恰好 200 个字符、年份边界值合法', () => {
    expect(parseWorkQuery({ q: 'x'.repeat(200), from: '1000', to: '9999', size: '100' }).errors).toEqual({})
  })

  it('空排序参数视为默认', () => {
    expect(parseWorkQuery({ sort: '' })).toEqual({ query: emptyWorkQuery(), errors: {} })
  })
})

describe('serializeWorkQuery', () => {
  it('默认查询序列化为空对象，URL 保持简短', () => {
    expect(serializeWorkQuery(emptyWorkQuery())).toEqual({})
  })

  it('R4：解析与序列化互逆', () => {
    expect(parseWorkQuery(serializeWorkQuery(full)).query).toEqual(full)
    const partial = { ...emptyWorkQuery(), yearTo: 2024, q: 'graph' }
    expect(parseWorkQuery(serializeWorkQuery(partial)).query).toEqual(partial)
  })
})

describe('修改条件', () => {
  it('R1：改筛选或排序后回到第 1 页', () => {
    expect(updateWorkQuery(full, { types: ['patent'] }).page).toBe(1)
    expect(updateWorkQuery(full, { sort: 'relevance' }).page).toBe(1)
    expect(updateWorkQuery(full, { q: '新词' }).page).toBe(1)
  })

  it('R1：单独翻页保留新页码', () => {
    expect(updateWorkQuery(full, { page: 7 }).page).toBe(7)
  })

  it('R2：移除单个筛选保留关键词与其他筛选', () => {
    const next = removeFilter(full, 'types', 'paper')
    expect(next.types).toEqual(['award'])
    expect(next.q).toBe(full.q)
    expect(next.fieldIds).toEqual(full.fieldIds)
    expect(next.page).toBe(1)
    expect(removeFilter(full, 'fieldIds', 'F01').fieldIds).toEqual(['F02'])
    expect(removeFilter(full, 'institutionIds', 'I01').institutionIds).toEqual([])
    const noYears = removeFilter(full, 'years')
    expect([noYears.yearFrom, noYears.yearTo]).toEqual([null, null])
  })

  it('R3：清除全部筛选保留关键词与排序', () => {
    const next = clearFilters(full)
    expect(hasFilters(next)).toBe(false)
    expect(next.q).toBe(full.q)
    expect(next.sort).toBe(full.sort)
    expect(next.page).toBe(1)
  })

  it('hasFilters 识别任一筛选', () => {
    expect(hasFilters(emptyWorkQuery())).toBe(false)
    expect(hasFilters({ ...emptyWorkQuery(), yearTo: 2020 })).toBe(true)
    expect(hasFilters({ ...emptyWorkQuery(), institutionIds: ['I01'] })).toBe(true)
  })

  it('differsOnlyByPage 只在仅页码不同时为真', () => {
    expect(differsOnlyByPage(full, { ...full, page: 4 })).toBe(true)
    expect(differsOnlyByPage(full, full)).toBe(false)
    expect(differsOnlyByPage(full, { ...full, page: 4, q: '别的' })).toBe(false)
  })
})

describe('年份工具', () => {
  it('parseYear', () => {
    expect(parseYear(null)).toEqual({ value: null, error: null })
    expect(parseYear('  ')).toEqual({ value: null, error: null })
    expect(parseYear(' 2024 ')).toEqual({ value: 2024, error: null })
    expect(parseYear('99999999999999999999').error).toBe(MESSAGES.yearInvalid)
  })

  it('validateYearRange 允许只填一端', () => {
    expect(validateYearRange('2020', '')).toEqual({ yearFrom: 2020, yearTo: null, errors: {} })
  })
})

describe('学者查询', () => {
  it('解析、校验与互逆', () => {
    const { query, errors } = parseScholarQuery({ name: ' 示例学者甲 ', field: 'F01', inst: ['I02'], page: '2', size: '10' })
    expect(errors).toEqual({})
    expect(query).toEqual({ name: '示例学者甲', fieldIds: ['F01'], institutionIds: ['I02'], page: 2, pageSize: 10 })
    expect(parseScholarQuery(serializeScholarQuery(query)).query).toEqual(query)
    expect(serializeScholarQuery(emptyScholarQuery())).toEqual({})
  })

  it('学者检索不接受排序参数（SPEC-M8-SEARCH 第 6 条）', () => {
    expect(parseScholarQuery({ sort: 'year_desc' }).errors.sort).toBeDefined()
  })

  it('修改姓名回到第 1 页，单独翻页保留', () => {
    const q = { ...emptyScholarQuery(), page: 3 }
    expect(updateScholarQuery(q, { name: 'x' }).page).toBe(1)
    expect(updateScholarQuery(q, { page: 5 }).page).toBe(5)
  })
})
