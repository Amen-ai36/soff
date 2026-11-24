<script setup lang="ts">
// 外壳：导航、会话入口与模拟模式提示。管理入口只是显示上的引导，权限以服务端为准。
import { computed } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useApi } from './composables/useApi'
import { useSession } from './composables/useSession'
import { useFeatures } from './features/registry'

const api = useApi()
const session = useSession()
const features = useFeatures()
const router = useRouter()

const user = computed(() => session.state.session)

async function logout(): Promise<void> {
  try {
    await session.logout()
  } finally {
    void router.push('/')
  }
}
</script>

<template>
  <a class="visually-hidden" href="#main">跳到主要内容</a>
  <header class="site-header">
    <div class="page row header-row">
      <RouterLink to="/" class="brand">学术成果分享平台</RouterLink>
      <nav aria-label="主导航" class="row">
        <RouterLink to="/works">成果</RouterLink>
        <RouterLink to="/scholars">学者</RouterLink>
        <RouterLink to="/stats">统计</RouterLink>
        <RouterLink v-for="f in features" :key="f.id" :to="f.path">
          {{ f.navLabel }}<span v-if="f.status === 'candidate'" class="small muted">（候选）</span>
        </RouterLink>
        <template v-if="session.isAdmin.value">
          <RouterLink to="/admin/review">认领审核</RouterLink>
          <RouterLink to="/admin/tasks">采集任务</RouterLink>
        </template>
      </nav>
      <div class="row user-area">
        <template v-if="user">
          <RouterLink to="/me/claims">我的认领</RouterLink>
          <span class="small">{{ user.displayName }}</span>
          <button type="button" @click="logout">退出</button>
        </template>
        <RouterLink v-else :to="{ path: '/login', query: { redirect: router.currentRoute.value.fullPath } }">登录</RouterLink>
      </div>
    </div>
  </header>
  <p v-if="api.mode === 'mock'" class="mock-banner" role="note">
    模拟模式：页面数据全部为合成数据，不是真实学术记录，也未连接后端服务。
  </p>
  <main id="main">
    <RouterView />
  </main>
</template>

<style scoped>
.site-header {
  border-bottom: 1px solid var(--color-surface);
  background: var(--color-background);
}

.header-row {
  justify-content: space-between;
  padding-top: var(--space-2);
  padding-bottom: var(--space-2);
}

.brand {
  font-weight: 700;
  text-decoration: none;
  color: var(--color-text);
}

nav a[aria-current='page'],
nav a.router-link-active {
  font-weight: 700;
}

.mock-banner {
  margin: 0;
  padding: var(--space-1) var(--space-3);
  text-align: center;
  font-size: 0.875rem;
  background: var(--color-simulated-bg);
  color: var(--color-simulated-text);
}
</style>
