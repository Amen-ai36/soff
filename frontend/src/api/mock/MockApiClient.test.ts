// P-AC-05、P-AC-07、M-AC-04、M-AC-06：模拟实现中的认领、审核、维护与任务规则（SPEC-M8-CLAIM / AUTH，成员 7 候选状态）。
import { describe, expect, it } from 'vitest'
import { emptyWorkQuery } from '../../domain/searchQuery'
import type { ClaimDecision } from '../../domain/types'
import { ApiError } from '../errors'
import { fixtureDataset } from './dataset'
import { MockApiClient, demoState, parseMockFault, type MockState } from './MockApiClient'

async function kindOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise
  } catch (error) {
    if (error instanceof ApiError) return error.kind
    if (error instanceof DOMException) return error.name
    throw error
  }
  return 'OK'
}

function clients(state: MockState = demoState()) {
  return {
    state,
    guest: new MockApiClient({ state }),
    user1: new MockApiClient({ state, sessionUserId: 'U01' }),
    scholar1: new MockApiClient({ state, sessionUserId: 'U02' }),
    admin1: new MockApiClient({ state, sessionUserId: 'U03' }),
    admin2: new MockApiClient({ state, sessionUserId: 'U04' }),
  }
}

const approve = (expectedVersion: number, requestKey = 'd1', reason = ''): ClaimDecision => ({ decision: 'APPROVED', reason, expectedVersion, requestKey })
const reject = (expectedVersion: number, reason: string, requestKey = 'd2'): ClaimDecision => ({ decision: 'REJECTED', reason, expectedVersion, requestKey })
const claim = (scholarId: string, requestKey: string, statement = '本人') => ({ scholarId, statement, evidenceRefs: ['url:https://example.org/me'], requestKey })

describe('会话', () => {
  it('登录失败统一为 UNAUTHENTICATED；成功后会话含已授权门户', async () => {
    const { guest } = clients()
    expect(await kindOf(guest.login('nobody', 'x'))).toBe('UNAUTHENTICATED')
    expect(await kindOf(guest.login('user1', ''))).toBe('UNAUTHENTICATED')
    expect(await guest.getSession()).toBeNull()
    const s = await guest.login('scholar1', 'x')
    expect(s).toMatchObject({ userId: 'U02', scholarIds: ['A03'] })
    await guest.logout()
    expect(await guest.getSession()).toBeNull()
  })
})

describe('提交认领', () => {
  it('P-AC-05：同一 request_key 重试返回已有申请；同键不同内容为冲突', async () => {
    const { admin2, state } = clients()
    const before = state.claims.length
    const first = await admin2.submitClaim(claim('A04', 'k1'))
    const again = await admin2.submitClaim(claim('A04', 'k1'))
    expect(again.id).toBe(first.id)
    expect(state.claims.length).toBe(before + 1)
    expect(first).toMatchObject({ status: 'PENDING', version: 1, applicantId: 'U04' })
    expect(await kindOf(admin2.submitClaim(claim('A04', 'k1', '改了内容')))).toBe('CONFLICT')
  })

  it('未登录、字段错误、已被认领、已有审核中申请', async () => {
    const { guest, user1, admin2 } = clients()
    expect(await kindOf(guest.submitClaim(claim('A04', 'k')))).toBe('UNAUTHENTICATED')
    const bad = admin2.submitClaim({ scholarId: 'A04', statement: ' ', evidenceRefs: ['ftp://x'], requestKey: 'k2' })
    await expect(bad).rejects.toMatchObject({ kind: 'INVALID_INPUT', fieldErrors: { statement: expect.any(String), evidenceRefs: expect.any(String) } })
    expect(await kindOf(admin2.submitClaim(claim('A03', 'k3')))).toBe('CONFLICT') // A03 已被认领
    expect(await kindOf(user1.submitClaim(claim('A01', 'k4')))).toBe('CONFLICT') // U01 已有 C-1002 审核中
    expect(await kindOf(admin2.submitClaim(claim('A99', 'k5')))).toBe('NOT_FOUND')
  })

  it('驳回后重提创建新申请并关联前序申请', async () => {
    const { user1 } = clients()
    const app = await user1.submitClaim(claim('A02', 'k6'))
    expect(app.previousId).toBe('C-1001')
    expect(app.id).not.toBe('C-1001')
  })

  it('只能查看本人的申请', async () => {
    const { user1, guest } = clients()
    expect((await user1.listMyClaims()).every((c) => c.applicantId === 'U01')).toBe(true)
    expect(await kindOf(guest.listMyClaims())).toBe('UNAUTHENTICATED')
  })
})

