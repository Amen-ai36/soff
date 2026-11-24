// 模拟实现（ADR-M9-02）。仅用于开发、演示与测试，全部数据为合成数据。
// 认领、审核、维护规则按 SPEC-M8-CLAIM / SPEC-M8-AUTH v0.1；采集任务状态按成员 7 候选 collection-transitions.json v0.1。
// 模拟模式不校验密码：任何非空密码均可登录示例账号，仓库中不保存任何密码。

import { compareCodePoints } from '../../domain/compare'
import type { ErrorKind } from '../../domain/errors'
import { canRetryTask, canStopTask } from '../../domain/taskState'
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
  Ref,
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
} from '../../domain/types'
import { ApiError, abortError } from '../errors'
import type { ApiClient, RequestOptions } from '../port'
import type { MockDataset, MockScholar, MockWork } from './dataset'
import { demoDataset } from './dataset'
import { compareYearDesc, paginate, rankScholars, rankWorks } from './search'
import * as stats from './stats'

export interface MockUser {
  id: string
  username: string
  displayName: string
  roles: ('user' | 'admin')[]
}

export interface MockState {
  dataset: MockDataset
  users: MockUser[]
  /** 学者 ID → 获维护授权的用户 ID（同一门户至多一个，SPEC-M8-CLAIM）。 */
  owners: Record<string, string>
  claims: ClaimApplication[]
  profiles: Record<string, { bio: string | null; homepage: string | null; version: number; hidden: string[] }>
  sources: SourceOption[]
  tasks: CollectionTask[]
}

export interface MockOptions {
  state?: MockState
  latencyMs?: number
  now?: () => Date
  /** 初始登录用户（测试用）。 */
  sessionUserId?: string | null
}

type MethodName = Exclude<keyof ApiClient, 'mode'>

const ISO = (s: string) => new Date(s).toISOString()

export function defaultUsers(): MockUser[] {
  return [
    { id: 'U01', username: 'user1', displayName: '示例用户一', roles: ['user'] },
    { id: 'U02', username: 'scholar1', displayName: '示例用户二', roles: ['user'] },
    { id: 'U03', username: 'admin1', displayName: '示例管理员一', roles: ['user', 'admin'] },
    { id: 'U04', username: 'admin2', displayName: '示例管理员二', roles: ['user', 'admin'] },
  ]
}

