// 异步加载：新请求开始时取消旧请求，迟到的旧响应被丢弃（"最后一次请求获胜"）；
// 超过延迟阈值才显示加载提示，避免闪烁（FS9-LR-01）。依据：架构文档 02 第 5 节。

import { getCurrentScope, onScopeDispose, ref, shallowRef } from 'vue'
import { isAbortError, toFailure } from '../domain/errors'
import { initialAsyncState, reduceAsync, type AsyncState } from '../domain/loadState'

export const SPINNER_DELAY_MS = 300

export function useAsync<T>(options: { spinnerDelayMs?: number } = {}) {
  const delay = options.spinnerDelayMs ?? SPINNER_DELAY_MS
  const state = shallowRef<AsyncState<T>>(initialAsyncState<T>())
  const showSpinner = ref(false)
  let controller: AbortController | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  let sequence = 0

  function stopSpinner(): void {
    clearTimeout(timer)
    showSpinner.value = false
  }

  async function run(task: (signal: AbortSignal) => Promise<T>): Promise<T | undefined> {
    controller?.abort()
    const current = new AbortController()
    controller = current
    const id = ++sequence
    state.value = reduceAsync(state.value, { type: 'start' })
    stopSpinner()
    timer = setTimeout(() => {
      if (id === sequence) showSpinner.value = true
    }, delay)
    try {
      const data = await task(current.signal)
      if (id !== sequence) return undefined
      state.value = reduceAsync(state.value, { type: 'resolve', data })
      return data
    } catch (error) {
      if (id !== sequence || isAbortError(error)) return undefined
      state.value = reduceAsync(state.value, { type: 'reject', failure: toFailure(error) })
      return undefined
    } finally {
      if (id === sequence) stopSpinner()
    }
  }

  function cancel(): void {
    controller?.abort()
    controller = null
    sequence++
    stopSpinner()
  }

  function reset(): void {
    cancel()
    state.value = initialAsyncState<T>()
  }

  /** 写操作成功后，用服务端返回的权威数据直接更新（FS9-BR-02）。 */
  function setData(data: T): void {
    state.value = reduceAsync(state.value, { type: 'resolve', data })
  }

  if (getCurrentScope()) onScopeDispose(cancel)

  return { state, showSpinner, run, cancel, reset, setData }
}
