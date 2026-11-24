<script setup lang="ts">
// 合作路径探索（创新候选，ADR-M9-04；SPEC-M9-STATS-COLLAB-UI 第 2 节）。路径与中心度在浏览器端计算。
import { computed, reactive, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import LoadStateView from '../components/LoadStateView.vue'
import { useApi } from '../composables/useApi'
import { useAsync } from '../composables/useAsync'
import { buildGraph, degreeCentrality, shortestPath } from '../domain/collabGraph'
import { compareCodePoints } from '../domain/compare'
import type { Collaborations, Facets } from '../domain/types'

const api = useApi()
const route = useRoute()
const router = useRouter()
const { state, showSpinner, run } = useAsync<Collaborations>()
const { state: facetState, run: runFacets } = useAsync<Facets>()

function many(key: string): string[] {
  const v = route.query[key]
  const list = Array.isArray(v) ? v : v === undefined || v === null ? [] : [v]
  return list.filter((x): x is string => typeof x === 'string' && x !== '')
}

const from = computed(() => many('from')[0] ?? '')
const to = computed(() => many('to')[0] ?? '')
const fieldIds = computed(() => many('field'))
const institutionIds = computed(() => many('inst'))
const draft = reactive({ from: '', to: '', field: '', inst: '' })

function load(): void {
  const filter = { fieldIds: fieldIds.value, institutionIds: institutionIds.value }
  void run((signal) => api.getCollaborations(filter, { signal }))
}

watch(
  () => route.query,
  () => {
    if (route.name !== 'collab') return
    draft.from = from.value
    draft.to = to.value
    draft.field = fieldIds.value[0] ?? ''
    draft.inst = institutionIds.value[0] ?? ''
    load()
  },
  { immediate: true },
)
void runFacets((signal) => api.getFacets({ signal }))

const data = computed(() => state.value.data)
const nodes = computed(() => [...(data.value?.nodes ?? [])].sort((a, b) => compareCodePoints(a.id, b.id)))
const graph = computed(() => (data.value ? buildGraph(data.value.edges, data.value.nodes.map((n) => n.id)) : null))
const centrality = computed(() => (graph.value ? degreeCentrality(graph.value).slice(0, 10) : []))
const path = computed(() => (graph.value && from.value && to.value ? shortestPath(graph.value, from.value, to.value) : undefined))

// 同名学者是不同实体，名称后附编号以便区分（IA9-RULE-08）。
function nameOf(id: string): string {
  const name = data.value?.nodes.find((n) => n.id === id)?.name
  return name ? `${name}（${id}）` : id
}

function apply(): void {
  const query: Record<string, string> = {}
  if (draft.from) query.from = draft.from
  if (draft.to) query.to = draft.to
  if (draft.field) query.field = draft.field
  if (draft.inst) query.inst = draft.inst
  void router.push({ path: '/explore/collab', query })
}
</script>

<template>
  <div class="page">
    <h1>合作路径探索 <span class="badge badge-warning">候选功能</span></h1>
    <p class="small muted">
      查看两位学者之间最少经过几位合作者能联系起来，以及每一步依据的共同成果。合作关系来自共同作者记录，作者区分有误时路径也会出错。
      该功能是否计为团队创新尚待确认；模拟模式下的路径没有学术含义。
    </p>

    <form class="row" aria-label="路径条件" @submit.prevent="apply">
      <label for="collab-from">起点学者</label>
      <select id="collab-from" v-model="draft.from">
        <option value="">请选择</option>
        <option v-for="n in nodes" :key="n.id" :value="n.id">{{ n.name ?? n.id }}（{{ n.id }}）</option>
      </select>
      <label for="collab-to">终点学者</label>
      <select id="collab-to" v-model="draft.to">
        <option value="">请选择</option>
        <option v-for="n in nodes" :key="n.id" :value="n.id">{{ n.name ?? n.id }}（{{ n.id }}）</option>
      </select>
      <label for="collab-field">领域范围</label>
      <select id="collab-field" v-model="draft.field">
        <option value="">不限</option>
        <option v-for="f in facetState.data?.fields ?? []" :key="f.id" :value="f.id">{{ f.name ?? f.id }}</option>
      </select>
      <label for="collab-inst">机构范围</label>
      <select id="collab-inst" v-model="draft.inst">
        <option value="">不限</option>
        <option v-for="i in facetState.data?.institutions ?? []" :key="i.id" :value="i.id">{{ i.name ?? i.id }}</option>
      </select>
      <button type="submit" class="primary">查找</button>
    </form>

    <LoadStateView :state="state" :show-spinner="showSpinner" @retry="load">
      <template v-if="data">
        <p class="small muted">当前范围：{{ data.nodes.length }} 位学者，{{ data.edges.length }} 对合作关系 · 数据版本 {{ data.dataVersion }}</p>

        <section aria-labelledby="collab-path">
          <h2 id="collab-path">合作路径</h2>
          <p v-if="!from || !to" class="muted">请选择起点和终点学者。</p>
          <p v-else-if="path === null" class="notice" role="status">在当前范围内，两位学者之间没有合作关系链。</p>
          <template v-else-if="path">
            <p role="status">
              <template v-if="path.steps.length === 0">起点与终点是同一位学者。</template>
              <template v-else>经过 {{ path.steps.length }} 步合作联系起来：</template>
            </p>
            <ol>
              <li v-for="step in path.steps" :key="`${step.from}-${step.to}`">
                {{ nameOf(step.from) }} — {{ nameOf(step.to) }}：共同成果 {{ step.weight }} 项
                <span class="small">
                  （<template v-for="(w, i) in step.workIds" :key="w"><template v-if="i > 0">、</template><RouterLink :to="`/works/${encodeURIComponent(w)}`">{{ w }}</RouterLink></template>）
                </span>
              </li>
            </ol>
          </template>
        </section>

        <section aria-labelledby="collab-centrality">
          <h2 id="collab-centrality">合作者最多的学者</h2>
          <p v-if="centrality.length === 0" class="muted">无数据。</p>
          <table v-else>
            <thead>
              <tr><th scope="col">学者</th><th scope="col">合作者人数</th><th scope="col">度中心性</th></tr>
            </thead>
            <tbody>
              <tr v-for="row in centrality" :key="row.id">
                <td>
                  <RouterLink :to="`/scholars/${encodeURIComponent(row.id)}`">{{ nameOf(row.id) }}</RouterLink>
                </td>
                <td>{{ row.degree }}</td>
                <td>{{ row.centrality.toFixed(2) }}</td>
              </tr>
            </tbody>
          </table>
          <p class="small muted">度中心性 = 合作者人数 ÷（范围内学者数 − 1）。</p>
        </section>
      </template>
    </LoadStateView>
  </div>
</template>
