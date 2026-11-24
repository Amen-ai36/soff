<script setup lang="ts">
// 首页：检索为主，领域为第二入口。依据真实问卷 Q4（n=30）：从关键词进入 15 人，从领域分类进入 9 人。
import { onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import LoadStateView from '../components/LoadStateView.vue'
import { useApi } from '../composables/useApi'
import { useAsync } from '../composables/useAsync'
import { MESSAGES, MAX_KEYWORD_LENGTH } from '../domain/searchQuery'
import type { Facets } from '../domain/types'

const api = useApi()
const router = useRouter()
const target = ref<'works' | 'scholars'>('works')
const keyword = ref('')
const error = ref('')
const { state: facetState, showSpinner: facetSpinner, run: runFacets } = useAsync<Facets>()

function loadFacets(): void {
  void runFacets((signal) => api.getFacets({ signal }))
}

onMounted(loadFacets)

function submit(): void {
  const q = keyword.value.trim()
  if (q.length > MAX_KEYWORD_LENGTH) {
    error.value = MESSAGES.keywordTooLong
    return
  }
  error.value = ''
  if (target.value === 'works') void router.push({ path: '/works', query: q === '' ? {} : { q } })
  else void router.push({ path: '/scholars', query: q === '' ? {} : { name: q } })
}
</script>

<template>
  <div class="page">
    <h1>检索学术成果</h1>
    <form role="search" class="stack" @submit.prevent="submit">
      <fieldset class="row">
        <legend>检索对象</legend>
        <label><input v-model="target" type="radio" value="works" /> 成果</label>
        <label><input v-model="target" type="radio" value="scholars" /> 学者</label>
      </fieldset>
      <div class="row">
        <label for="home-q">关键词</label>
        <input
          id="home-q"
          v-model="keyword"
          type="search"
          size="40"
          :placeholder="target === 'works' ? '主题词或题名中的词' : '学者姓名'"
          :aria-invalid="error ? 'true' : undefined"
          aria-describedby="home-q-hint home-q-error"
        />
        <button type="submit" class="primary">检索</button>
      </div>
      <p id="home-q-error" class="field-error" aria-live="polite">{{ error }}</p>
      <p id="home-q-hint" class="small muted">
        成果检索匹配题名、关键词和摘要；查找作者请选择“学者”。可以不填关键词，直接浏览全部公开成果。
      </p>
    </form>

    <section aria-labelledby="home-fields">
      <h2 id="home-fields">按研究领域浏览</h2>
      <LoadStateView :state="facetState" :show-spinner="facetSpinner" @retry="loadFacets">
        <ul v-if="facetState.data" class="row" role="list">
          <li v-for="field in facetState.data.fields" :key="field.id" class="card">
            <RouterLink :to="{ path: '/works', query: { field: field.id } }">{{ field.name ?? field.id }}</RouterLink>
          </li>
        </ul>
        <p v-if="facetState.data && facetState.data.fields.length === 0" class="muted">暂无领域分类。</p>
      </LoadStateView>
    </section>
  </div>
</template>
