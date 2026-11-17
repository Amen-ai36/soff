// 认领申请表单与门户资料的校验。依据：SPEC-M9-PORTAL-CLAIM-UI 第 3.2、5 节；契约假设 A-17、A-18。

import { isSafeHttpUrl } from './display'

export const STATEMENT_MAX = 500
export const BIO_MAX = 1000

export type ClaimStep = 1 | 2 | 3

export interface ClaimForm {
  statement: string
  homepageUrl: string
  institutionEmail: string
  consent: boolean
}

export const CLAIM_FIELD_ORDER = ['statement', 'homepageUrl', 'institutionEmail', 'consent'] as const

export const CLAIM_MESSAGES = {
  statementRequired: '请填写你与该学者的关系',
  statementTooLong: `关系说明不能超过 ${STATEMENT_MAX} 字`,
  urlInvalid: '请输入以 http:// 或 https:// 开头的链接',
  emailInvalid: '请输入有效的邮箱地址',
  evidenceRequired: '请至少提供一项证明材料',
  consentRequired: '请确认信息真实并同意用于审核',
  bioTooLong: `个人简介不能超过 ${BIO_MAX} 字`,
} as const

export function emptyClaimForm(): ClaimForm {
  return { statement: '', homepageUrl: '', institutionEmail: '', consent: false }
}

export function isHttpUrl(text: string): boolean {
  const t = text.trim()
  return /^https?:\/\/\S+$/i.test(t) && isSafeHttpUrl(t)
}

export function isEmail(text: string): boolean {
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(text.trim())
}

export function validateClaimStep(form: ClaimForm, step: ClaimStep): Record<string, string> {
  const errors: Record<string, string> = {}
  if (step === 1) {
    const s = form.statement.trim()
    if (s === '') errors.statement = CLAIM_MESSAGES.statementRequired
    else if ([...s].length > STATEMENT_MAX) errors.statement = CLAIM_MESSAGES.statementTooLong
  } else if (step === 2) {
    const url = form.homepageUrl.trim()
    const email = form.institutionEmail.trim()
    if (url !== '' && !isHttpUrl(url)) errors.homepageUrl = CLAIM_MESSAGES.urlInvalid
    if (email !== '' && !isEmail(email)) errors.institutionEmail = CLAIM_MESSAGES.emailInvalid
    if (url === '' && email === '') errors.homepageUrl = CLAIM_MESSAGES.evidenceRequired
  } else if (!form.consent) {
    errors.consent = CLAIM_MESSAGES.consentRequired
  }
  return errors
}

export function validateClaimForm(form: ClaimForm): { errors: Record<string, string>; firstInvalidStep: ClaimStep | null } {
  for (const step of [1, 2, 3] as const) {
    const errors = validateClaimStep(form, step)
    if (Object.keys(errors).length > 0) return { errors, firstInvalidStep: step }
  }
  return { errors: {}, firstInvalidStep: null }
}

/** 字段属于哪一步；服务端返回字段错误时用来跳回对应步骤。 */
export function stepOfField(field: string): ClaimStep {
  if (field === 'homepageUrl' || field === 'institutionEmail' || field === 'evidenceRefs') return 2
  if (field === 'consent') return 3
  return 1
}

/** 证明材料引用。材料存储方案确定前，以前缀区分两类引用（假设 A-17）。 */
export function evidenceRefs(form: ClaimForm): string[] {
  const refs: string[] = []
  const url = form.homepageUrl.trim()
  const email = form.institutionEmail.trim()
  if (url !== '') refs.push(`url:${url}`)
  if (email !== '') refs.push(`email:${email}`)
  return refs
}

/** 用于判断"内容是否变化"，内容不变时复用同一个 request_key。 */
export function claimFingerprint(scholarId: string, form: ClaimForm): string {
  return JSON.stringify([scholarId, form.statement.trim(), evidenceRefs(form)])
}

export interface ProfileForm {
  bio: string
  homepage: string
}

export function validateProfile(form: ProfileForm): Record<string, string> {
  const errors: Record<string, string> = {}
  if ([...form.bio].length > BIO_MAX) errors.bio = CLAIM_MESSAGES.bioTooLong
  if (form.homepage.trim() !== '' && !isHttpUrl(form.homepage)) errors.homepage = CLAIM_MESSAGES.urlInvalid
  return errors
}
