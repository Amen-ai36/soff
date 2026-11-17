// 分层依赖检查（架构文档 01 第 2 节）：规则写成测试，违反时测试失败。
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

// 测试由 npm 脚本在 frontend/ 目录下运行。
const SRC = resolve(process.cwd(), 'src')

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    return entry.isDirectory() ? walk(full) : [full]
  })
}

const files = walk(SRC)
  .filter((f) => /\.(ts|vue)$/.test(f) && !/\.test\.ts$/.test(f) && !f.includes(`${sep}__tests__${sep}`))
  .map((f) => ({ path: relative(SRC, f).split(sep).join('/'), text: readFileSync(f, 'utf8') }))

const IMPORT_RE = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s+['"]([^'"]+)['"]/g

function importsOf(text: string): string[] {
  return [...text.matchAll(IMPORT_RE)].map((m) => m[1] ?? m[2] ?? m[3]!)
}

function layer(path: string): string {
  if (path.startsWith('api/mock/')) return 'api/mock'
  if (path === 'api/http.ts') return 'api/http'
  return path.split('/')[0]!
}

function inLayer(name: string) {
  return files.filter((f) => layer(f.path) === name)
}

function violations(name: string, forbidden: RegExp): string[] {
  return inLayer(name).flatMap((f) => importsOf(f.text).filter((i) => forbidden.test(i)).map((i) => `${f.path} → ${i}`))
}

describe('展现层分层依赖', () => {
  it('找到了各层源文件', () => {
    for (const name of ['domain', 'components', 'composables', 'views', 'api/http', 'api/mock', 'features']) {
      expect(inLayer(name).length, name).toBeGreaterThan(0)
    }
  })

  it('domain 不依赖 vue、api、页面与浏览器全局对象', () => {
    expect(violations('domain', /^(vue|vue-router)$|\/(api|composables|views|components|features|styles)\//)).toEqual([])
    const globals = inLayer('domain').filter((f) => /\b(window|document|localStorage|sessionStorage)\b/.test(f.text))
    expect(globals.map((f) => f.path)).toEqual([])
  })

  it('components 不依赖 api 与 composables', () => {
    expect(violations('components', /\/(api|composables|views)\//)).toEqual([])
  })

  it('composables 不依赖页面与 ApiClient 的具体实现', () => {
    expect(violations('composables', /\/views\/|\/components\/|api\/(http|mock|createClient)/)).toEqual([])
  })

  it('views 不直接引用 ApiClient 的具体实现', () => {
    expect(violations('views', /api\/(http|mock|createClient)/)).toEqual([])
  })

  it('api 实现不依赖界面层', () => {
    expect([...violations('api/http', /\/(views|components|composables)\//), ...violations('api/mock', /\/(views|components|composables)\//)]).toEqual([])
  })

  it('只有 api/http.ts 发起网络请求；契约路径只出现在该文件', () => {
    const fetchUsers = files.filter((f) => f.path !== 'api/http.ts' && /\bfetch\s*\(|XMLHttpRequest/.test(f.text))
    expect(fetchUsers.map((f) => f.path)).toEqual([])
    // 声明文件（*.d.ts）没有运行时代码，其注释中说明默认前缀不算违反。
    const contractPaths = files.filter((f) => f.path !== 'api/http.ts' && !f.path.endsWith('.d.ts') && /['"`]\/api[/'"`]/.test(f.text))
    expect(contractPaths.map((f) => f.path)).toEqual([])
  })

  it('浏览器代码中没有存储客户端', () => {
    const storage = files.filter((f) => /elasticsearch|mysql|postgres|obs-sdk|esdk-obs/i.test(importsOf(f.text).join(' ')))
    expect(storage.map((f) => f.path)).toEqual([])
  })
})
