// S-AC-07、S-AC-08、T-AC-02：显示规则。
import { describe, expect, it } from 'vitest'
import {
  MISSING,
  duplicateNames,
  formatAuthors,
  formatCount,
  formatDateTime,
  formatDelta,
  formatList,
  formatRefs,
  formatShare,
  formatText,
  formatYear,
  freshness,
  isDuplicateName,
  isSafeHttpUrl,
  scholarClues,
  sourceLink,
} from './display'

describe('缺失值', () => {
  it('null 为未提供，[] 为无，0 为 0', () => {
    expect(formatCount(null)).toBe(MISSING)
    expect(formatCount(0)).toBe('0')
    expect(formatRefs(null)).toBe(MISSING)
    expect(formatRefs([])).toBe('无')
    expect(formatList(null)).toBe(MISSING)
    expect(formatList([])).toBe('无')
    expect(formatList(['a', 'b'])).toBe('a、b')
  })

  it('文本与年份', () => {
    expect(formatText(null)).toBe(MISSING)
    expect(formatText(undefined)).toBe(MISSING)
    expect(formatText('  ')).toBe(MISSING)
    expect(formatText('x')).toBe('x')
    expect(formatYear(null)).toBe('年份未提供')
    expect(formatYear(2024)).toBe('2024')
  })

  it('引用名称缺失时显示编号', () => {
    expect(formatRefs([{ id: 'I01', name: '甲' }, { id: 'I09', name: null }])).toBe('甲、未提供（I09）')
  })
})

describe('作者', () => {
  const a = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `A${i}`, name: `作者${i}` }))
  it('最多显示 3 位', () => {
    expect(formatAuthors(a(3))).toBe('作者0、作者1、作者2')
    expect(formatAuthors(a(5))).toBe('作者0、作者1、作者2 等 5 人')
    expect(formatAuthors([])).toBe('无')
    expect(formatAuthors([{ id: 'A', name: null }])).toBe('未提供姓名')
  })
})

describe('统计显示', () => {
  it('占比为 null 显示无数据，不显示 0%', () => {
    expect(formatShare(null)).toBe('无数据')
    expect(formatShare(0)).toBe('0.0%')
    expect(formatShare(0.5)).toBe('50.0%')
    expect(formatShare(1 / 3)).toBe('33.3%')
  })

  it('差量为 null 不当作 0', () => {
    expect(formatDelta(null)).toBe('—（上一年无数据）')
    expect(formatDelta(0)).toBe('0')
    expect(formatDelta(2)).toBe('+2')
    expect(formatDelta(-1)).toBe('-1')
  })
})

describe('时间', () => {
  it('按北京时间显示，非法时间为未提供', () => {
    expect(formatDateTime('2026-11-02T08:00:00Z')).toBe('2026-11-02 16:00（北京时间）')
    expect(formatDateTime(null)).toBe(MISSING)
    expect(formatDateTime('not a date')).toBe(MISSING)
  })

  it('freshness：超过阈值为 stale', () => {
    const now = new Date('2026-11-11T00:00:00Z')
    expect(freshness('2026-11-01T00:00:00Z', now)).toBe('fresh')
    expect(freshness('2026-10-01T00:00:00Z', now)).toBe('stale')
    expect(freshness(null, now)).toBe('unknown')
    expect(freshness('bad', now)).toBe('unknown')
    expect(freshness('2026-11-01T00:00:00Z', now, 5)).toBe('stale')
  })
})

describe('原始链接', () => {
  it('只为 http(s) 链接生成可点击链接', () => {
    expect(sourceLink({ name: 'x', url: 'https://example.org/a', linkStatus: 'ok' })).toEqual({
      kind: 'link',
      href: 'https://example.org/a',
      text: '查看原始出处（在新窗口打开）',
    })
    expect(sourceLink({ name: 'x', url: 'javascript:alert(1)', linkStatus: 'ok' }).kind).toBe('text')
    expect(sourceLink({ name: 'x', url: 'https://example.org/a', linkStatus: 'broken' })).toEqual({ kind: 'text', text: '原始链接已失效' })
    expect(sourceLink({ name: 'x', url: null, linkStatus: 'unknown' })).toEqual({ kind: 'text', text: '原始链接未提供' })
  })

  it('isSafeHttpUrl', () => {
    expect(isSafeHttpUrl('http://example.org')).toBe(true)
    expect(isSafeHttpUrl('ftp://example.org')).toBe(false)
    expect(isSafeHttpUrl('not a url')).toBe(false)
  })
})

describe('同名学者', () => {
  it('规范化后相同的姓名被识别为同名', () => {
    const set = duplicateNames([{ name: '示例学者甲' }, { name: ' 示例学者甲' }, { name: 'Li Wei' }, { name: 'li  wei' }, { name: '乙' }])
    expect(isDuplicateName(set, '示例学者甲')).toBe(true)
    expect(isDuplicateName(set, 'LI WEI')).toBe(true)
    expect(isDuplicateName(set, '乙')).toBe(false)
  })

  it('区分线索顺序为研究领域、代表成果、机构', () => {
    const clues = scholarClues({
      id: 'A01',
      name: 'x',
      fields: [{ id: 'F01', name: '图计算' }],
      institutions: [],
      representativeWork: null,
      workCount: 0,
    })
    expect(clues.map((c) => c.label)).toEqual(['研究领域', '代表成果', '机构'])
    expect(clues.map((c) => c.value)).toEqual(['图计算', MISSING, '无'])
  })
})
