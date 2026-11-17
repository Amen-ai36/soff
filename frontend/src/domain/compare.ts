// 文本规范化与稳定比较。依据：SPEC-M8-SEARCH 第 2、6 条。

/** NFKC、去首尾空白、合并空白；只把拉丁字母转小写（"拉丁字符不区分大小写"）。 */
export function normalizeText(text: string): string {
  return text
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[A-Z]/g, (c) => c.toLowerCase())
}

/** 按 Unicode 码点比较。JS 的 `<` 按 UTF-16 码元比较，辅助平面字符会排错。 */
export function compareCodePoints(a: string, b: string): number {
  const ia = a[Symbol.iterator]()
  const ib = b[Symbol.iterator]()
  for (;;) {
    const x = ia.next()
    const y = ib.next()
    if (x.done && y.done) return 0
    if (x.done) return -1
    if (y.done) return 1
    const cx = x.value.codePointAt(0)!
    const cy = y.value.codePointAt(0)!
    if (cx !== cy) return cx < cy ? -1 : 1
  }
}
