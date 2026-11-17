// 字段命名转换：线上为下划线写法（成员 8 提案），前端为驼峰写法。只在 api/http.ts 中使用。

export function toCamel(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase())
}

export function toSnake(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
}

function convert(value: unknown, keyFn: (k: string) => string): unknown {
  if (Array.isArray(value)) return value.map((v) => convert(v, keyFn))
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[keyFn(k)] = convert(v, keyFn)
    return out
  }
  return value
}

/** null 原样保留，不转成 0 或空字符串（缺失值规则）。 */
export function keysToCamel<T>(value: unknown): T {
  return convert(value, toCamel) as T
}

export function keysToSnake(value: unknown): unknown {
  return convert(value, toSnake)
}
