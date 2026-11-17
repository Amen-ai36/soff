// 加载状态、错误归类、回跳地址、幂等键、分页、比较与对比度。
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { COLORS, TEXT_PAIRS, UI_PAIRS } from '../styles/tokens'
import { compareCodePoints, normalizeText } from './compare'
import { contrastRatio, relativeLuminance } from './contrast'
import { errorMessage, isAbortError, isRetryable, kindFromStatus, toFailure, ERROR_KINDS } from './errors'
import { classifyPage, initialAsyncState, reduceAsync, versionChangedWhilePaging } from './loadState'
import { pageWindow, totalPages } from './pagination'
import { safeRedirect } from './redirect'
import { nextRequestKey, randomRequestKey } from './requestKey'
import { emptyWorkQuery } from './searchQuery'

describe('reduceAsync', () => {
  it('加载时保留旧数据，失败时清空数据', () => {
    let s = initialAsyncState<number>()
    s = reduceAsync(s, { type: 'resolve', data: 1 })
    s = reduceAsync(s, { type: 'start' })
    expect(s).toEqual({ status: 'loading', data: 1, failure: null })
    const failure = { kind: 'NETWORK' as const, traceId: null, fieldErrors: {} }
    s = reduceAsync(s, { type: 'reject', failure })
    expect(s).toEqual({ status: 'error', data: null, failure })
    expect(reduceAsync(s, { type: 'reset' })).toEqual(initialAsyncState())
  })
})

describe('classifyPage（FS9-LR-03）', () => {
  it('total=0 才是无匹配；total>0 而本页为空是越界', () => {
    expect(classifyPage({ items: [], total: 0 })).toBe('empty')
    expect(classifyPage({ items: [], total: 5 })).toBe('out_of_range')
    expect(classifyPage({ items: [1], total: 5 })).toBe('results')
  })
})

describe('versionChangedWhilePaging', () => {
  const q = emptyWorkQuery()
  it('只翻页且版本变化时提示', () => {
    expect(versionChangedWhilePaging(null, { query: q, dataVersion: 'v1' })).toBe(false)
    expect(versionChangedWhilePaging({ query: q, dataVersion: 'v1' }, { query: { ...q, page: 2 }, dataVersion: 'v2' })).toBe(true)
    expect(versionChangedWhilePaging({ query: q, dataVersion: 'v1' }, { query: { ...q, page: 2 }, dataVersion: 'v1' })).toBe(false)
    expect(versionChangedWhilePaging({ query: q, dataVersion: 'v1' }, { query: { ...q, q: 'x' }, dataVersion: 'v2' })).toBe(false)
  })
})

describe('错误', () => {
  it('状态码映射（成员 8 提案第 3 节）', () => {
    expect([400, 401, 403, 404, 409, 422, 429, 503, 502, 504, 500, 418].map(kindFromStatus)).toEqual([
      'INVALID_INPUT',
      'UNAUTHENTICATED',
      'FORBIDDEN',
      'NOT_FOUND',
      'CONFLICT',
      'INVALID_INPUT',
      'RATE_LIMITED',
      'DEPENDENCY_UNAVAILABLE',
      'DEPENDENCY_UNAVAILABLE',
      'DEPENDENCY_UNAVAILABLE',
      'UNKNOWN',
      'UNKNOWN',
    ])
  })

  it('EX9-R-03：私有上下文中"无权"与"不存在"同一句话', () => {
    expect(errorMessage('NOT_FOUND', 'private')).toBe(errorMessage('FORBIDDEN', 'private'))
    expect(errorMessage('NOT_FOUND', 'public')).not.toBe(errorMessage('FORBIDDEN', 'public'))
  })

  it('每种错误都有文案，空结果文案不在其中', () => {
    for (const kind of ERROR_KINDS) {
      expect(errorMessage(kind)).toBeTruthy()
      expect(errorMessage(kind)).not.toContain('未找到匹配')
    }
  })

  it('只有系统侧错误可重试', () => {
    expect(isRetryable('DEPENDENCY_UNAVAILABLE')).toBe(true)
    expect(isRetryable('TIMEOUT')).toBe(true)
    expect(isRetryable('INVALID_INPUT')).toBe(false)
    expect(isRetryable('FORBIDDEN')).toBe(false)
  })

  it('toFailure 不把未知错误的原文带出', () => {
    expect(toFailure(new Error('stack trace at db.query'))).toEqual({ kind: 'UNKNOWN', traceId: null, fieldErrors: {} })
    expect(toFailure({ kind: 'CONFLICT', traceId: 't1', fieldErrors: { a: 'b' } })).toEqual({ kind: 'CONFLICT', traceId: 't1', fieldErrors: { a: 'b' } })
    expect(toFailure({ kind: 'CONFLICT', traceId: 1, fieldErrors: { a: 1 } })).toEqual({ kind: 'CONFLICT', traceId: null, fieldErrors: {} })
    expect(toFailure(null).kind).toBe('UNKNOWN')
  })

  it('isAbortError', () => {
    expect(isAbortError(new DOMException('x', 'AbortError'))).toBe(true)
    expect(isAbortError(new Error('x'))).toBe(false)
    expect(isAbortError(null)).toBe(false)
  })
})

