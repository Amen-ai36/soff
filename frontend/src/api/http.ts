// HTTP 实现。所有对未冻结契约的假设（A-01～A-18，见架构文档 02 第 8 节）只出现在本文件。

import { isErrorKind, kindFromStatus } from '../domain/errors'
import type {
  ClaimApplication,
  ClaimDecision,
  ClaimStatus,
  ClaimSubmission,
  CollabFilter,
  Collaborations,
  CollectionTask,
  Facets,
  FieldDistribution,
  Hotspots,
  InstitutionRanking,
  MaintainView,
  Page,
  ProfileUpdate,
  ScholarPortal,
  ScholarQuery,
  ScholarSummary,
  Session,
  SourceOption,
  StatsFilter,
  TaskCreate,
  TypeDistribution,
  VisibilityResult,
  VisibilityUpdate,
  WorkDetail,
  WorkQuery,
  WorkSummary,
} from '../domain/types'
import { ApiError, abortError } from './errors'
import { keysToCamel, keysToSnake, toCamel } from './naming'
import type { ApiClient, RequestOptions } from './port'

export const DEFAULT_TIMEOUT_MS = 10_000

type QueryValue = string | number | null | undefined | readonly (string | number)[]

export interface HttpOptions {
  baseUrl?: string
  timeoutMs?: number
  fetchImpl?: typeof fetch
  /** 会话方案未选型（ARCH9-Q02）。若采用 Cookie 方案，由这里提供 CSRF 头。 */
  csrfHeaders?: () => Record<string, string>
}

/** A-03：多值参数用重复键；空值不发送。 */
export function buildQuery(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue
    if (Array.isArray(value)) {
      for (const v of value) search.append(key, String(v))
    } else if (value !== '') {
      search.append(key, String(value))
    }
  }
  const text = search.toString()
  return text === '' ? '' : `?${text}`
}

export function workQueryParams(q: WorkQuery): Record<string, QueryValue> {
  return {
    q: q.q,
    type: q.types,
    year_from: q.yearFrom,
    year_to: q.yearTo,
    field_ids: q.fieldIds,
    institution_ids: q.institutionIds,
    sort: q.sort,
    page: q.page,
    page_size: q.pageSize,
  }
}

function statsParams(f: StatsFilter): Record<string, QueryValue> {
  return { type: f.types, year_from: f.yearFrom, year_to: f.yearTo }
}