describe('审核', () => {
  it('非管理员 FORBIDDEN；M-AC-04 自审 FORBIDDEN', async () => {
    const { user1, admin1 } = clients()
    expect(await kindOf(user1.listClaimsForReview('PENDING'))).toBe('FORBIDDEN')
    expect(await kindOf(admin1.decideClaim('C-1003', approve(1)))).toBe('FORBIDDEN')
  })

  it('驳回理由必填；通过后授权生效；终态不可再审', async () => {
    const { admin1, state } = clients()
    expect(await kindOf(admin1.decideClaim('C-1002', reject(1, '  ')))).toBe('INVALID_INPUT')
    const done = await admin1.decideClaim('C-1002', approve(1, 'd3'))
    expect(done).toMatchObject({ status: 'APPROVED', version: 2, reason: null })
    expect(state.owners.A01).toBe('U01')
    expect(await kindOf(admin1.decideClaim('C-1002', reject(2, '再审', 'd4')))).toBe('CONFLICT')
  })

  it('过期版本为冲突；同一键重放返回已有结果，同键不同参数为冲突', async () => {
    const { admin1, admin2 } = clients()
    await admin2.decideClaim('C-1002', reject(1, '材料不足', 'x1'))
    expect(await kindOf(admin1.decideClaim('C-1002', approve(1)))).toBe('CONFLICT')
    expect((await admin2.decideClaim('C-1002', reject(1, '材料不足', 'x1'))).status).toBe('REJECTED')
    expect(await kindOf(admin2.decideClaim('C-1002', reject(1, '别的理由', 'x1')))).toBe('CONFLICT')
  })

  it('M-AC-06：两份申请争用同一门户，只有一份能通过，另一份保持审核中', async () => {
    const { admin2, admin1, state } = clients()
    const other = await admin2.submitClaim(claim('A01', 'k7')) // U04 也申请 A01
    await admin1.decideClaim('C-1002', approve(1, 'a1'))
    expect(await kindOf(admin1.decideClaim(other.id, approve(1, 'a2')))).toBe('CONFLICT')
    expect(state.claims.find((c) => c.id === other.id)!.status).toBe('PENDING')
    expect(state.owners.A01).toBe('U01')
  })
})

describe('门户维护', () => {
  it('非所有者 FORBIDDEN', async () => {
    const { user1 } = clients()
    expect(await kindOf(user1.getMaintainView('A03'))).toBe('FORBIDDEN')
  })

  it('P-AC-07：版本冲突返回 409 且不覆盖', async () => {
    const { scholar1, state } = clients()
    const view = await scholar1.getMaintainView('A03')
    await scholar1.updateProfile('A03', { bio: '新简介', homepage: '', expectedVersion: view.version })
    expect(await kindOf(scholar1.updateProfile('A03', { bio: '旧版本上的修改', homepage: null, expectedVersion: view.version }))).toBe('CONFLICT')
    expect(state.profiles.A03!.bio).toBe('新简介')
    expect(state.profiles.A03!.homepage).toBeNull()
    expect(await kindOf(scholar1.updateProfile('A03', { bio: null, homepage: 'ftp://x', expectedVersion: view.version + 1 }))).toBe('INVALID_INPUT')
  })

  it('隐藏只影响本门户，不删除成果，也不影响其他作者', async () => {
    const { scholar1, guest } = clients()
    const view = await scholar1.getMaintainView('A03')
    const result = await scholar1.setVisibility('A03', { workIds: ['W09', 'W09'], hidden: true, expectedVersion: view.version })
    expect(result.changed).toBe(1)
    expect((await guest.getPortal('A03')).works.map((w) => w.id)).not.toContain('W09')
    expect((await guest.getPortal('A06')).works.map((w) => w.id)).toContain('W09')
    expect((await guest.getWork('W09')).id).toBe('W09')
    const after = await scholar1.getMaintainView('A03')
    expect(after.works.find((w) => w.work.id === 'W09')!.hidden).toBe(true)
    expect((await scholar1.setVisibility('A03', { workIds: ['W09'], hidden: true, expectedVersion: after.version })).changed).toBe(0)
    expect(await kindOf(scholar1.setVisibility('A03', { workIds: ['W01'], hidden: true, expectedVersion: after.version + 1 }))).toBe('INVALID_INPUT')
  })
})

