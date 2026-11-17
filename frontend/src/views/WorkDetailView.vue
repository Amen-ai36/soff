<script setup lang="ts">
// 成果详情（IA9-SEQ-03）。来源与更新时间放在详情页；失效链接不生成跳转（IA9-RULE-07）。
import { computed, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import LoadStateView from '../components/LoadStateView.vue'
import { useApi } from '../composables/useApi'
import { useAsync } from '../composables/useAsync'
import {
  STALE_AFTER_DAYS,
  TYPE_LABEL,
  formatDateTime,
  formatList,
  formatRefs,
  formatText,
  formatYear,
  freshness,
  sourceLink,
  type LinkView,
} from '../domain/display'
import type { WorkDetail } from '../domain/types'

const api = useApi()
const route = useRoute()
const router = useRouter()
const { state, showSpinner, run } = useAsync<WorkDetail>()

const id = computed(() => String(route.params.id))
const work = computed(() => state.value.data)
const link = computed<LinkView>(() => (work.value ? sourceLink(work.value.source) : { kind: 'text', text: '' }))
const fresh = computed(() => (work.value ? freshness(work.value.updatedAt, new Date()) : 'unknown'))

function load(): void {
  if (route.name !== 'work') return
  const workId = id.value
  void run((signal) => api.getWork(workId, { signal }))
}

watch(id, load, { immediate: true })

function back(): void {
  // 有站内上一页时后退，检索条件与页码随 URL 恢复（IA9-RULE-06）。
  const previous = (window.history.state as { back?: unknown } | null)?.back
  if (typeof previous === 'string') router.back()
  else void router.push('/works')
}
</script>

<template>
  <div class="page">
    <p><button type="button" @click="back">← 返回</button></p>
    <LoadStateView :state="state" :show-spinner="showSpinner" @retry="load">
      <article v-if="work">
        <p v-if="work.simulated" class="notice" role="note">
          <span class="badge badge-simulated">模拟数据</span> 该记录为模拟数据，仅用于演示，不是真实学术成果。
        </p>
        <h1>{{ work.title }}</h1>
        <p>
          <span class="badge">{{ TYPE_LABEL[work.type] }}</span>
          {{ formatYear(work.year) }} · 出处：{{ formatText(work.venue) }}
        </p>

        <h2>作者</h2>
        <p v-if="work.authors.length === 0">无</p>
        <ul v-else>
          <li v-for="author in work.authors" :key="author.id">
            <RouterLink :to="`/scholars/${encodeURIComponent(author.id)}`">{{ author.name ?? '未提供姓名' }}</RouterLink>
          </li>
        </ul>
        <p class="small muted">如果你是其中一位作者，可以进入该学者门户申请认领。</p>

        <h2>基本信息</h2>
        <dl>
          <dt>研究领域</dt>
          <dd>{{ formatRefs(work.fields) }}</dd>
          <dt>机构</dt>
          <dd>{{ formatRefs(work.institutions) }}</dd>
          <dt>关键词</dt>
          <dd>{{ formatList(work.keywords) }}</dd>
          <dt>摘要</dt>
          <dd>{{ formatText(work.abstract) }}</dd>
        </dl>

        <h2>来源</h2>
        <p>数据来源：{{ formatText(work.source.name) }}</p>
        <p>
          <a v-if="link.kind === 'link'" :href="link.href" target="_blank" rel="noopener noreferrer">{{ link.text }}</a>
          <span v-else>{{ link.text }}</span>
        </p>
        <p>记录更新时间：{{ formatDateTime(work.updatedAt) }}</p>
        <p v-if="fresh === 'stale'" class="notice notice-warning" role="note">
          该记录超过 {{ STALE_AFTER_DAYS }} 天未更新，可能不是最新。
        </p>
        <p class="small muted">成果编号：{{ work.id }}</p>
      </article>
    </LoadStateView>
  </div>
</template>
