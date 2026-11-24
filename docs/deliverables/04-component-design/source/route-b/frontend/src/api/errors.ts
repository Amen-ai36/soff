import type { ErrorKind, Failure } from '../domain/errors'

/** 接口调用失败。只携带种类、追踪编号与字段错误，不携带服务端原始错误正文。 */
export class ApiError extends Error implements Failure {
  readonly kind: ErrorKind
  readonly traceId: string | null
  readonly fieldErrors: Record<string, string>

  constructor(kind: ErrorKind, options: { traceId?: string | null; fieldErrors?: Record<string, string> } = {}) {
    super(kind)
    this.name = 'ApiError'
    this.kind = kind
    this.traceId = options.traceId ?? null
    this.fieldErrors = options.fieldErrors ?? {}
  }
}

export function abortError(): DOMException {
  return new DOMException('请求已取消', 'AbortError')
}
