// 前端错误种类与文案。依据：架构文档 02 第 4 节；异常分析 EX9-R-01、EX9-R-03、EX9-R-08。

export type ErrorKind =
  | 'INVALID_INPUT'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'DEPENDENCY_UNAVAILABLE'
  | 'TIMEOUT'
  | 'NETWORK'
  | 'UNKNOWN'

export const ERROR_KINDS: readonly ErrorKind[] = [
  'INVALID_INPUT',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'DEPENDENCY_UNAVAILABLE',
  'TIMEOUT',
  'NETWORK',
  'UNKNOWN',
]

/** 页面层面看到的失败。ApiError 实现了这些字段。 */
export interface Failure {
  kind: ErrorKind
  traceId: string | null
  fieldErrors: Record<string, string>
}

/**
 * public：公开内容（成果、门户），"不存在"可以如实告知。
 * private：私有内容（申请、维护、管理），"无权"与"不存在"使用同一句话，不暴露资源是否存在。
 */
export type FailureContext = 'public' | 'private'

export function kindFromStatus(status: number): ErrorKind {
  if (status === 400 || status === 422) return 'INVALID_INPUT'
  if (status === 401) return 'UNAUTHENTICATED'
  if (status === 403) return 'FORBIDDEN'
  if (status === 404) return 'NOT_FOUND'
  if (status === 409) return 'CONFLICT'
  if (status === 429) return 'RATE_LIMITED'
  if (status === 502 || status === 503 || status === 504) return 'DEPENDENCY_UNAVAILABLE'
  return 'UNKNOWN'
}

export function isErrorKind(value: unknown): value is ErrorKind {
  return typeof value === 'string' && (ERROR_KINDS as readonly string[]).includes(value)
}

export function errorMessage(kind: ErrorKind, context: FailureContext = 'public'): string {
  switch (kind) {
    case 'INVALID_INPUT':
      return '提交的内容不符合要求，请检查标出的字段'
    case 'UNAUTHENTICATED':
      return '需要登录后才能继续'
    case 'FORBIDDEN':
      return '无访问权限'
    case 'NOT_FOUND':
      return context === 'private' ? '无访问权限' : '内容不存在或已下线'
    case 'CONFLICT':
      return '记录已被更新，请查看最新状态后再操作'
    case 'RATE_LIMITED':
      return '请求过于频繁，请稍后再试'
    case 'DEPENDENCY_UNAVAILABLE':
      return '服务暂时不可用，请稍后重试'
    case 'TIMEOUT':
      return '请求超时，请重试'
    case 'NETWORK':
      return '网络连接失败，请检查网络后重试'
    case 'UNKNOWN':
      return '发生未知错误，请重试'
  }
}

/** 是否值得提供"重试"按钮：用户改输入、登录或无权的情况重试没有意义。 */
export function isRetryable(kind: ErrorKind): boolean {
  return ['DEPENDENCY_UNAVAILABLE', 'TIMEOUT', 'NETWORK', 'RATE_LIMITED', 'UNKNOWN'].includes(kind)
}

export function isAbortError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'AbortError'
}

/** 把任意抛出值转成 Failure；无法识别的一律为 UNKNOWN，不把服务端原文带到界面上。 */
export function toFailure(error: unknown): Failure {
  if (typeof error === 'object' && error !== null && isErrorKind((error as { kind?: unknown }).kind)) {
    const e = error as { kind: ErrorKind; traceId?: unknown; fieldErrors?: unknown }
    return {
      kind: e.kind,
      traceId: typeof e.traceId === 'string' ? e.traceId : null,
      fieldErrors: isStringRecord(e.fieldErrors) ? e.fieldErrors : {},
    }
  }
  return { kind: 'UNKNOWN', traceId: null, fieldErrors: {} }
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  return Object.values(value).every((v) => typeof v === 'string')
}
