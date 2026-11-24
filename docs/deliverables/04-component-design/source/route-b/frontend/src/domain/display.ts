// 显示规则。依据：SPEC-M9-SEARCH-UI 第 6 节；SPEC-M9-STATS-COLLAB-UI 第 1.2 节；成员 8 提案缺失值规则。

import { normalizeText } from './compare'
import type { ClaimStatus, Ref, ScholarSummary, WorkSort, WorkSource, WorkType } from './types'

export const MISSING = '未提供'
export const NONE = '无'
export const STALE_AFTER_DAYS = 30 // 候选值，IA9-Q02 待成员 2、7 确认

export const TYPE_LABEL: Record<WorkType, string> = {
  paper: '论文',
  patent: '专利',
  project: '科研项目',
  award: '获奖',
}

export const SORT_LABEL: Record<WorkSort, string> = {
  relevance: '相关度',
  year_desc: '年份从新到旧',
  year_asc: '年份从旧到新',
}

export const CLAIM_STATUS_LABEL: Record<ClaimStatus, string> = {
  PENDING: '审核中',
  APPROVED: '已通过',
  REJECTED: '已驳回',
}

export const CLAIM_STATUS_NOTE: Record<ClaimStatus, string> = {
  PENDING: '审核通过前你还不能维护该门户',
  APPROVED: '可以维护该门户允许修改的内容',
  REJECTED: '可以补充材料后重新申请，原申请记录会保留',
}

/** null、undefined、空白字符串都视为未提供。 */
export function formatText(value: string | null | undefined): string {
  return value === null || value === undefined || value.trim() === '' ? MISSING : value
}

export function formatYear(year: number | null): string {
  return year === null ? '年份未提供' : String(year)
}

/** null 是未知，0 是已知为零，二者不能混用。 */
export function formatCount(n: number | null): string {
  return n === null ? MISSING : String(n)
}

/** 分母为 0 时服务端返回 null，显示"无数据"，不显示 0%。 */
export function formatShare(share: number | null): string {
  return share === null ? '无数据' : `${(share * 100).toFixed(1)}%`
}

/** 与上一年数量之差；上一年无数据时为 null，不当作 0。 */
export function formatDelta(delta: number | null): string {
  if (delta === null) return '—（上一年无数据）'
  return delta > 0 ? `+${delta}` : String(delta)
}

/** null 表示未知；[] 表示无关联（成员 8 提案缺失值规则）。 */
export function formatRefs(refs: Ref[] | null): string {
  if (refs === null) return MISSING
  if (refs.length === 0) return NONE
  return refs.map((r) => r.name ?? `${MISSING}（${r.id}）`).join('、')
}

export function formatList(list: string[] | null): string {
  if (list === null) return MISSING
  if (list.length === 0) return NONE
  return list.join('、')
}

export function formatAuthors(authors: Ref[], max = 3): string {
  if (authors.length === 0) return NONE
  const names = authors.map((a) => a.name ?? '未提供姓名')
  if (names.length <= max) return names.join('、')
  return `${names.slice(0, max).join('、')} 等 ${names.length} 人`
}

/** ISO 时间 → 北京时间"YYYY-MM-DD HH:mm"。不依赖运行环境时区，保证显示一致。 */
export function formatDateTime(iso: string | null): string {
  if (iso === null) return MISSING
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return MISSING
  return `${new Date(t + 8 * 3600_000).toISOString().slice(0, 16).replace('T', ' ')}（北京时间）`
}

export type Freshness = 'unknown' | 'fresh' | 'stale'

export function freshness(updatedAt: string | null, now: Date, days = STALE_AFTER_DAYS): Freshness {
  if (updatedAt === null) return 'unknown'
  const t = Date.parse(updatedAt)
  if (Number.isNaN(t)) return 'unknown'
  return now.getTime() - t > days * 86_400_000 ? 'stale' : 'fresh'
}

export function isSafeHttpUrl(text: string): boolean {
  try {
    const url = new URL(text)
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname !== ''
  } catch {
    return false
  }
}

export type LinkView = { kind: 'link'; href: string; text: string } | { kind: 'text'; text: string }

/** 只为 http(s) 链接生成可点击链接，避免 javascript: 等协议。 */
export function sourceLink(source: WorkSource): LinkView {
  if (source.linkStatus === 'broken') return { kind: 'text', text: '原始链接已失效' }
  if (source.linkStatus === 'ok' && source.url !== null && isSafeHttpUrl(source.url)) {
    return { kind: 'link', href: source.url, text: '查看原始出处（在新窗口打开）' }
  }
  return { kind: 'text', text: '原始链接未提供' }
}

/** 返回在列表中出现两次及以上的规范化姓名。 */
export function duplicateNames(scholars: Pick<ScholarSummary, 'name'>[]): Set<string> {
  const counts = new Map<string, number>()
  for (const s of scholars) {
    const key = normalizeText(s.name)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return new Set([...counts].filter(([, n]) => n >= 2).map(([k]) => k))
}

export function isDuplicateName(set: Set<string>, name: string): boolean {
  return set.has(normalizeText(name))
}

/** 同名区分线索，顺序依据真实问卷 Q12：研究领域、代表成果、机构。 */
export function scholarClues(s: ScholarSummary): { label: string; value: string }[] {
  return [
    { label: '研究领域', value: formatRefs(s.fields) },
    { label: '代表成果', value: s.representativeWork?.title ?? MISSING },
    { label: '机构', value: formatRefs(s.institutions) },
  ]
}
