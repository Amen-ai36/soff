<script setup lang="ts">
// 成果检索结果页。规则见 SPEC-M9-SEARCH-UI；URL 是检索状态的唯一来源（ADR-M9-03）。
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import FilterPanel from '../components/FilterPanel.vue'
import LoadStateView from '../components/LoadStateView.vue'
import PaginationBar from '../components/PaginationBar.vue'
import WorkCard from '../components/WorkCard.vue'
import { useApi } from '../composables/useApi'
import { useAsync } from '../composables/useAsync'
import { SORT_LABEL, TYPE_LABEL, formatDateTime } from '../domain/display'
import { classifyPage, versionChangedWhilePaging, type SeenPage } from '../domain/loadState'
import {
  clearFilters,
  hasFilters,
  parseWorkQuery,
  removeFilter,
  serializeWorkQuery,
  updateWorkQuery,
  type FilterKey,
} from '../domain/searchQuery'
import { WORK_SORTS, type Facets, type Page, type Ref, type WorkQuery, type WorkSort, type WorkSummary } from '../domain/types'

const api = useApi()
const route = useRoute()
const router = useRouter()
const { state, showSpinner, run, reset } = useAsync<Page<WorkSummary>>()
const { state: facetState, run: runFacets } = useAsync<Facets>()
const keyword = ref('')
const keywordInput = ref<HTMLInputElement | null>(null)
const stale = ref(false)
let lastSeen: SeenPage | null = null

const parsed = computed(() => parseWorkQuery(route.query))
const query = computed(() => parsed.value.query)
const invalid = computed(() => Object.keys(parsed.value.errors).length > 0)
const data = computed(() => state.value.data)
const outcome = computed(() => (data.value ? classifyPage(data.value) : null))

function rawFirst(key: string): string {
  const v = route.query[key]
  const x = Array.isArray(v) ? v[0] : v
  return typeof x === 'string' ? x : ''
}

function go(next: WorkQuery): void {
  void router.push({ path: '/works', query: serializeWorkQuery(next) })
}

function update(patch: Partial<WorkQuery>): void {
  go(updateWorkQuery(query.value, patch))
}

async function load(): Promise<void> {
  if (invalid.value) {
    // 非法条件不发请求、不显示空结果（IA9-RULE-05）。
    reset()
    return
  }
  const q = query.value
  const page = await run((signal) => api.searchWorks(q, { signal }))
  if (page) {
    const seen = { query: q, dataVersion: page.dataVersion }
    stale.value = versionChangedWhilePaging(lastSeen, seen)
    lastSeen = seen
  }
}

function loadFacets(): void {
  void runFacets((signal) => api.getFacets({ signal }))
}

watch(
  () => route.query,
  () => {
    if (route.name !== 'works') return
    keyword.value = query.value.q
    void load()
  },
  { immediate: true },
)
loadFacets()

function submitKeyword(): void {
  update({ q: keyword.value.trim() })
}

function onSort(event: Event): void {
  update({ sort: (event.target as HTMLSelectElement).value as WorkSort })
}

function restart(): void {
  lastSeen = null
  stale.value = false
  if (query.value.page === 1) void load()
  else go({ ...query.value, page: 1 })
}

function fixInvalid(): void {
  const next = { ...query.value, page: 1 }
  if (parsed.value.errors.yearFrom || parsed.value.errors.yearTo) {
    next.yearFrom = null
    next.yearTo = null
  }
  go(next)
}

function nameOf(list: Ref[] | undefined, id: string): string {
  return list?.find((r) => r.id === id)?.name ?? id
}

interface Chip {
  key: FilterKey
  value?: string
  label: string
}

const chips = computed<Chip[]>(() => {
  const q = query.value
  const facets = facetState.value.data
  const out: Chip[] = []
  for (const t of q.types) out.push({ key: 'types', value: t, label: TYPE_LABEL[t] })
  if (q.yearFrom !== null || q.yearTo !== null) {
    const label =
      q.yearFrom !== null && q.yearTo !== null
        ? `年份 ${q.yearFrom}–${q.yearTo}`
        : q.yearFrom !== null
          ? `${q.yearFrom} 年起`
          : `至 ${q.yearTo} 年`
    out.push({ key: 'years', label })
  }
  for (const f of q.fieldIds) out.push({ key: 'fieldIds', value: f, label: nameOf(facets?.fields, f) })
  for (const i of q.institutionIds) out.push({ key: 'institutionIds', value: i, label: nameOf(facets?.institutions, i) })
  return out
})
</script>

