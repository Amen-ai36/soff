// P-AC-01：门户入口判定（SPEC-M9-PORTAL-CLAIM-UI 第 2 节）。
import { describe, expect, it } from 'vitest'
import { findPendingApplication, portalEntry, portalStatusText } from './portalEntry'
import type { ClaimApplication } from './types'

describe('portalEntry（SPEC-M9-PORTAL-CLAIM-UI 第 2 节）', () => {
  it.each([
    [{ loggedIn: false, maintains: false, pendingApplicationId: null, claimed: false }, { kind: 'login_to_claim' }],
    [{ loggedIn: false, maintains: false, pendingApplicationId: null, claimed: true }, { kind: 'claimed' }],
    [{ loggedIn: true, maintains: true, pendingApplicationId: null, claimed: true }, { kind: 'maintain' }],
    [{ loggedIn: true, maintains: true, pendingApplicationId: 'C1', claimed: true }, { kind: 'maintain' }],
    [{ loggedIn: true, maintains: false, pendingApplicationId: 'C1', claimed: false }, { kind: 'view_application', applicationId: 'C1' }],
    [{ loggedIn: true, maintains: false, pendingApplicationId: 'C1', claimed: true }, { kind: 'view_application', applicationId: 'C1' }],
    [{ loggedIn: true, maintains: false, pendingApplicationId: null, claimed: false }, { kind: 'claim' }],
    [{ loggedIn: true, maintains: false, pendingApplicationId: null, claimed: true }, { kind: 'claimed' }],
  ])('%o → %o', (input, expected) => {
    expect(portalEntry(input)).toEqual(expected)
  })

  it('状态文字不暗示身份已验证或成果背书', () => {
    expect(portalStatusText(false)).toContain('未经本人确认')
    expect(portalStatusText(true)).toContain('不代表平台为全部成果背书')
  })

  it('findPendingApplication 只找本门户的审核中申请', () => {
    const app = (id: string, scholarId: string, status: ClaimApplication['status']) => ({ id, scholarId, status }) as ClaimApplication
    const list = [app('C1', 'A01', 'REJECTED'), app('C2', 'A02', 'PENDING'), app('C3', 'A01', 'PENDING')]
    expect(findPendingApplication(list, 'A01')).toBe('C3')
    expect(findPendingApplication(list, 'A09')).toBeNull()
    expect(findPendingApplication(null, 'A01')).toBeNull()
  })
})

