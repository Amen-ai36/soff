<script setup lang="ts">
// 学者检索与同名区分（IA9-SEQ-04）。同名实体全部保留，按 ID 进入门户（IA9-RULE-08、09）。
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LoadStateView from '../components/LoadStateView.vue'
import PaginationBar from '../components/PaginationBar.vue'
import ScholarCard from '../components/ScholarCard.vue'
import { useApi } from '../composables/useApi'
import { useAsync } from '../composables/useAsync'
import { duplicateNames, isDuplicateName } from '../domain/display'
import { classifyPage } from '../domain/loadState'
import { parseScholarQuery, serializeScholarQuery, updateScholarQuery } from '../domain/searchQuery'
import type { Page, ScholarQuery, ScholarSummary } from '../domain/types'

const api = useApi()
const route = useRoute()
const router = useRouter()
const { state, showSpinner, run, reset } = useAsync<Page<ScholarSummary>>()
const name = ref('')
const nameInput = ref<HTMLInputElement | null>(null)

const parsed = computed(() => parseScholarQuery(route.query))
const query = computed(() => parsed.value.query)
const invalid = computed(() => Object.keys(parsed.value.errors).length > 0)
const data = computed(() => state.value.data)
const outcome = computed(() => (data.value ? classifyPage(data.value) : null))
const duplicates = computed(() => duplicateNames(data.value?.items ?? []))

function go(next: ScholarQuery): void {
  void router.push({ path: '/scholars', query: serializeScholarQuery(next) })
}

function load(): void {
  if (invalid.value) {
    reset()
    return
  }
  const q = query.value
  void run((signal) => api.searchScholars(q, { signal }))
}

watch(
  () => route.query,
  () => {
    if (route.name !== 'scholars') return
    name.value = query.value.name
    load()
  },
  { immediate: true },
)

function submit(): void {
  go(updateScholarQuery(query.value, { name: name.value.trim() }))
}
</script>

<template>
  <div class="page">
    <h1>学者检索</h1>
    <form role="search" class="row" @submit.prevent="submit">
      <label for="scholar-name">学者姓名</label>
      <input
        id="scholar-name"
        ref="nameInput"
        v-model="name"
        type="search"
        size="30"
        :aria-invalid="parsed.errors.name ? 'true' : undefined"
        aria-describedby="scholar-name-error"
      />
      <button type="submit" class="primary">检索</button>
    </form>
    <p id="scholar-name-error" class="field-error" aria-live="polite">{{ parsed.errors.name ?? '' }}</p>

    <div v-if="invalid" class="notice notice-error" role="alert">
      <p>检索条件有误：</p>
      <ul>
        <li v-for="(message, key) in parsed.errors" :key="key">{{ message }}</li>
      </ul>
      <button type="button" @click="go({ ...query, page: 1 })">清除有误的条件</button>
    </div>

    <LoadStateView v-else :state="state" :show-spinner="showSpinner" @retry="load">
      <template v-if="data">
        <template v-if="outcome === 'results'">
          <p v-if="duplicates.size > 0" class="notice notice-warning" role="note">
            当前结果中有同名学者。请根据研究领域、代表成果和机构区分，它们是不同的学者记录。
          </p>
          <p class="small muted" role="status">共 {{ data.total }} 位学者</p>
          <ScholarCard
            v-for="scholar in data.items"
            :key="scholar.id"
            :scholar="scholar"
            :duplicate="isDuplicateName(duplicates, scholar.name)"
          />
          <PaginationBar
            :page="query.page"
            :page-size="query.pageSize"
            :total="data.total"
            @change="(p) => go(updateScholarQuery(query, { page: p }))"
          />
        </template>
        <div v-else-if="outcome === 'empty'" class="notice" role="status">
          <p><strong>未找到匹配的学者</strong></p>
          <button type="button" @click="nameInput?.focus()">修改姓名</button>
        </div>
        <div v-else class="notice" role="status">
          <p>第 {{ query.page }} 页没有结果（共 {{ data.total }} 位）。</p>
          <button type="button" @click="go({ ...query, page: 1 })">回到第 1 页</button>
        </div>
      </template>
    </LoadStateView>
  </div>
</template>
