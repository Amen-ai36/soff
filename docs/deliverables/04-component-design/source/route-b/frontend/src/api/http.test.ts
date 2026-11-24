// HTTP 实现：请求构造、命名转换、错误归类、超时与取消（架构文档 02 第 2～5、7、8 节）。
import { afterEach, describe, expect, it } from 'vitest'
import { emptyWorkQuery } from '../domain/searchQuery'
import { ApiError } from './errors'
import { HttpApiClient, buildQuery } from './http'

interface Call {
  url: string
  init: RequestInit
}

function fakeFetch(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const calls: Call[] = []
  const fn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} })
    return handler(String(input), init ?? {})
  }) as typeof fetch
  return { fn, calls }
}

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } })
}

function headersOf(call: Call): Record<string, string> {
  return call.init.headers as Record<string, string>
}

async function failureOf(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise
  } catch (error) {
    if (error instanceof ApiError) return error
    throw error
  }
  throw new Error('应当失败')
}

afterEach(() => {
  document.head.innerHTML = ''
})

describe('buildQuery', () => {
  it('多值用重复键，跳过空值（假设 A-03）', () => {
    expect(buildQuery({ q: '', type: ['paper', 'patent'], year_from: null, page: 2, empty: [] })).toBe('?type=paper&type=patent&page=2')
    expect(buildQuery({ a: undefined })).toBe('')
  })
})

