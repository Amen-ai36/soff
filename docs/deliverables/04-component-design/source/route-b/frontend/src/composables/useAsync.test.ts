// S-AC-09：最后一次请求获胜；加载提示延迟显示；提交防重。
import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { ApiError } from '../api/errors'
import { useAsync } from './useAsync'
import { useSubmit } from './useSubmit'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('useAsync', () => {
  it('后发请求先返回、先发请求后返回时，只显示后发请求的结果', async () => {
    const scope = effectScope()
    const a = scope.run(() => useAsync<string>())!
    const first = deferred<string>()
    const second = deferred<string>()
    let firstSignal: AbortSignal | null = null
    const p1 = a.run((signal) => {
      firstSignal = signal
      return first.promise
    })
    const p2 = a.run(() => second.promise)
    expect(firstSignal!.aborted).toBe(true)
    second.resolve('second')
    expect(await p2).toBe('second')
    first.resolve('first')
    expect(await p1).toBeUndefined()
    expect(a.state.value).toEqual({ status: 'success', data: 'second', failure: null })
    scope.stop()
  })

  it('失败转为 Failure；取消产生的 AbortError 被忽略', async () => {
    const scope = effectScope()
    const a = scope.run(() => useAsync<number>())!
    await a.run(() => Promise.reject(new ApiError('CONFLICT', { traceId: 't' })))
    expect(a.state.value).toEqual({ status: 'error', data: null, failure: { kind: 'CONFLICT', traceId: 't', fieldErrors: {} } })
    await a.run(() => Promise.reject(new DOMException('x', 'AbortError')))
    expect(a.state.value.status).toBe('loading')
    a.setData(3)
    expect(a.state.value).toEqual({ status: 'success', data: 3, failure: null })
    a.reset()
    expect(a.state.value.status).toBe('idle')
    scope.stop()
  })

  it('超过延迟阈值才显示加载提示；作用域销毁时取消请求', async () => {
    vi.useFakeTimers()
    const scope = effectScope()
    const a = scope.run(() => useAsync<number>({ spinnerDelayMs: 300 }))!
    const pending = deferred<number>()
    let signal: AbortSignal | null = null
    void a.run((s) => {
      signal = s
      return pending.promise
    })
    vi.advanceTimersByTime(299)
    expect(a.showSpinner.value).toBe(false)
    vi.advanceTimersByTime(1)
    expect(a.showSpinner.value).toBe(true)
    scope.stop()
    expect(signal!.aborted).toBe(true)
    expect(a.showSpinner.value).toBe(false)
  })
})

describe('useSubmit', () => {
  it('进行中时忽略再次提交', async () => {
    const { pending, submit } = useSubmit()
    const d = deferred<string>()
    const task = vi.fn(() => d.promise)
    const p1 = submit(task)
    expect(pending.value).toBe(true)
    expect(await submit(task)).toBeNull()
    d.resolve('ok')
    expect(await p1).toEqual({ ok: true, value: 'ok' })
    expect(task).toHaveBeenCalledTimes(1)
    expect(pending.value).toBe(false)
    expect(await submit(() => Promise.reject(new ApiError('NETWORK')))).toEqual({
      ok: false,
      failure: { kind: 'NETWORK', traceId: null, fieldErrors: {} },
    })
  })
})
