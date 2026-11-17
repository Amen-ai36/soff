<script setup lang="ts">
// 学者门户（IA9-SEQ-05）。首屏为研究方向与成果列表：真实问卷 Q14（n=23）研究方向 17 人、成果列表 14 人、合作者 6 人。
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import LoadStateView from '../components/LoadStateView.vue'
import WorkCard from '../components/WorkCard.vue'
import { useApi } from '../composables/useApi'
import { useAsync } from '../composables/useAsync'
import { useSession } from '../composables/useSession'
import { TYPE_LABEL, formatCount, formatRefs, formatText, isSafeHttpUrl } from '../domain/display'
import { findPendingApplication, portalEntry, portalStatusText } from '../domain/portalEntry'
import { WORK_TYPES, type ClaimApplication, type ScholarPortal, type WorkType } from '../domain/types'
import { isFeatureEnabled, useFeatures } from '../features/registry'

const api = useApi()
const route = useRoute()
const session = useSession()
const features = useFeatures()
const { state, showSpinner, run } = useAsync<ScholarPortal>()
const myClaims = ref<ClaimApplication[] | null>(null)

const id = computed(() => String(route.params.id))
const base = computed(() => `/scholars/${encodeURIComponent(id.value)}`)
const portal = computed(() => state.value.data)

async function loadMyClaims(): Promise<void> {
  myClaims.value = null
  if (!session.state.session) return
  try {
    myClaims.value = await api.listMyClaims()
  } catch {
    // 只影响入口提示；提交时服务端仍会拒绝重复申请。
    myClaims.value = null
  }
}

async function load(): Promise<void> {
  if (route.name !== 'scholar') return
  const scholarId = id.value
  await session.ensureLoaded()
  void loadMyClaims()
  await run((signal) => api.getPortal(scholarId, { signal }))
}

watch(id, () => void load(), { immediate: true })

const entry = computed(() => {
  if (!portal.value) return null
  const current = session.state.session
  return portalEntry({
    loggedIn: current !== null,
    maintains: current?.scholarIds.includes(id.value) ?? false,
    pendingApplicationId: findPendingApplication(myClaims.value, id.value),
    claimed: portal.value.claimed,
  })
})

type Tab = WorkType | 'all'
const TABS: Tab[] = ['all', ...WORK_TYPES]

const tab = computed<Tab>(() => {
  const t = route.query.type
  return typeof t === 'string' && (WORK_TYPES as readonly string[]).includes(t) ? (t as WorkType) : 'all'
})

function tabLabel(t: Tab): string {
  return t === 'all' ? '全部' : TYPE_LABEL[t]
}

function countOf(t: Tab): number {
  const works = portal.value?.works ?? []
  return t === 'all' ? works.length : works.filter((w) => w.type === t).length
}

const visibleWorks = computed(() => {
  const works = portal.value?.works ?? []
  return tab.value === 'all' ? works : works.filter((w) => w.type === tab.value)
})

const showCollab = computed(() => isFeatureEnabled(features, 'collab-path'))
</script>

<template>
  <div class="page">
    <LoadStateView :state="state" :show-spinner="showSpinner" @retry="load">
      <template v-if="portal">
        <h1>{{ portal.scholar.name }}</h1>
        <p class="small muted">学者编号：{{ portal.scholar.id }} · 公开成果 {{ formatCount(portal.scholar.workCount) }} 项</p>

        <section aria-label="认领状态" class="notice">
          <p>{{ portalStatusText(portal.claimed) }}</p>
          <template v-if="entry">
            <RouterLink v-if="entry.kind === 'login_to_claim'" :to="{ path: '/login', query: { redirect: `${base}/claim` } }">
              登录后申请认领
            </RouterLink>
            <RouterLink v-else-if="entry.kind === 'claim'" :to="`${base}/claim`">申请认领该门户</RouterLink>
            <RouterLink v-else-if="entry.kind === 'view_application'" to="/me/claims">
              你已提交申请（{{ entry.applicationId }}），查看审核进度
            </RouterLink>
            <RouterLink v-else-if="entry.kind === 'maintain'" :to="`${base}/maintain`">维护门户</RouterLink>
            <p v-else class="small">该门户已被认领。</p>
          </template>
        </section>

        <h2>研究方向与简介</h2>
        <dl>
          <dt>研究领域</dt>
          <dd>{{ formatRefs(portal.scholar.fields) }}</dd>
          <dt>简介</dt>
          <dd>{{ formatText(portal.bio) }}</dd>
          <dt>机构</dt>
          <dd>{{ formatRefs(portal.scholar.institutions) }}</dd>
          <dt>个人主页</dt>
          <dd>
            <a
              v-if="portal.homepage && isSafeHttpUrl(portal.homepage)"
              :href="portal.homepage"
              target="_blank"
              rel="noopener noreferrer"
              >{{ portal.homepage }}</a
            >
            <span v-else>未提供</span>
          </dd>
        </dl>

        <h2>成果</h2>
        <nav class="row" aria-label="成果类型">
          <RouterLink
            v-for="t in TABS"
            :key="t"
            :to="{ query: t === 'all' ? {} : { type: t } }"
            :aria-current="tab === t ? 'page' : undefined"
            class="chip"
          >
            {{ tabLabel(t) }}（{{ countOf(t) }}）
          </RouterLink>
        </nav>
        <p v-if="visibleWorks.length === 0" class="muted">暂无{{ tab === 'all' ? '公开成果' : tabLabel(tab) }}。</p>
        <WorkCard v-for="work in visibleWorks" :key="work.id" :work="work" />

        <p v-if="showCollab" class="small">
          <RouterLink :to="{ path: '/explore/collab', query: { from: portal.scholar.id } }">查看该学者的合作路径</RouterLink>
          <span class="muted">（候选功能）</span>
        </p>
      </template>
    </LoadStateView>
  </div>
</template>
