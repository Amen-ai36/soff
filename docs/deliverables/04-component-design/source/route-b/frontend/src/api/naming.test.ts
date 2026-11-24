import { describe, expect, it } from 'vitest'
import { keysToCamel, keysToSnake, toCamel, toSnake } from './naming'

describe('命名转换', () => {
  it('单个键', () => {
    expect(toCamel('data_version')).toBe('dataVersion')
    expect(toCamel('year_from')).toBe('yearFrom')
    expect(toSnake('expectedVersion')).toBe('expected_version')
    expect(toSnake('id')).toBe('id')
  })

  it('递归转换对象与数组，null 原样保留', () => {
    const wire = { page_size: 20, items: [{ link_status: 'ok', updated_at: null, field_ids: ['F01'] }], total: 0 }
    expect(keysToCamel(wire)).toEqual({ pageSize: 20, items: [{ linkStatus: 'ok', updatedAt: null, fieldIds: ['F01'] }], total: 0 })
    expect(keysToSnake({ requestKey: 'k', evidenceRefs: ['url:x'], bio: null })).toEqual({
      request_key: 'k',
      evidence_refs: ['url:x'],
      bio: null,
    })
  })
})