<template>
  <div class="page">
    <h1>成果检索</h1>
    <form role="search" class="row" @submit.prevent="submitKeyword">
      <label for="work-q">关键词</label>
      <input
        id="work-q"
        ref="keywordInput"
        v-model="keyword"
        type="search"
        size="40"
        :aria-invalid="parsed.errors.q ? 'true' : undefined"
        aria-describedby="work-q-hint work-q-error"
      />
      <button type="submit" class="primary">检索</button>
    </form>
    <p id="work-q-error" class="field-error" aria-live="polite">{{ parsed.errors.q ?? '' }}</p>
    <p id="work-q-hint" class="small muted">
      匹配题名、关键词和摘要。查找作者请使用<RouterLink to="/scholars">学者检索</RouterLink>。
    </p>

    <div class="layout-search">
      <FilterPanel
        :query="query"
        :facets="facetState.data"
        :facets-failed="facetState.status === 'error'"
        :year-from-text="rawFirst('from')"
        :year-to-text="rawFirst('to')"
        :url-errors="parsed.errors"
        @update="update"
        @retry-facets="loadFacets"
      />

      <section aria-label="检索结果">
        <div class="row">
          <label for="work-sort">排序</label>
          <select id="work-sort" :value="query.sort" @change="onSort">
            <option v-for="s in WORK_SORTS" :key="s" :value="s">{{ SORT_LABEL[s] }}</option>
          </select>
          <span v-if="parsed.errors.sort" class="field-error">{{ parsed.errors.sort }}</span>
        </div>

        <div v-if="chips.length > 0" class="row" aria-label="已生效的筛选">
          <span class="small">已选条件：</span>
          <button
            v-for="chip in chips"
            :key="`${chip.key}-${chip.value ?? ''}`"
            type="button"
            class="chip"
            :aria-label="`移除筛选：${chip.label}`"
            @click="go(removeFilter(query, chip.key, chip.value))"
          >
            {{ chip.label }} ×
          </button>
          <button type="button" class="chip" @click="go(clearFilters(query))">清除全部筛选</button>
        </div>

        <div v-if="invalid" class="notice notice-error" role="alert">
          <p>检索条件有误，请修改后再检索：</p>
          <ul>
            <li v-for="(message, key) in parsed.errors" :key="key">{{ message }}</li>
          </ul>
          <button type="button" @click="fixInvalid">清除有误的条件</button>
        </div>

        <LoadStateView v-else :state="state" :show-spinner="showSpinner" @retry="load">
          <template v-if="data">
            <p v-if="stale" class="notice notice-warning" role="status">
              数据在你翻页期间已更新，翻页结果可能重复或遗漏。
              <button type="button" @click="restart">从第 1 页重新查看</button>
            </p>

            <template v-if="outcome === 'results'">
              <p class="small muted" role="status">
                共 {{ data.total }} 条，按{{ SORT_LABEL[query.sort] }}排序 · 数据版本 {{ data.dataVersion }} · 更新于
                {{ formatDateTime(data.updatedAt) }}
              </p>
              <WorkCard v-for="work in data.items" :key="work.id" :work="work" />
              <PaginationBar :page="query.page" :page-size="query.pageSize" :total="data.total" @change="(p) => update({ page: p })" />
            </template>

            <div v-else-if="outcome === 'empty'" class="notice" role="status">
              <p><strong>未找到匹配结果</strong></p>
              <p class="small">
                当前条件：关键词“{{ query.q === '' ? '（未填写）' : query.q }}”<template v-if="chips.length > 0">；筛选 {{ chips.map((c) => c.label).join('、') }}</template>
              </p>
              <div class="row">
                <button type="button" @click="keywordInput?.focus()">修改关键词</button>
                <button v-if="hasFilters(query)" type="button" @click="go(clearFilters(query))">清除全部筛选</button>
              </div>
              <p v-if="chips.length > 0" class="small muted">也可以点击上方“已选条件”逐个移除。</p>
            </div>

            <div v-else class="notice" role="status">
              <p>第 {{ query.page }} 页没有结果（共 {{ data.total }} 条）。</p>
              <button type="button" @click="go({ ...query, page: 1 })">回到第 1 页</button>
            </div>
          </template>
        </LoadStateView>
      </section>
    </div>
  </div>
</template>
