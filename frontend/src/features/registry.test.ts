// T-AC-04：功能开关。
import { describe, expect, it } from 'vitest'
import { FEATURES, isFeatureEnabled, parseFeatureFlags } from './registry'

describe('parseFeatureFlags（ADR-M9-04）', () => {
  it('未设置时启用全部；空字符串全部关闭；否则按 ID', () => {
    expect(parseFeatureFlags(undefined)).toEqual([...FEATURES])
    expect(parseFeatureFlags('')).toEqual([])
    expect(parseFeatureFlags(' , ')).toEqual([])
    expect(parseFeatureFlags('unknown, collab-path ').map((f) => f.id)).toEqual(['collab-path'])
  })

  it('isFeatureEnabled', () => {
    expect(isFeatureEnabled([...FEATURES], 'collab-path')).toBe(true)
    expect(isFeatureEnabled([], 'collab-path')).toBe(false)
  })

  it('已登记的功能都标注为候选，路径不与核心路由冲突', () => {
    for (const f of FEATURES) {
      expect(f.status).toBe('candidate')
      expect(f.path.startsWith('/explore/')).toBe(true)
    }
  })
})
