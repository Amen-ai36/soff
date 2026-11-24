// 路由表（架构文档 01 第 3 节）。路由守卫只做登录引导，不是权限控制；权限以服务端响应为准。

import { createRouter, type RouteRecordRaw, type Router, type RouterHistory } from 'vue-router'
import type { SessionStore } from './composables/useSession'
import type { FeatureDef } from './features/registry'

declare module 'vue-router' {
  interface RouteMeta {
    /** 需要登录：未登录时跳到登录页并带上回跳地址。 */
    requiresAuth?: boolean
    title?: string
  }
}

const FEATURE_COMPONENTS: Record<string, RouteRecordRaw['component']> = {
  'collab-path': () => import('./views/CollabExploreView.vue'),
}

export function buildRoutes(features: FeatureDef[]): RouteRecordRaw[] {
  const routes: RouteRecordRaw[] = [
    { path: '/', name: 'home', component: () => import('./views/HomeView.vue'), meta: { title: '首页' } },
    { path: '/works', name: 'works', component: () => import('./views/WorkSearchView.vue'), meta: { title: '成果检索' } },
    { path: '/works/:id', name: 'work', component: () => import('./views/WorkDetailView.vue'), meta: { title: '成果详情' } },
    { path: '/scholars', name: 'scholars', component: () => import('./views/ScholarSearchView.vue'), meta: { title: '学者检索' } },
    { path: '/scholars/:id', name: 'scholar', component: () => import('./views/ScholarPortalView.vue'), meta: { title: '学者门户' } },
    {
      path: '/scholars/:id/claim',
      name: 'claim',
      component: () => import('./views/ClaimApplyView.vue'),
      meta: { requiresAuth: true, title: '申请认领' },
    },
    {
      path: '/scholars/:id/maintain',
      name: 'maintain',
      component: () => import('./views/PortalMaintainView.vue'),
      meta: { requiresAuth: true, title: '维护门户' },
    },
    { path: '/me/claims', name: 'my-claims', component: () => import('./views/MyClaimsView.vue'), meta: { requiresAuth: true, title: '我的认领' } },
    { path: '/stats', name: 'stats', component: () => import('./views/StatsView.vue'), meta: { title: '统计分析' } },
    { path: '/login', name: 'login', component: () => import('./views/LoginView.vue'), meta: { title: '登录' } },
    {
      path: '/admin/review',
      name: 'admin-review',
      component: () => import('./views/AdminReviewView.vue'),
      meta: { requiresAuth: true, title: '认领审核' },
    },
    {
      path: '/admin/tasks',
      name: 'admin-tasks',
      component: () => import('./views/AdminTasksView.vue'),
      meta: { requiresAuth: true, title: '采集任务' },
    },
  ]
  for (const feature of features) {
    const component = FEATURE_COMPONENTS[feature.id]
    if (component) routes.push({ path: feature.path, name: feature.routeName, component, meta: { title: feature.title } })
  }
  routes.push({ path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('./views/NotFoundView.vue'), meta: { title: '页面不存在' } })
  return routes
}

export function createAppRouter(options: { history: RouterHistory; features: FeatureDef[]; session: SessionStore }): Router {
  const router = createRouter({
    history: options.history,
    routes: buildRoutes(options.features),
    scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 },
  })

  router.beforeEach(async (to) => {
    if (!to.meta.requiresAuth) return true
    await options.session.ensureLoaded()
    if (options.session.state.session) return true
    return { path: '/login', query: { redirect: to.fullPath } }
  })

  router.afterEach((to) => {
    if (typeof document !== 'undefined') document.title = `${to.meta.title ?? '学术成果分享平台'} - 学术成果分享平台`
  })

  return router
}