describe('HttpApiClient', () => {
  it('检索参数为下划线命名，响应转为驼峰且保留 null', async () => {
    const { fn, calls } = fakeFetch(() =>
      json(200, { items: [{ id: 'W1', link_status: 'ok' }], total: 1, page: 2, page_size: 20, data_version: 'v1', updated_at: null }),
    )
    const api = new HttpApiClient({ fetchImpl: fn })
    const page = await api.searchWorks({ ...emptyWorkQuery(), q: 'graph', types: ['paper', 'patent'], yearFrom: 2020, page: 2 })
    const url = new URL(calls[0]!.url, 'http://localhost')
    expect(url.pathname).toBe('/api/works')
    expect(url.searchParams.get('q')).toBe('graph')
    expect(url.searchParams.getAll('type')).toEqual(['paper', 'patent'])
    expect(url.searchParams.get('year_from')).toBe('2020')
    expect(url.searchParams.has('year_to')).toBe(false)
    expect(url.searchParams.get('page_size')).toBe('20')
    expect(calls[0]!.init.method).toBe('GET')
    expect(calls[0]!.init.credentials).toBe('same-origin')
    expect(headersOf(calls[0]!)['X-CSRF-Token']).toBeUndefined()
    expect(page).toEqual({ items: [{ id: 'W1', linkStatus: 'ok' }], total: 1, page: 2, pageSize: 20, dataVersion: 'v1', updatedAt: null })
  })

  it('写请求体为下划线命名，并附带 CSRF 头', async () => {
    const { fn, calls } = fakeFetch(() => json(201, { id: 'C1', scholar_id: 'A1', status: 'PENDING' }))
    const api = new HttpApiClient({ fetchImpl: fn, csrfHeaders: () => ({ 'X-CSRF-Token': 't' }) })
    const result = await api.submitClaim({ scholarId: 'A1', statement: 's', evidenceRefs: ['url:https://x.org'], requestKey: 'k' })
    expect(calls[0]!.init.method).toBe('POST')
    expect(calls[0]!.url).toBe('/api/claims')
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ scholar_id: 'A1', statement: 's', evidence_refs: ['url:https://x.org'], request_key: 'k' })
    expect(headersOf(calls[0]!)).toMatchObject({ 'X-CSRF-Token': 't', 'Content-Type': 'application/json' })
    expect(result).toEqual({ id: 'C1', scholarId: 'A1', status: 'PENDING' })
  })

  it('默认从页面 meta 读取 CSRF 令牌', async () => {
    document.head.innerHTML = '<meta name="csrf-token" content="meta-token">'
    const { fn, calls } = fakeFetch(() => new Response(null, { status: 204 }))
    await new HttpApiClient({ fetchImpl: fn }).logout()
    expect(headersOf(calls[0]!)['X-CSRF-Token']).toBe('meta-token')
  })

  it('路径参数编码，前缀末尾斜杠被去除', async () => {
    const { fn, calls } = fakeFetch(() => json(200, {}))
    await new HttpApiClient({ fetchImpl: fn, baseUrl: '/backend/' }).getWork('a/b')
    expect(calls[0]!.url).toBe('/backend/works/a%2Fb')
  })

  it('错误体按 code 归类，取追踪编号与字段错误（假设 A-05）', async () => {
    const { fn } = fakeFetch(() => json(409, { code: 'CONFLICT', message: '内部信息', trace_id: 't-1', field_errors: { evidence_refs: '无效' } }))
    const error = await failureOf(new HttpApiClient({ fetchImpl: fn }).submitClaim({ scholarId: 'A', statement: 's', evidenceRefs: [], requestKey: 'k' }))
    expect(error.kind).toBe('CONFLICT')
    expect(error.traceId).toBe('t-1')
    expect(error.fieldErrors).toEqual({ evidenceRefs: '无效' })
    expect(error.message).not.toContain('内部信息')
  })

  it('无法识别的 code 或非 JSON 响应按状态码归类；追踪编号可来自响应头', async () => {
    const odd = fakeFetch(() => json(403, { code: 'SOMETHING_ELSE' }))
    expect((await failureOf(new HttpApiClient({ fetchImpl: odd.fn }).getFacets())).kind).toBe('FORBIDDEN')
    const html = fakeFetch(() => new Response('<html>Bad Gateway</html>', { status: 503, headers: { 'x-trace-id': 'h-9' } }))
    const error = await failureOf(new HttpApiClient({ fetchImpl: html.fn }).getFacets())
    expect([error.kind, error.traceId]).toEqual(['DEPENDENCY_UNAVAILABLE', 'h-9'])
  })

  it('网络错误为 NETWORK', async () => {
    const { fn } = fakeFetch(() => Promise.reject(new TypeError('Failed to fetch')))
    expect((await failureOf(new HttpApiClient({ fetchImpl: fn }).getFacets())).kind).toBe('NETWORK')
  })

  it('超时为 TIMEOUT', async () => {
    const hang = ((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
      })) as typeof fetch
    expect((await failureOf(new HttpApiClient({ fetchImpl: hang, timeoutMs: 10 }).getFacets())).kind).toBe('TIMEOUT')
  })

  it('调用方取消时抛出 AbortError，而不是错误种类', async () => {
    const controller = new AbortController()
    const hang = ((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
      })) as typeof fetch
    const pending = new HttpApiClient({ fetchImpl: hang }).getFacets({ signal: controller.signal })
    controller.abort()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('已取消的信号不发请求', async () => {
    const { fn, calls } = fakeFetch(() => json(200, {}))
    const controller = new AbortController()
    controller.abort()
    await expect(new HttpApiClient({ fetchImpl: fn }).getFacets({ signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' })
    expect(calls).toHaveLength(0)
  })

  it('会话：401 为未登录，其他错误照常抛出', async () => {
    expect(await new HttpApiClient({ fetchImpl: fakeFetch(() => json(401, {})).fn }).getSession()).toBeNull()
    await expect(new HttpApiClient({ fetchImpl: fakeFetch(() => json(503, {})).fn }).getSession()).rejects.toBeInstanceOf(ApiError)
  })

  it('各接口路径与方法（假设 A-07～A-15）', async () => {
    const { fn, calls } = fakeFetch(() => json(200, {}))
    const api = new HttpApiClient({ fetchImpl: fn })
    const filter = { types: [], yearFrom: 2024, yearTo: null }
    await api.login('u', 'p')
    await api.searchScholars({ name: '甲', fieldIds: [], institutionIds: ['I1'], page: 1, pageSize: 20 })
    await api.getPortal('A1')
    await api.listMyClaims()
    await api.getMaintainView('A1')
    await api.updateProfile('A1', { bio: null, homepage: null, expectedVersion: 1 })
    await api.setVisibility('A1', { workIds: ['W1'], hidden: true, expectedVersion: 1 })
    await api.getTypeDistribution(filter)
    await api.getInstitutionRanking(filter)
    await api.getFieldDistribution(filter)
    await api.getHotspots(filter)
    await api.getCollaborations({ fieldIds: ['F1'], institutionIds: [] })
    await api.listClaimsForReview('PENDING')
    await api.decideClaim('C1', { decision: 'REJECTED', reason: 'r', expectedVersion: 1, requestKey: 'k' })
    await api.listTasks()
    await api.listSources()
    await api.createTask({ sourceId: 'S1', requestKey: 'k' })
    await api.stopTask('T1', 2)
    await api.retryTask('T1', 3)
    expect(calls.map((c) => `${c.init.method} ${c.url}`)).toEqual([
      'POST /api/session',
      'GET /api/scholars?name=%E7%94%B2&institution_ids=I1&page=1&page_size=20',
      'GET /api/scholars/A1/portal',
      'GET /api/me/claims',
      'GET /api/scholars/A1/maintain',
      'PATCH /api/scholars/A1/profile',
      'PUT /api/scholars/A1/visibility',
      'GET /api/stats/types?year_from=2024',
      'GET /api/stats/institutions?year_from=2024',
      'GET /api/stats/fields?year_from=2024',
      'GET /api/stats/hotspots?year_from=2024',
      'GET /api/stats/collaborations?field_ids=F1',
      'GET /api/admin/claims?status=PENDING',
      'POST /api/admin/claims/C1/decision',
      'GET /api/admin/tasks',
      'GET /api/admin/sources',
      'POST /api/admin/tasks',
      'POST /api/admin/tasks/T1/stop',
      'POST /api/admin/tasks/T1/retry',
    ])
    expect(JSON.parse(String(calls[13]!.init.body))).toEqual({ decision: 'REJECTED', reason: 'r', expected_version: 1, request_key: 'k' })
    expect(JSON.parse(String(calls[17]!.init.body))).toEqual({ expected_version: 2 })
  })
})