function readMetaCsrf(): Record<string, string> {
  if (typeof document === 'undefined') return {}
  const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
  return token ? { 'X-CSRF-Token': token } : {}
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text()
  if (text === '') return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

/** A-05、A-06：错误体为 {code, message, trace_id, field_errors}；code 不可识别时按状态码归类。 */
async function toApiError(response: Response): Promise<ApiError> {
  const body = await readJson(response)
  const record = body !== null && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const kind = isErrorKind(record.code) ? record.code : kindFromStatus(response.status)
  const traceId =
    (typeof record.trace_id === 'string' ? record.trace_id : null) ?? response.headers.get('x-trace-id')
  const fieldErrors: Record<string, string> = {}
  if (record.field_errors !== null && typeof record.field_errors === 'object') {
    for (const [k, v] of Object.entries(record.field_errors as Record<string, unknown>)) {
      if (typeof v === 'string') fieldErrors[toCamel(k)] = v
    }
  }
  return new ApiError(kind, { traceId, fieldErrors })
}

export class HttpApiClient implements ApiClient {
  readonly mode = 'http' as const
  private readonly baseUrl: string
  private readonly timeoutMs: number
  private readonly fetchImpl: typeof fetch
  private readonly csrfHeaders: () => Record<string, string>

  constructor(options: HttpOptions = {}) {
    this.baseUrl = (options.baseUrl ?? '/api').replace(/\/$/, '')
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    this.fetchImpl = options.fetchImpl ?? ((input, init) => globalThis.fetch(input, init))
    this.csrfHeaders = options.csrfHeaders ?? readMetaCsrf
  }

  async request<T>(method: string, path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    const controller = new AbortController()
    const outer = options.signal
    if (outer?.aborted) throw abortError()
    const forwardAbort = () => controller.abort()
    outer?.addEventListener('abort', forwardAbort)
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, this.timeoutMs)

    try {
      const headers: Record<string, string> = { Accept: 'application/json' }
      if (method !== 'GET') Object.assign(headers, this.csrfHeaders())
      if (body !== undefined) headers['Content-Type'] = 'application/json'
      let response: Response
      try {
        response = await this.fetchImpl(`${this.baseUrl}${path}`, {
          method,
          headers,
          // 不把令牌放进 URL 或 localStorage；同源凭据由浏览器管理。
          credentials: 'same-origin',
          body: body === undefined ? undefined : JSON.stringify(keysToSnake(body)),
          signal: controller.signal,
        })
      } catch {
        if (timedOut) throw new ApiError('TIMEOUT')
        if (outer?.aborted) throw abortError()
        throw new ApiError('NETWORK')
      }
      if (!response.ok) throw await toApiError(response)
      if (response.status === 204) return undefined as T
      return keysToCamel<T>(await readJson(response))
    } finally {
      clearTimeout(timer)
      outer?.removeEventListener('abort', forwardAbort)
    }
  }

  private get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', path, undefined, options)
  }

  private enc(id: string): string {
    return encodeURIComponent(id)
  }

  async getSession(options?: RequestOptions): Promise<Session | null> {
    try {
      return await this.get<Session>('/session', options)
    } catch (error) {
      if (error instanceof ApiError && error.kind === 'UNAUTHENTICATED') return null
      throw error
    }
  }

  login(username: string, password: string): Promise<Session> {
    return this.request<Session>('POST', '/session', { username, password })
  }

  logout(): Promise<void> {
    return this.request<void>('DELETE', '/session')
  }

  getFacets(options?: RequestOptions): Promise<Facets> {
    return this.get('/facets', options)
  }

  searchWorks(query: WorkQuery, options?: RequestOptions): Promise<Page<WorkSummary>> {
    return this.get(`/works${buildQuery(workQueryParams(query))}`, options)
  }

  getWork(id: string, options?: RequestOptions): Promise<WorkDetail> {
    return this.get(`/works/${this.enc(id)}`, options)
  }

  searchScholars(query: ScholarQuery, options?: RequestOptions): Promise<Page<ScholarSummary>> {
    const params = {
      name: query.name,
      field_ids: query.fieldIds,
      institution_ids: query.institutionIds,
      page: query.page,
      page_size: query.pageSize,
    }
    return this.get(`/scholars${buildQuery(params)}`, options)
  }

  getPortal(scholarId: string, options?: RequestOptions): Promise<ScholarPortal> {
    return this.get(`/scholars/${this.enc(scholarId)}/portal`, options)
  }

  submitClaim(submission: ClaimSubmission): Promise<ClaimApplication> {
    return this.request('POST', '/claims', submission)
  }

  listMyClaims(options?: RequestOptions): Promise<ClaimApplication[]> {
    return this.get('/me/claims', options)
  }

  getMaintainView(scholarId: string, options?: RequestOptions): Promise<MaintainView> {
    return this.get(`/scholars/${this.enc(scholarId)}/maintain`, options)
  }

  updateProfile(scholarId: string, update: ProfileUpdate): Promise<MaintainView> {
    return this.request('PATCH', `/scholars/${this.enc(scholarId)}/profile`, update)
  }

  setVisibility(scholarId: string, update: VisibilityUpdate): Promise<VisibilityResult> {
    return this.request('PUT', `/scholars/${this.enc(scholarId)}/visibility`, update)
  }

  getTypeDistribution(filter: StatsFilter, options?: RequestOptions): Promise<TypeDistribution> {
    return this.get(`/stats/types${buildQuery(statsParams(filter))}`, options)
  }

  getInstitutionRanking(filter: StatsFilter, options?: RequestOptions): Promise<InstitutionRanking> {
    return this.get(`/stats/institutions${buildQuery(statsParams(filter))}`, options)
  }

  getFieldDistribution(filter: StatsFilter, options?: RequestOptions): Promise<FieldDistribution> {
    return this.get(`/stats/fields${buildQuery(statsParams(filter))}`, options)
  }

  getHotspots(filter: StatsFilter, options?: RequestOptions): Promise<Hotspots> {
    return this.get(`/stats/hotspots${buildQuery(statsParams(filter))}`, options)
  }

  getCollaborations(filter: CollabFilter, options?: RequestOptions): Promise<Collaborations> {
    const params = { field_ids: filter.fieldIds, institution_ids: filter.institutionIds }
    return this.get(`/stats/collaborations${buildQuery(params)}`, options)
  }

  listClaimsForReview(status: ClaimStatus | null, options?: RequestOptions): Promise<ClaimApplication[]> {
    return this.get(`/admin/claims${buildQuery({ status })}`, options)
  }

  decideClaim(applicationId: string, decision: ClaimDecision): Promise<ClaimApplication> {
    return this.request('POST', `/admin/claims/${this.enc(applicationId)}/decision`, decision)
  }

  listTasks(options?: RequestOptions): Promise<CollectionTask[]> {
    return this.get('/admin/tasks', options)
  }

  listSources(options?: RequestOptions): Promise<SourceOption[]> {
    return this.get('/admin/sources', options)
  }

  createTask(create: TaskCreate): Promise<CollectionTask> {
    return this.request('POST', '/admin/tasks', create)
  }

  stopTask(taskId: string, expectedVersion: number): Promise<CollectionTask> {
    return this.request('POST', `/admin/tasks/${this.enc(taskId)}/stop`, { expectedVersion })
  }

  retryTask(taskId: string, expectedVersion: number): Promise<CollectionTask> {
    return this.request('POST', `/admin/tasks/${this.enc(taskId)}/retry`, { expectedVersion })
  }
}
