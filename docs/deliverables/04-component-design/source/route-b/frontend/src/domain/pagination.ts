// 分页页码窗口。

export function totalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize))
}

export type PageItem = number | 'gap'

/** 首页、末页与当前页前后 width 页；不连续处用 gap 表示。 */
export function pageWindow(current: number, last: number, width = 2): PageItem[] {
  const pages = new Set<number>([1, last])
  for (let p = current - width; p <= current + width; p++) if (p >= 1 && p <= last) pages.add(p)
  const out: PageItem[] = []
  for (const p of [...pages].sort((a, b) => a - b)) {
    const prev = out[out.length - 1]
    if (typeof prev === 'number' && p - prev > 1) out.push('gap')
    out.push(p)
  }
  return out
}
