// 测试辅助：用内存路由挂载页面，注入模拟 ApiClient、会话与功能开关。
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { RouterView, createMemoryHistory } from 'vue-router'
import type { ApiClient } from '../api/port'
import { API_KEY } from '../composables/useApi'
import { SESSION_KEY, createSessionStore } from '../composables/useSession'
import { FEATURES, FEATURES_KEY, type FeatureDef } from '../features/registry'
import { createAppRouter } from '../router'

enableAutoUnmount(afterEach)

export async function settle(rounds = 6): Promise<void> {
  for (let i = 0; i < rounds; i++) await flushPromises()
}

export async function mountRoute(path: string, api: ApiClient, features: FeatureDef[] = [...FEATURES]) {
  const session = createSessionStore(api)
  const router = createAppRouter({ history: createMemoryHistory(), features, session })
  await router.push(path)
  await router.isReady()
  const Root = defineComponent({ render: () => h(RouterView) })
  const wrapper = mount(Root, {
    attachTo: document.body,
    global: {
      plugins: [router],
      provide: {
        [API_KEY as symbol]: api,
        [SESSION_KEY as symbol]: session,
        [FEATURES_KEY as symbol]: features,
      },
    },
  })
  await settle()
  return { wrapper, router, session }
}
