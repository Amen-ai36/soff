// 展现层视角的数据类型。字段名为前端驼峰写法，与线上下划线写法的转换只在 api/http.ts 中进行。
// 依据：成员 8《接口需求约束提案》、SPEC-M8-SEARCH/CLAIM/STATS；未冻结项见架构文档 02 第 8 节。

export type WorkType = 'paper' | 'patent' | 'project' | 'award'
export const WORK_TYPES: readonly WorkType[] = ['paper', 'patent', 'project', 'award']

export type WorkSort = 'relevance' | 'year_desc' | 'year_asc'
export const WORK_SORTS: readonly WorkSort[] = ['relevance', 'year_desc', 'year_asc']

export interface Ref {
  id: string
  name: string | null
}

export interface WorkQuery {
  q: string
  types: WorkType[]
  yearFrom: number | null
  yearTo: number | null
  fieldIds: string[]
  institutionIds: string[]
  sort: WorkSort
  page: number
  pageSize: number
}

export interface ScholarQuery {
  name: string
  fieldIds: string[]
  institutionIds: string[]
  page: number
  pageSize: number
}

export type LinkStatus = 'ok' | 'broken' | 'unknown'

export interface WorkSource {
  name: string | null
  url: string | null
  linkStatus: LinkStatus
}

export interface WorkSummary {
  id: string
  title: string
  type: WorkType
  year: number | null
  authors: Ref[]
  venue: string | null
  institutions: Ref[]
  fields: Ref[]
  source: WorkSource
  simulated: boolean
}

export interface WorkDetail extends WorkSummary {
  abstract: string | null
  keywords: string[] | null
  updatedAt: string | null
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  dataVersion: string
  updatedAt: string | null
}

export interface ScholarSummary {
  id: string
  name: string
  institutions: Ref[]
  fields: Ref[]
  representativeWork: { id: string; title: string } | null
  workCount: number | null
}

export interface ScholarPortal {
  scholar: ScholarSummary
  bio: string | null
  homepage: string | null
  claimed: boolean
  works: WorkSummary[]
  dataVersion: string
  updatedAt: string | null
}

export type Role = 'user' | 'admin'

export interface Session {
  userId: string
  displayName: string
  roles: Role[]
  /** 当前用户已获维护授权的门户（学者 ID）。 */
  scholarIds: string[]
}

export type ClaimStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface ClaimSubmission {
  scholarId: string
  statement: string
  evidenceRefs: string[]
  requestKey: string
}

export interface ClaimApplication {
  id: string
  scholarId: string
  scholarName: string
  applicantId: string
  applicantName: string
  statement: string
  evidenceRefs: string[]
  status: ClaimStatus
  reason: string | null
  submittedAt: string
  decidedAt: string | null
  version: number
  previousId: string | null
}

export interface ClaimDecision {
  decision: 'APPROVED' | 'REJECTED'
  reason: string
  expectedVersion: number
  requestKey: string
}

export interface MaintainWork {
  work: WorkSummary
  hidden: boolean
}

export interface MaintainView {
  scholarId: string
  scholarName: string
  bio: string | null
  homepage: string | null
  version: number
  works: MaintainWork[]
}

export interface ProfileUpdate {
  bio: string | null
  homepage: string | null
  expectedVersion: number
}

export interface VisibilityUpdate {
  workIds: string[]
  hidden: boolean
  expectedVersion: number
}

export interface VisibilityResult {
  changed: number
  version: number
}

export interface Facets {
  fields: Ref[]
  institutions: Ref[]
  dataVersion: string
}

export interface StatsFilter {
  types: WorkType[]
  yearFrom: number | null
  yearTo: number | null
}

export interface StatsMeta {
  denominator: number
  unknownCount: number
  countingRule: string
  dataVersion: string
  updatedAt: string | null
}

export interface TypeDistribution extends StatsMeta {
  groups: { type: WorkType; count: number; share: number | null }[]
}

export interface InstitutionRanking extends StatsMeta {
  rows: { rank: number; institution: Ref; count: number }[]
}

export interface FieldDistribution extends StatsMeta {
  rows: { field: Ref; count: number; share: number | null }[]
}

export interface HotspotRow {
  field: Ref
  count: number
  share: number | null
  delta: number | null
}

export interface HotspotYear {
  year: number
  denominator: number
  rows: HotspotRow[]
}

export interface Hotspots extends StatsMeta {
  years: HotspotYear[]
}

export interface CollabEdge {
  a: string
  b: string
  weight: number
  workIds: string[]
}

export interface CollabFilter {
  fieldIds: string[]
  institutionIds: string[]
}

export interface Collaborations extends StatsMeta {
  nodes: Ref[]
  edges: CollabEdge[]
}

/** 成员 7 候选状态，未冻结（collection-transitions.json v0.1）。 */
export type TaskStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'RETRY_WAIT' | 'STOPPING' | 'STOPPED'

export interface CollectionTask {
  id: string
  sourceId: string
  sourceName: string
  status: TaskStatus
  fetchedCount: number | null
  createdAt: string
  updatedAt: string
  lastError: string | null
  version: number
}

export interface SourceOption {
  id: string
  name: string
}

export interface TaskCreate {
  sourceId: string
  requestKey: string
}
