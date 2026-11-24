// P-AC-02：认领表单与门户资料校验（SPEC-M9-PORTAL-CLAIM-UI 第 3.2、5 节）。
import { describe, expect, it } from 'vitest'
import {
  CLAIM_MESSAGES,
  claimFingerprint,
  emptyClaimForm,
  evidenceRefs,
  isEmail,
  isHttpUrl,
  stepOfField,
  validateClaimForm,
  validateClaimStep,
  validateProfile,
  type ClaimForm,
} from './claimForm'

describe('认领表单（SPEC-M9-PORTAL-CLAIM-UI 第 3.2 节）', () => {
  const valid: ClaimForm = { statement: '本人', homepageUrl: 'https://example.org/me', institutionEmail: '', consent: true }

  it('步骤 1：关系说明必填且不超过 500 字（按字符计）', () => {
    expect(validateClaimStep({ ...valid, statement: '  ' }, 1)).toEqual({ statement: CLAIM_MESSAGES.statementRequired })
    expect(validateClaimStep({ ...valid, statement: '字'.repeat(500) }, 1)).toEqual({})
    expect(validateClaimStep({ ...valid, statement: '字'.repeat(501) }, 1)).toEqual({ statement: CLAIM_MESSAGES.statementTooLong })
    expect(validateClaimStep({ ...valid, statement: '😀'.repeat(500) }, 1)).toEqual({})
  })

  it('步骤 2：至少一项，格式正确', () => {
    expect(validateClaimStep({ ...valid, homepageUrl: '', institutionEmail: '' }, 2)).toEqual({ homepageUrl: CLAIM_MESSAGES.evidenceRequired })
    expect(validateClaimStep({ ...valid, homepageUrl: 'example.org' }, 2)).toEqual({ homepageUrl: CLAIM_MESSAGES.urlInvalid })
    expect(validateClaimStep({ ...valid, homepageUrl: '', institutionEmail: 'bad@' }, 2)).toEqual({ institutionEmail: CLAIM_MESSAGES.emailInvalid })
    expect(validateClaimStep({ ...valid, homepageUrl: '', institutionEmail: 'a@b.edu.cn' }, 2)).toEqual({})
  })

  it('步骤 3：必须确认', () => {
    expect(validateClaimStep({ ...valid, consent: false }, 3)).toEqual({ consent: CLAIM_MESSAGES.consentRequired })
  })

  it('validateClaimForm 返回第一个出错的步骤', () => {
    expect(validateClaimForm(valid)).toEqual({ errors: {}, firstInvalidStep: null })
    expect(validateClaimForm(emptyClaimForm()).firstInvalidStep).toBe(1)
    expect(validateClaimForm({ ...valid, homepageUrl: '' }).firstInvalidStep).toBe(2)
    expect(validateClaimForm({ ...valid, consent: false }).firstInvalidStep).toBe(3)
  })

  it('证明材料引用带前缀（假设 A-17）', () => {
    expect(evidenceRefs({ ...valid, institutionEmail: ' a@b.cn ' })).toEqual(['url:https://example.org/me', 'email:a@b.cn'])
    expect(evidenceRefs(emptyClaimForm())).toEqual([])
  })

  it('内容相同则指纹相同，忽略首尾空白', () => {
    expect(claimFingerprint('A1', valid)).toBe(claimFingerprint('A1', { ...valid, statement: ' 本人 ' }))
    expect(claimFingerprint('A1', valid)).not.toBe(claimFingerprint('A2', valid))
    expect(claimFingerprint('A1', valid)).not.toBe(claimFingerprint('A1', { ...valid, statement: '其他' }))
  })

  it('stepOfField', () => {
    expect(stepOfField('statement')).toBe(1)
    expect(stepOfField('evidenceRefs')).toBe(2)
    expect(stepOfField('institutionEmail')).toBe(2)
    expect(stepOfField('consent')).toBe(3)
  })

  it('格式工具', () => {
    expect(isHttpUrl('HTTPS://example.org/a')).toBe(true)
    expect(isHttpUrl('https://exa mple.org')).toBe(false)
    expect(isHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isEmail('a.b@c.d')).toBe(true)
    expect(isEmail('a@b')).toBe(false)
  })

  it('门户资料校验', () => {
    expect(validateProfile({ bio: '', homepage: '' })).toEqual({})
    expect(validateProfile({ bio: 'x'.repeat(1001), homepage: 'ftp://x' })).toEqual({
      bio: CLAIM_MESSAGES.bioTooLong,
      homepage: CLAIM_MESSAGES.urlInvalid,
    })
  })
})

