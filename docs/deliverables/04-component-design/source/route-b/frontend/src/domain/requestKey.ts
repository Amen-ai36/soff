// 幂等键：同一份内容重试时复用同一个键，服务端据此返回已有结果（成员 8 提案第 3 节）。

export interface KeyedFingerprint {
  fingerprint: string
  key: string
}

export function nextRequestKey(
  prev: KeyedFingerprint | null,
  fingerprint: string,
  generate: () => string,
): KeyedFingerprint {
  if (prev !== null && prev.fingerprint === fingerprint) return prev
  return { fingerprint, key: generate() }
}

/** randomUUID 只在安全上下文可用；其他情况用 getRandomValues 生成 v4 UUID。 */
export function randomRequestKey(): string {
  const c = globalThis.crypto
  if (typeof c.randomUUID === 'function') return c.randomUUID()
  const b = c.getRandomValues(new Uint8Array(16))
  b[6] = (b[6]! & 0x0f) | 0x40
  b[8] = (b[8]! & 0x3f) | 0x80
  const hex = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
