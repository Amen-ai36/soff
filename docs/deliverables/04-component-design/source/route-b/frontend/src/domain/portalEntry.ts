// 学者门户上的认领/维护入口判定。依据：SPEC-M9-PORTAL-CLAIM-UI 第 2 节；IA9-RULE-10～12。

import type { ClaimApplication } from './types'

export type PortalEntry =
  | { kind: 'login_to_claim' }
  | { kind: 'claim' }
  | { kind: 'view_application'; applicationId: string }
  | { kind: 'maintain' }
  | { kind: 'claimed' }

export interface PortalEntryInput {
  loggedIn: boolean
  /** 当前用户已获该门户维护授权（来自服务端会话）。 */
  maintains: boolean
  /** 当前用户对该门户的审核中申请。 */
  pendingApplicationId: string | null
  claimed: boolean
}

export function portalEntry(input: PortalEntryInput): PortalEntry {
  if (!input.loggedIn) return input.claimed ? { kind: 'claimed' } : { kind: 'login_to_claim' }
  if (input.maintains) return { kind: 'maintain' }
  if (input.pendingApplicationId !== null) {
    return { kind: 'view_application', applicationId: input.pendingApplicationId }
  }
  return input.claimed ? { kind: 'claimed' } : { kind: 'claim' }
}

export function portalStatusText(claimed: boolean): string {
  return claimed
    ? '已认领：认领关系已审核通过，不代表平台为全部成果背书'
    : '未认领：门户信息由平台整理，未经本人确认'
}

export function findPendingApplication(claims: ClaimApplication[] | null, scholarId: string): string | null {
  if (claims === null) return null
  return claims.find((c) => c.scholarId === scholarId && c.status === 'PENDING')?.id ?? null
}
