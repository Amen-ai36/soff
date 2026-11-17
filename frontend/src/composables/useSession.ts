// 会话状态。只用于决定显示哪些入口；权限以服务端响应为准（SPEC-M8-AUTH）。

import { computed, inject, reactive, type ComputedRef, type InjectionKey } from 'vue'
import type { ApiClient } from '../api/port'
import { toFailure, type Failure } from '../domain/errors'
import type { Session } from '../domain/types'

export interface SessionState {
  session: Session | null
  loaded: boolean
  failure: Failure | null
}

export interface SessionStore {
  readonly state: SessionState
  readonly isAdmin: ComputedRef<boolean>
  ensureLoaded(): Promise<void>
  refresh(): Promise<void>
  login(username: string, password: string): Promise<void>
  logout(): Promise<void>
}

export const SESSION_KEY: InjectionKey<SessionStore> = Symbol('SessionStore')

export function createSessionStore(api: ApiClient): SessionStore {
  const state = reactive<SessionState>({ session: null, loaded: false, failure: null })
  let pending: Promise<void> | null = null

  async function refresh(): Promise<void> {
    try {
      state.session = await api.getSession()
      state.failure = null
    } catch (error) {
      // 无法确认会话时按未登录处理，需要登录的页面会引导去登录。
      state.session = null
      state.failure = toFailure(error)
    } finally {
      state.loaded = true
    }
  }

  return {
    state,
    isAdmin: computed(() => state.session?.roles.includes('admin') ?? false),
    ensureLoaded() {
      if (state.loaded) return Promise.resolve()
      pending ??= refresh().finally(() => {
        pending = null
      })
      return pending
    },
    refresh,
    async login(username, password) {
      state.session = await api.login(username, password)
      state.loaded = true
      state.failure = null
    },
    async logout() {
      try {
        await api.logout()
      } finally {
        state.session = null
      }
    },
  }
}

export function useSession(): SessionStore {
  const store = inject(SESSION_KEY)
  if (!store) throw new Error('未注入 SessionStore')
  return store
}