describe('safeRedirect（开放重定向防护）', () => {
  it.each([
    ['/works?q=1', '/works?q=1'],
    ['/me/claims', '/me/claims'],
    ['//evil.example', '/'],
    ['https://evil.example', '/'],
    ['javascript:alert(1)', '/'],
    ['/\\evil.example', '/'],
    ['/a\nb', '/'],
    ['/login', '/'],
    ['/login?redirect=/x', '/'],
    ['works', '/'],
  ])('%s → %s', (input, expected) => {
    expect(safeRedirect(input)).toBe(expected)
  })

  it('非字符串与数组', () => {
    expect(safeRedirect(undefined)).toBe('/')
    expect(safeRedirect(['/stats', '/x'])).toBe('/stats')
    expect(safeRedirect(42, '/home')).toBe('/home')
  })
})

describe('requestKey', () => {
  it('内容不变复用同一个键，内容变化生成新键', () => {
    let n = 0
    const gen = () => `k${++n}`
    const a = nextRequestKey(null, 'f1', gen)
    expect(nextRequestKey(a, 'f1', gen)).toBe(a)
    expect(nextRequestKey(a, 'f2', gen)).toEqual({ fingerprint: 'f2', key: 'k2' })
  })

  it('randomRequestKey 生成 UUID 格式', () => {
    expect(randomRequestKey()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('randomUUID 不可用时用 getRandomValues 生成 v4 UUID', () => {
    const original = globalThis.crypto.randomUUID
    Object.defineProperty(globalThis.crypto, 'randomUUID', { value: undefined, configurable: true })
    try {
      const key = randomRequestKey()
      expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
      expect(randomRequestKey()).not.toBe(key)
    } finally {
      Object.defineProperty(globalThis.crypto, 'randomUUID', { value: original, configurable: true })
    }
  })
})

describe('分页', () => {
  it('totalPages 至少为 1', () => {
    expect(totalPages(0, 20)).toBe(1)
    expect(totalPages(41, 20)).toBe(3)
  })

  it('pageWindow 保留首末页并用 gap 表示省略', () => {
    expect(pageWindow(1, 1)).toEqual([1])
    expect(pageWindow(5, 10)).toEqual([1, 'gap', 3, 4, 5, 6, 7, 'gap', 10])
    expect(pageWindow(2, 4)).toEqual([1, 2, 3, 4])
  })
})

describe('compare', () => {
  it('normalizeText：NFKC、空白、拉丁小写', () => {
    expect(normalizeText('  Graph　 Methods ')).toBe('graph methods')
    expect(normalizeText('ＡＢＣ')).toBe('abc')
  })

  it('compareCodePoints 按码点而非 UTF-16 码元比较', () => {
    expect(compareCodePoints('A', 'B')).toBe(-1)
    expect(compareCodePoints('B', 'A')).toBe(1)
    expect(compareCodePoints('A', 'A')).toBe(0)
    expect(compareCodePoints('A', 'AB')).toBe(-1)
    expect(compareCodePoints('AB', 'A')).toBe(1)
    // U+FF61 在码点上小于 U+1F600，但 UTF-16 码元比较结果相反。
    expect(compareCodePoints('｡', '\u{1f600}')).toBe(-1)
    expect('｡' < '\u{1f600}').toBe(false)
  })
})

describe('颜色对比度（UI9-A11Y-05）', () => {
  it('WCAG 公式基准值', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrastRatio('#fff', '#fff')).toBe(1)
    expect(relativeLuminance('#ffffff')).toBe(1)
    expect(() => relativeLuminance('red')).toThrow()
  })

  it.each(TEXT_PAIRS)('文字 %s / 背景 %s ≥ 4.5', (fg, bg) => {
    expect(contrastRatio(COLORS[fg], COLORS[bg])).toBeGreaterThanOrEqual(4.5)
  })

  it.each(UI_PAIRS)('界面元素 %s / 背景 %s ≥ 3', (fg, bg) => {
    expect(contrastRatio(COLORS[fg], COLORS[bg])).toBeGreaterThanOrEqual(3)
  })

  it('main.css 中的变量与令牌一致', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles/main.css'), 'utf8')
    for (const [name, value] of Object.entries(COLORS)) {
      const variable = `--color-${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`
      expect(css, variable).toContain(`${variable}: ${value};`)
    }
  })
})
