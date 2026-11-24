// 提交防重：进行中时忽略再次提交（架构文档 02 第 5 节）。

import { ref } from 'vue'
import { toFailure, type Failure } from '../domain/errors'

export type SubmitResult<T> = { ok: true; value: T } | { ok: false; failure: Failure }

export function useSubmit() {
  const pending = ref(false)

  /** 进行中再次调用返回 null，不执行 task。 */
  async function submit<T>(task: () => Promise<T>): Promise<SubmitResult<T> | null> {
    if (pending.value) return null
    pending.value = true
    try {
      return { ok: true, value: await task() }
    } catch (error) {
      return { ok: false, failure: toFailure(error) }
    } finally {
      pending.value = false
    }
  }

  return { pending, submit }
}