describe('采集任务（成员 7 候选状态）', () => {
  it('停止：运行中进入安全停止中，待执行直接停止；成功的任务不能停止', async () => {
    const { admin1 } = clients()
    expect((await admin1.stopTask('T-301', 3)).status).toBe('STOPPING')
    expect((await admin1.stopTask('T-304', 1)).status).toBe('STOPPED')
    expect(await kindOf(admin1.stopTask('T-303', 4))).toBe('CONFLICT')
  })

  it('重试：只有失败的任务可以重试；版本不一致为冲突', async () => {
    const { admin1 } = clients()
    expect(await kindOf(admin1.retryTask('T-302', 1))).toBe('CONFLICT')
    expect(await admin1.retryTask('T-302', 5)).toMatchObject({ status: 'PENDING', lastError: null, version: 6 })
    expect(await kindOf(admin1.retryTask('T-303', 4))).toBe('CONFLICT')
    expect(await kindOf(admin1.retryTask('T-999', 1))).toBe('NOT_FOUND')
  })

  it('创建：只接受获准数据源；同键重放返回同一任务；非管理员 FORBIDDEN', async () => {
    const { admin1, user1 } = clients()
    expect(await kindOf(admin1.createTask({ sourceId: 'S99', requestKey: 'c0' }))).toBe('INVALID_INPUT')
    const t = await admin1.createTask({ sourceId: 'S01', requestKey: 'c1' })
    expect(t).toMatchObject({ status: 'PENDING', fetchedCount: null })
    expect((await admin1.createTask({ sourceId: 'S01', requestKey: 'c1' })).id).toBe(t.id)
    expect(await kindOf(admin1.createTask({ sourceId: 'S02', requestKey: 'c1' }))).toBe('CONFLICT')
    expect(await kindOf(user1.listTasks())).toBe('FORBIDDEN')
    expect((await admin1.listSources()).length).toBe(2)
  })
})

describe('检索与门户', () => {
  it('成果标记为模拟数据；非公开成果不可读', async () => {
    const { guest } = clients(demoState(fixtureDataset()))
    const page = await guest.searchWorks({ ...emptyWorkQuery(), q: 'graph' })
    expect(page.items.map((w) => w.id)).toEqual(['W01', 'W02', 'W03'])
    expect(page.items.every((w) => w.simulated)).toBe(true)
    expect(page.items[0]!.authors.map((a) => a.id)).toEqual(['A01', 'A02'])
    expect(await kindOf(guest.getWork('W05'))).toBe('NOT_FOUND')
    expect((await guest.getWork('W04')).abstract).toBeNull()
  })

  it('越界页为空列表，总数不变', async () => {
    const { guest } = clients(demoState(fixtureDataset()))
    const page = await guest.searchWorks({ ...emptyWorkQuery(), page: 9, pageSize: 2 })
    expect([page.items.length, page.total]).toEqual([0, 4])
  })

  it('门户：认领状态与按年份排序的成果；代表成果为最新一项', async () => {
    const { guest } = clients()
    const portal = await guest.getPortal('A03')
    expect(portal.claimed).toBe(true)
    expect(portal.scholar.representativeWork?.id).toBe(portal.works[0]!.id)
    expect((await guest.getPortal('A01')).claimed).toBe(false)
    expect(await kindOf(guest.getPortal('nobody'))).toBe('NOT_FOUND')
  })

  it('统计方法可调用', async () => {
    const { guest } = clients(demoState(fixtureDataset()))
    const f = { types: [], yearFrom: null, yearTo: null }
    expect((await guest.getTypeDistribution(f)).denominator).toBe(4)
    expect((await guest.getInstitutionRanking(f)).rows.length).toBe(2)
    expect((await guest.getFieldDistribution(f)).rows.length).toBe(2)
    expect((await guest.getHotspots(f)).years.length).toBe(2)
    expect((await guest.getCollaborations({ fieldIds: [], institutionIds: [] })).edges.length).toBe(1)
    expect((await guest.getFacets()).fields.map((r) => r.id)).toEqual(['F01', 'F02'])
  })
})

describe('故障注入与延迟', () => {
  it('setFault 返回指定错误与追踪编号；once 只生效一次', async () => {
    const { guest } = clients()
    guest.setFault('getFacets', 'DEPENDENCY_UNAVAILABLE', { once: true })
    await expect(guest.getFacets()).rejects.toMatchObject({ kind: 'DEPENDENCY_UNAVAILABLE', traceId: 'mock-trace-0001' })
    expect((await guest.getFacets()).fields.length).toBeGreaterThan(0)
    guest.setFault('getFacets', 'TIMEOUT')
    guest.setFault('getFacets', null)
    expect(await kindOf(guest.getFacets())).toBe('OK')
    expect(guest.calls.getFacets).toBe(3)
  })

  it('延迟期间取消抛出 AbortError', async () => {
    const api = new MockApiClient({ latencyMs: 50 })
    const controller = new AbortController()
    const pending = api.getFacets({ signal: controller.signal })
    controller.abort()
    expect(await kindOf(pending)).toBe('AbortError')
    const aborted = new AbortController()
    aborted.abort()
    expect(await kindOf(api.getFacets({ signal: aborted.signal }))).toBe('AbortError')
    expect(await kindOf(api.getFacets())).toBe('OK')
  })

  it('parseMockFault', () => {
    expect(parseMockFault('?mock_fault=searchWorks:TIMEOUT')).toEqual({ method: 'searchWorks', kind: 'TIMEOUT' })
    expect(parseMockFault('?mock_fault=bad')).toBeNull()
    expect(parseMockFault('')).toBeNull()
  })
})
