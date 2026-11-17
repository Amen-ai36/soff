// 展现层与业务服务层之间的唯一接口（ADR-M9-02）。页面只依赖本接口，不依赖其实现。

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

export interface RequestOptions {
  signal?: AbortSignal
}

export interface ApiClient {
  readonly mode: 'http' | 'mock'

  // 认证（SPEC-M8-AUTH；假设 A-07）
  getSession(options?: RequestOptions): Promise<Session | null>
  login(username: string, password: string): Promise<Session>
  logout(): Promise<void>

  // 检索（SPEC-M8-SEARCH；假设 A-08、A-09、A-14）
  getFacets(options?: RequestOptions): Promise<Facets>
  searchWorks(query: WorkQuery, options?: RequestOptions): Promise<Page<WorkSummary>>
  getWork(id: string, options?: RequestOptions): Promise<WorkDetail>
  searchScholars(query: ScholarQuery, options?: RequestOptions): Promise<Page<ScholarSummary>>

  // 门户与认领（SPEC-M8-CLAIM；假设 A-09、A-10、A-12）
  getPortal(scholarId: string, options?: RequestOptions): Promise<ScholarPortal>
  submitClaim(submission: ClaimSubmission): Promise<ClaimApplication>
  listMyClaims(options?: RequestOptions): Promise<ClaimApplication[]>
  getMaintainView(scholarId: string, options?: RequestOptions): Promise<MaintainView>
  updateProfile(scholarId: string, update: ProfileUpdate): Promise<MaintainView>
  setVisibility(scholarId: string, update: VisibilityUpdate): Promise<VisibilityResult>

  // 统计（SPEC-M8-STATS；假设 A-13）
  getTypeDistribution(filter: StatsFilter, options?: RequestOptions): Promise<TypeDistribution>
  getInstitutionRanking(filter: StatsFilter, options?: RequestOptions): Promise<InstitutionRanking>
  getFieldDistribution(filter: StatsFilter, options?: RequestOptions): Promise<FieldDistribution>
  getHotspots(filter: StatsFilter, options?: RequestOptions): Promise<Hotspots>
  getCollaborations(filter: CollabFilter, options?: RequestOptions): Promise<Collaborations>

  // 管理后台（SPEC-M8-CLAIM 审核；成员 7 采集任务候选；假设 A-11、A-15）
  listClaimsForReview(status: ClaimStatus | null, options?: RequestOptions): Promise<ClaimApplication[]>
  decideClaim(applicationId: string, decision: ClaimDecision): Promise<ClaimApplication>
  listTasks(options?: RequestOptions): Promise<CollectionTask[]>
  listSources(options?: RequestOptions): Promise<SourceOption[]>
  createTask(create: TaskCreate): Promise<CollectionTask>
  stopTask(taskId: string, expectedVersion: number): Promise<CollectionTask>
  retryTask(taskId: string, expectedVersion: number): Promise<CollectionTask>
}