export function demoState(dataset: MockDataset = demoDataset()): MockState {
  return {
    dataset,
    users: defaultUsers(),
    owners: { A03: 'U02' },
    claims: [
      {
        id: 'C-1000',
        scholarId: 'A03',
        scholarName: '示例学者乙',
        applicantId: 'U02',
        applicantName: '示例用户二',
        statement: '本人即该学者（合成示例）。',
        evidenceRefs: ['url:https://example.org/people/a03'],
        status: 'APPROVED',
        reason: '主页信息与成果记录一致（合成示例）',
        submittedAt: ISO('2026-10-20T02:00:00Z'),
        decidedAt: ISO('2026-10-21T03:00:00Z'),
        version: 2,
        previousId: null,
      },
      {
        id: 'C-1001',
        scholarId: 'A02',
        scholarName: '示例学者甲',
        applicantId: 'U01',
        applicantName: '示例用户一',
        statement: '我是该学者（合成示例）。',
        evidenceRefs: ['url:https://example.org/people/unknown'],
        status: 'REJECTED',
        reason: '提供的主页无法核验与该学者的对应关系（合成示例）',
        submittedAt: ISO('2026-10-25T02:00:00Z'),
        decidedAt: ISO('2026-10-26T03:00:00Z'),
        version: 2,
        previousId: null,
      },
      {
        id: 'C-1002',
        scholarId: 'A01',
        scholarName: '示例学者甲',
        applicantId: 'U01',
        applicantName: '示例用户一',
        statement: '本人为该学者，现就职于示例机构一（合成示例）。',
        evidenceRefs: ['email:a01@example.org'],
        status: 'PENDING',
        reason: null,
        submittedAt: ISO('2026-11-03T02:00:00Z'),
        decidedAt: null,
        version: 1,
        previousId: null,
      },
      {
        id: 'C-1003',
        scholarId: 'A05',
        scholarName: '示例学者戊',
        applicantId: 'U03',
        applicantName: '示例管理员一',
        statement: '管理员本人提交的申请，用于演示“不能审核本人申请”（合成示例）。',
        evidenceRefs: ['email:a05@example.org'],
        status: 'PENDING',
        reason: null,
        submittedAt: ISO('2026-11-04T02:00:00Z'),
        decidedAt: null,
        version: 1,
        previousId: null,
      },
    ],
    profiles: {
      A03: { bio: '研究数据平台与开放元数据（合成示例）。', homepage: 'https://example.org/people/a03', version: 1, hidden: [] },
    },
    sources: [
      { id: 'S01', name: '示例来源：开放论文元数据（模拟）' },
      { id: 'S02', name: '示例来源：专利公开数据（模拟）' },
    ],
    tasks: [
      { id: 'T-301', sourceId: 'S01', sourceName: '示例来源：开放论文元数据（模拟）', status: 'RUNNING', fetchedCount: 1200, createdAt: ISO('2026-11-05T01:00:00Z'), updatedAt: ISO('2026-11-05T01:30:00Z'), lastError: null, version: 3 },
      { id: 'T-302', sourceId: 'S02', sourceName: '示例来源：专利公开数据（模拟）', status: 'FAILED', fetchedCount: 40, createdAt: ISO('2026-11-04T01:00:00Z'), updatedAt: ISO('2026-11-04T02:00:00Z'), lastError: '来源返回 429，重试预算已用完（模拟）', version: 5 },
      { id: 'T-303', sourceId: 'S01', sourceName: '示例来源：开放论文元数据（模拟）', status: 'SUCCEEDED', fetchedCount: 3000, createdAt: ISO('2026-11-01T01:00:00Z'), updatedAt: ISO('2026-11-01T05:00:00Z'), lastError: null, version: 4 },
      { id: 'T-304', sourceId: 'S02', sourceName: '示例来源：专利公开数据（模拟）', status: 'PENDING', fetchedCount: null, createdAt: ISO('2026-11-06T01:00:00Z'), updatedAt: ISO('2026-11-06T01:00:00Z'), lastError: null, version: 1 },
    ],
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function invalid(fieldErrors: Record<string, string>): ApiError {
  return new ApiError('INVALID_INPUT', { fieldErrors })
}

const EVIDENCE_PATTERN = /^(url:https?:\/\/\S+|email:[^\s@]+@[^\s@.]+(\.[^\s@.]+)+)$/i

export class MockApiClient implements ApiClient {
  readonly mode = 'mock' as const
  private readonly state: MockState
  private readonly latencyMs: number
  private readonly now: () => Date
  private sessionUserId: string | null
  private readonly faults = new Map<MethodName, { kind: ErrorKind; once: boolean }>()
  private readonly claimKeys = new Map<string, { fingerprint: string; applicationId: string }>()
  private readonly decisionKeys = new Map<string, { fingerprint: string; applicationId: string }>()
  private readonly taskKeys = new Map<string, { fingerprint: string; taskId: string }>()
  private sequence = 0
  private traceSequence = 0
  /** 每个方法被调用的次数，测试用来断言"没有发请求"。 */
  readonly calls: Partial<Record<MethodName, number>> = {}

  constructor(options: MockOptions = {}) {
    this.state = options.state ?? demoState()
    this.latencyMs = options.latencyMs ?? 0
    this.now = options.now ?? (() => new Date())
    this.sessionUserId = options.sessionUserId ?? null
  }

  /** 让某个方法返回指定错误（测试与演示故障状态用）。 */
  setFault(method: MethodName, kind: ErrorKind | null, options: { once?: boolean } = {}): void {
    if (kind === null) this.faults.delete(method)
    else this.faults.set(method, { kind, once: options.once ?? false })
  }

  private async enter(method: MethodName, signal?: AbortSignal): Promise<void> {
    this.calls[method] = (this.calls[method] ?? 0) + 1
    if (signal?.aborted) throw abortError()
    if (this.latencyMs > 0) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          signal?.removeEventListener('abort', onAbort)
          resolve()
        }, this.latencyMs)
        const onAbort = () => {
          clearTimeout(timer)
          reject(abortError())
        }
        signal?.addEventListener('abort', onAbort, { once: true })
      })
    } else {
      await Promise.resolve()
    }
    const fault = this.faults.get(method)
    if (fault) {
      if (fault.once) this.faults.delete(method)
      this.traceSequence += 1
      throw new ApiError(fault.kind, { traceId: `mock-trace-${String(this.traceSequence).padStart(4, '0')}` })
    }
  }

  // ---------- 会话 ----------

  private currentUser(): MockUser | null {
    return this.state.users.find((u) => u.id === this.sessionUserId) ?? null
  }

  private requireUser(): MockUser {
    const user = this.currentUser()
    if (!user) throw new ApiError('UNAUTHENTICATED')
    return user
  }

  private requireAdmin(): MockUser {
    const user = this.requireUser()
    if (!user.roles.includes('admin')) throw new ApiError('FORBIDDEN')
    return user
  }

  private toSession(user: MockUser): Session {
    const scholarIds = Object.entries(this.state.owners)
      .filter(([, owner]) => owner === user.id)
      .map(([scholarId]) => scholarId)
      .sort(compareCodePoints)
    return { userId: user.id, displayName: user.displayName, roles: [...user.roles], scholarIds }
  }

  async getSession(options?: RequestOptions): Promise<Session | null> {
    await this.enter('getSession', options?.signal)
    const user = this.currentUser()
    return user ? this.toSession(user) : null
  }

  async login(username: string, password: string): Promise<Session> {
    await this.enter('login')
    const user = this.state.users.find((u) => u.username === username.trim())
    // 失败统一返回未认证，不区分"用户不存在"与"密码错误"（SPEC-M8-AUTH）。
    if (!user || password === '') throw new ApiError('UNAUTHENTICATED')
    this.sessionUserId = user.id
    return this.toSession(user)
  }

  async logout(): Promise<void> {
    await this.enter('logout')
    this.sessionUserId = null
  }

  // ---------- 检索 ----------

  private ref(list: Ref[], id: string): Ref {
    return clone(list.find((r) => r.id === id) ?? { id, name: null })
  }

  private publicWorks(): MockWork[] {
    return this.state.dataset.works.filter((w) => w.public)
  }

  private hiddenFor(scholarId: string): Set<string> {
    return new Set(this.state.profiles[scholarId]?.hidden ?? [])
  }

  private summarizeWork(w: MockWork): WorkSummary {
    const { dataset } = this.state
    const authorIds = [...new Set(w.scholarIds)]
    return {
      id: w.id,
      title: w.title,
      type: w.type,
      year: w.year,
      authors: authorIds.map((id) => ({ id, name: dataset.scholars.find((s) => s.id === id)?.name ?? null })),
      venue: w.venue,
      institutions: w.institutionIds.map((id) => this.ref(dataset.institutions, id)),
      fields: w.fieldIds.map((id) => this.ref(dataset.fields, id)),
      source: clone(w.source),
      // 模拟模式中的所有记录都是合成数据。
      simulated: true,
    }
  }

  private scholarWorks(scholarId: string, includeHidden: boolean): MockWork[] {
    const hidden = this.hiddenFor(scholarId)
    return this.publicWorks()
      .filter((w) => w.scholarIds.includes(scholarId) && (includeHidden || !hidden.has(w.id)))
      .sort((a, b) => compareYearDesc(a, b) || compareCodePoints(a.id, b.id))
  }

  private summarizeScholar(s: MockScholar): ScholarSummary {
    const { dataset } = this.state
    const works = this.scholarWorks(s.id, false)
    const top = works[0]
    return {
      id: s.id,
      name: s.name,
      institutions: s.institutionIds.map((id) => this.ref(dataset.institutions, id)),
      fields: s.fieldIds.map((id) => this.ref(dataset.fields, id)),
      representativeWork: top ? { id: top.id, title: top.title } : null,
      workCount: works.length,
    }
  }

  private page<T>(items: T[], total: number, page: number, pageSize: number): Page<T> {
    return { items, total, page, pageSize, dataVersion: this.state.dataset.dataVersion, updatedAt: this.state.dataset.updatedAt }
  }

  async getFacets(options?: RequestOptions): Promise<Facets> {
    await this.enter('getFacets', options?.signal)
    const { dataset } = this.state
    return { fields: clone(dataset.fields), institutions: clone(dataset.institutions), dataVersion: dataset.dataVersion }
  }

  async searchWorks(query: WorkQuery, options?: RequestOptions): Promise<Page<WorkSummary>> {
    await this.enter('searchWorks', options?.signal)
    const ranked = rankWorks(this.state.dataset, query)
    return this.page(paginate(ranked, query.page, query.pageSize).map((w) => this.summarizeWork(w)), ranked.length, query.page, query.pageSize)
  }

  async getWork(id: string, options?: RequestOptions): Promise<WorkDetail> {
    await this.enter('getWork', options?.signal)
    const w = this.publicWorks().find((x) => x.id === id)
    if (!w) throw new ApiError('NOT_FOUND')
    return {
      ...this.summarizeWork(w),
      abstract: w.abstract === '' ? null : w.abstract,
      keywords: [...w.keywords],
      updatedAt: w.updatedAt,
    }
  }

  async searchScholars(query: ScholarQuery, options?: RequestOptions): Promise<Page<ScholarSummary>> {
    await this.enter('searchScholars', options?.signal)
    const ranked = rankScholars(this.state.dataset, query)
    return this.page(
      paginate(ranked, query.page, query.pageSize).map((s) => this.summarizeScholar(s)),
      ranked.length,
      query.page,
      query.pageSize,
    )
  }

  // ---------- 门户与认领 ----------

  private scholar(id: string): MockScholar {
    const s = this.state.dataset.scholars.find((x) => x.id === id)
    if (!s) throw new ApiError('NOT_FOUND')
    return s
  }

  private profile(scholarId: string) {
    let p = this.state.profiles[scholarId]
    if (!p) {
      p = { bio: null, homepage: null, version: 1, hidden: [] }
      this.state.profiles[scholarId] = p
    }
    return p
  }

  async getPortal(scholarId: string, options?: RequestOptions): Promise<ScholarPortal> {
    await this.enter('getPortal', options?.signal)
    const s = this.scholar(scholarId)
    const p = this.state.profiles[scholarId]
    return {
      scholar: this.summarizeScholar(s),
      bio: p?.bio ?? null,
      homepage: p?.homepage ?? null,
      claimed: this.state.owners[scholarId] !== undefined,
      works: this.scholarWorks(scholarId, false).map((w) => this.summarizeWork(w)),
      dataVersion: this.state.dataset.dataVersion,
      updatedAt: this.state.dataset.updatedAt,
    }
  }

  async submitClaim(submission: ClaimSubmission): Promise<ClaimApplication> {
    await this.enter('submitClaim')
    const user = this.requireUser()
    const fingerprint = JSON.stringify([submission.scholarId, submission.statement.trim(), [...submission.evidenceRefs].sort()])
    const keyId = `${user.id}\u0000${submission.requestKey}`
    const replay = this.claimKeys.get(keyId)
    if (replay) {
      // 同一幂等键：参数相同返回已有结果，参数不同为冲突（成员 8 提案第 3 节）。
      if (replay.fingerprint !== fingerprint) throw new ApiError('CONFLICT')
      return clone(this.state.claims.find((c) => c.id === replay.applicationId)!)
    }
    const scholar = this.scholar(submission.scholarId)
    const errors: Record<string, string> = {}
    const statement = submission.statement.trim()
    if (statement === '') errors.statement = '关系说明不能为空'
    else if ([...statement].length > 500) errors.statement = '关系说明不能超过 500 字'
    if (submission.evidenceRefs.length === 0) errors.evidenceRefs = '请至少提供一项证明材料'
    else if (!submission.evidenceRefs.every((r) => EVIDENCE_PATTERN.test(r))) errors.evidenceRefs = '证明材料格式无法识别'
    if (Object.keys(errors).length > 0) throw invalid(errors)
    if (this.state.owners[scholar.id] !== undefined) throw new ApiError('CONFLICT')
    if (this.state.claims.some((c) => c.applicantId === user.id && c.scholarId === scholar.id && c.status === 'PENDING')) {
      throw new ApiError('CONFLICT')
    }
    const previous = this.state.claims
      .filter((c) => c.applicantId === user.id && c.scholarId === scholar.id && c.status === 'REJECTED')
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0]
    this.sequence += 1
    const application: ClaimApplication = {
      id: `C-${2000 + this.sequence}`,
      scholarId: scholar.id,
      scholarName: scholar.name,
      applicantId: user.id,
      applicantName: user.displayName,
      statement,
      evidenceRefs: [...submission.evidenceRefs],
      status: 'PENDING',
      reason: null,
      submittedAt: this.now().toISOString(),
      decidedAt: null,
      version: 1,
      previousId: previous?.id ?? null,
    }
    this.state.claims.push(application)
    this.claimKeys.set(keyId, { fingerprint, applicationId: application.id })
    return clone(application)
  }

  async listMyClaims(options?: RequestOptions): Promise<ClaimApplication[]> {
    await this.enter('listMyClaims', options?.signal)
    const user = this.requireUser()
    return clone(
      this.state.claims
        .filter((c) => c.applicantId === user.id)
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt) || compareCodePoints(b.id, a.id)),
    )
  }

  private requireOwner(scholarId: string): MockUser {
    const user = this.requireUser()
    this.scholar(scholarId)
    if (this.state.owners[scholarId] !== user.id) throw new ApiError('FORBIDDEN')
    return user
  }

  private maintainView(scholarId: string): MaintainView {
    const s = this.scholar(scholarId)
    const p = this.profile(scholarId)
    const hidden = new Set(p.hidden)
    return {
      scholarId,
      scholarName: s.name,
      bio: p.bio,
      homepage: p.homepage,
      version: p.version,
      works: this.scholarWorks(scholarId, true).map((w) => ({ work: this.summarizeWork(w), hidden: hidden.has(w.id) })),
    }
  }

  async getMaintainView(scholarId: string, options?: RequestOptions): Promise<MaintainView> {
    await this.enter('getMaintainView', options?.signal)
    this.requireOwner(scholarId)
    return this.maintainView(scholarId)
  }

  async updateProfile(scholarId: string, update: ProfileUpdate): Promise<MaintainView> {
    await this.enter('updateProfile')
    this.requireOwner(scholarId)
    const p = this.profile(scholarId)
    if (update.expectedVersion !== p.version) throw new ApiError('CONFLICT')
    const errors: Record<string, string> = {}
    if (update.bio !== null && [...update.bio].length > 1000) errors.bio = '个人简介不能超过 1000 字'
    if (update.homepage !== null && update.homepage !== '' && !/^https?:\/\/\S+$/i.test(update.homepage)) {
      errors.homepage = '链接格式不正确'
    }
    if (Object.keys(errors).length > 0) throw invalid(errors)
    p.bio = update.bio === '' ? null : update.bio
    p.homepage = update.homepage === '' ? null : update.homepage
    p.version += 1
    return this.maintainView(scholarId)
  }

  async setVisibility(scholarId: string, update: VisibilityUpdate): Promise<VisibilityResult> {
    await this.enter('setVisibility')
    this.requireOwner(scholarId)
    const p = this.profile(scholarId)
    if (update.expectedVersion !== p.version) throw new ApiError('CONFLICT')
    const own = new Set(this.scholarWorks(scholarId, true).map((w) => w.id))
    if (update.workIds.length === 0 || !update.workIds.every((id) => own.has(id))) {
      throw invalid({ workIds: '只能调整本门户中的成果' })
    }
    const hidden = new Set(p.hidden)
    let changed = 0
    for (const id of new Set(update.workIds)) {
      if (update.hidden && !hidden.has(id)) {
        hidden.add(id)
        changed++
      } else if (!update.hidden && hidden.has(id)) {
        hidden.delete(id)
        changed++
      }
    }
    // 隐藏只影响本门户展示，不删除成果本体，也不影响其他作者（SPEC-M8-CLAIM 第 8 条）。
    p.hidden = [...hidden].sort(compareCodePoints)
    p.version += 1
    return { changed, version: p.version }
  }

  // ---------- 统计 ----------

  async getTypeDistribution(filter: StatsFilter, options?: RequestOptions): Promise<TypeDistribution> {
    await this.enter('getTypeDistribution', options?.signal)
    return stats.typeDistribution(this.state.dataset, filter)
  }

  async getInstitutionRanking(filter: StatsFilter, options?: RequestOptions): Promise<InstitutionRanking> {
    await this.enter('getInstitutionRanking', options?.signal)
    return stats.institutionRanking(this.state.dataset, filter)
  }

  async getFieldDistribution(filter: StatsFilter, options?: RequestOptions): Promise<FieldDistribution> {
    await this.enter('getFieldDistribution', options?.signal)
    return stats.fieldDistribution(this.state.dataset, filter)
  }

  async getHotspots(filter: StatsFilter, options?: RequestOptions): Promise<Hotspots> {
    await this.enter('getHotspots', options?.signal)
    return stats.hotspots(this.state.dataset, filter)
  }

  async getCollaborations(filter: CollabFilter, options?: RequestOptions): Promise<Collaborations> {
    await this.enter('getCollaborations', options?.signal)
    return stats.collaborations(this.state.dataset, filter)
  }

  // ---------- 管理后台 ----------

  async listClaimsForReview(status: ClaimStatus | null, options?: RequestOptions): Promise<ClaimApplication[]> {
    await this.enter('listClaimsForReview', options?.signal)
    this.requireAdmin()
    return clone(
      this.state.claims
        .filter((c) => status === null || c.status === status)
        .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt) || compareCodePoints(a.id, b.id)),
    )
  }

  async decideClaim(applicationId: string, decision: ClaimDecision): Promise<ClaimApplication> {
    await this.enter('decideClaim')
    const admin = this.requireAdmin()
    const fingerprint = JSON.stringify([applicationId, decision.decision, decision.reason.trim(), decision.expectedVersion])
    const keyId = `${admin.id}\u0000${decision.requestKey}`
    const replay = this.decisionKeys.get(keyId)
    if (replay) {
      if (replay.fingerprint !== fingerprint) throw new ApiError('CONFLICT')
      return clone(this.state.claims.find((c) => c.id === replay.applicationId)!)
    }
    const app = this.state.claims.find((c) => c.id === applicationId)
    if (!app) throw new ApiError('NOT_FOUND')
    if (app.applicantId === admin.id) throw new ApiError('FORBIDDEN') // 禁止自审
    if (decision.decision === 'REJECTED' && decision.reason.trim() === '') throw invalid({ reason: '驳回理由不能为空' })
    // 终态不可再审；版本不一致说明他人已处理（SPEC-M8-CLAIM 第 3、5、6 条）。
    if (app.status !== 'PENDING' || app.version !== decision.expectedVersion) throw new ApiError('CONFLICT')
    if (decision.decision === 'APPROVED') {
      // 门户已有所有者时只能有一个申请通过；冲突的申请保持 PENDING。
      if (this.state.owners[app.scholarId] !== undefined) throw new ApiError('CONFLICT')
      this.state.owners[app.scholarId] = app.applicantId
    }
    app.status = decision.decision
    app.reason = decision.reason.trim() === '' ? null : decision.reason.trim()
    app.decidedAt = this.now().toISOString()
    app.version += 1
    this.decisionKeys.set(keyId, { fingerprint, applicationId: app.id })
    return clone(app)
  }

  async listTasks(options?: RequestOptions): Promise<CollectionTask[]> {
    await this.enter('listTasks', options?.signal)
    this.requireAdmin()
    return clone([...this.state.tasks].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
  }

  async listSources(options?: RequestOptions): Promise<SourceOption[]> {
    await this.enter('listSources', options?.signal)
    this.requireAdmin()
    return clone(this.state.sources)
  }

  async createTask(create: TaskCreate): Promise<CollectionTask> {
    await this.enter('createTask')
    const admin = this.requireAdmin()
    const keyId = `${admin.id}\u0000${create.requestKey}`
    const replay = this.taskKeys.get(keyId)
    if (replay) {
      if (replay.fingerprint !== create.sourceId) throw new ApiError('CONFLICT')
      return clone(this.state.tasks.find((t) => t.id === replay.taskId)!)
    }
    const source = this.state.sources.find((s) => s.id === create.sourceId)
    if (!source) throw invalid({ sourceId: '请选择获准的数据源' })
    this.sequence += 1
    const at = this.now().toISOString()
    const task: CollectionTask = {
      id: `T-${400 + this.sequence}`,
      sourceId: source.id,
      sourceName: source.name,
      status: 'PENDING',
      fetchedCount: null,
      createdAt: at,
      updatedAt: at,
      lastError: null,
      version: 1,
    }
    this.state.tasks.push(task)
    this.taskKeys.set(keyId, { fingerprint: create.sourceId, taskId: task.id })
    return clone(task)
  }

  private task(taskId: string, expectedVersion: number): CollectionTask {
    const task = this.state.tasks.find((t) => t.id === taskId)
    if (!task) throw new ApiError('NOT_FOUND')
    if (task.version !== expectedVersion) throw new ApiError('CONFLICT')
    return task
  }

  async stopTask(taskId: string, expectedVersion: number): Promise<CollectionTask> {
    await this.enter('stopTask')
    this.requireAdmin()
    const task = this.task(taskId, expectedVersion)
    if (!canStopTask(task.status)) throw new ApiError('CONFLICT')
    // 成员 7：运行中先进入"安全停止中"（T07）；待执行与重试等待直接停止（T02、T11）。
    task.status = task.status === 'RUNNING' ? 'STOPPING' : 'STOPPED'
    task.updatedAt = this.now().toISOString()
    task.version += 1
    return clone(task)
  }

  async retryTask(taskId: string, expectedVersion: number): Promise<CollectionTask> {
    await this.enter('retryTask')
    this.requireAdmin()
    const task = this.task(taskId, expectedVersion)
    if (!canRetryTask(task.status)) throw new ApiError('CONFLICT')
    task.status = 'PENDING' // 成员 7 T12
    task.lastError = null
    task.updatedAt = this.now().toISOString()
    task.version += 1
    return clone(task)
  }
}

/** 演示页面时可在地址中加 `?mock_fault=searchWorks:DEPENDENCY_UNAVAILABLE` 查看故障状态。 */
export function parseMockFault(search: string): { method: MethodName; kind: ErrorKind } | null {
  const raw = new URLSearchParams(search).get('mock_fault')
  if (!raw) return null
  const [method, kind] = raw.split(':')
  if (!method || !kind) return null
  return { method: method as MethodName, kind: kind as ErrorKind }
}
