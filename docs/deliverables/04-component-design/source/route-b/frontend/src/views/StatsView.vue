<script setup lang="ts">
// 统计分析（SPEC-M9-STATS-COLLAB-UI 第 1 节）。五个区块独立加载，一块失败不影响其他块（EX9-R-07）。
import { computed, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LoadStateView from '../components/LoadStateView.vue'
import StatsMetaNote from '../components/StatsMetaNote.vue'
import { useApi } from '../composables/useApi'
import { useAsync } from '../composables/useAsync'
import { TYPE_LABEL, formatDelta, formatShare } from '../domain/display'
import { MESSAGES, validateYearRange } from '../domain/searchQuery'
import {
  WORK_TYPES,
  type Collaborations,
  type FieldDistribution,
  type Hotspots,
  type InstitutionRanking,
  type StatsFilter,
  type TypeDistribution,
  type WorkType,
} from '../domain/types'

const api = useApi()
const route = useRoute()
const router = useRouter()

const types = useAsync<TypeDistribution>()
const institutions = useAsync<InstitutionRanking>()
const fields = useAsync<FieldDistribution>()
const hotspots = useAsync<Hotspots>()
const collabs = useAsync<Collaborations>()

function many(key: string): string[] {
  const v = route.query[key]
  const list = Array.isArray(v) ? v : v === undefined || v === null ? [] : [v]
  return list.filter((x): x is string => typeof x === 'string')
}

function one(key: string): string {
  return many(key)[0] ?? ''
}

const parsed = computed(() => {
  const errors: Record<string, string> = {}
  const selectedTypes: WorkType[] = []
  for (const t of many('type')) {
    if ((WORK_TYPES as readonly string[]).includes(t)) {
      if (!selectedTypes.includes(t as WorkType)) selectedTypes.push(t as WorkType)
    } else errors.types = MESSAGES.unknownType
  }
  const years = validateYearRange(one('from'), one('to'))
  Object.assign(errors, years.errors)
  const filter: StatsFilter = { types: selectedTypes, yearFrom: years.yearFrom, yearTo: years.yearTo }
  return { filter, errors }
})

const invalid = computed(() => Object.keys(parsed.value.errors).length > 0)
const draft = reactive({ types: [] as WorkType[], from: '', to: '' })

function loadAll(): void {
  if (invalid.value) return
  const f = parsed.value.filter
  void types.run((signal) => api.getTypeDistribution(f, { signal }))
  void institutions.run((signal) => api.getInstitutionRanking(f, { signal }))
  void fields.run((signal) => api.getFieldDistribution(f, { signal }))
  void hotspots.run((signal) => api.getHotspots(f, { signal }))
  void collabs.run((signal) => api.getCollaborations({ fieldIds: [], institutionIds: [] }, { signal }))
}

watch(
  () => route.query,
  () => {
    if (route.name !== 'stats') return
    draft.types = [...parsed.value.filter.types]
    draft.from = one('from')
    draft.to = one('to')
    loadAll()
  },
  { immediate: true },
)

function apply(): void {
  const query: Record<string, string | string[]> = {}
  if (draft.types.length > 0) query.type = [...draft.types]
  if (draft.from.trim() !== '') query.from = draft.from.trim()
  if (draft.to.trim() !== '') query.to = draft.to.trim()
  void router.push({ path: '/stats', query })
}

// 同名学者是不同实体，名称后附编号以便区分（IA9-RULE-08）。
function scholarName(data: Collaborations, id: string): string {
  const name = data.nodes.find((n) => n.id === id)?.name
  return name ? `${name}（${id}）` : id
}

function barWidth(share: number | null): string {
  return share === null ? '0%' : `${Math.min(100, Math.round(share * 100))}%`
}
</script>

<template>
  <div class="page">
    <h1>统计分析</h1>
    <p class="small muted">统计范围与检索一致，只包含公开成果。模拟模式下的数字来自合成数据，没有实际含义。</p>

    <form class="row" aria-label="统计范围" @submit.prevent="apply">
      <fieldset class="row">
        <legend>成果类型</legend>
        <label v-for="t in WORK_TYPES" :key="t" class="small">
          <input v-model="draft.types" type="checkbox" :value="t" /> {{ TYPE_LABEL[t] }}
        </label>
      </fieldset>
      <label for="stats-from">起始年份</label>
      <input id="stats-from" v-model="draft.from" inputmode="numeric" size="6" />
      <label for="stats-to">结束年份</label>
      <input id="stats-to" v-model="draft.to" inputmode="numeric" size="6" />
      <button type="submit" class="primary">应用</button>
    </form>

    <div v-if="invalid" class="notice notice-error" role="alert">
      <p>统计范围有误：</p>
      <ul>
        <li v-for="(message, key) in parsed.errors" :key="key">{{ message }}</li>
      </ul>
    </div>

    <template v-else>
      <section aria-labelledby="stats-types">
        <h2 id="stats-types">成果类型分布</h2>
        <LoadStateView :state="types.state.value" :show-spinner="types.showSpinner.value" @retry="loadAll">
          <template v-if="types.state.value.data">
            <table>
              <thead>
                <tr><th scope="col">类型</th><th scope="col">数量</th><th scope="col">占比</th><th scope="col"><span class="visually-hidden">图示</span></th></tr>
              </thead>
              <tbody>
                <tr v-for="g in types.state.value.data.groups" :key="g.type">
                  <td>{{ TYPE_LABEL[g.type] }}</td>
                  <td>{{ g.count }}</td>
                  <td>{{ formatShare(g.share) }}</td>
                  <td class="bar-cell"><div class="bar" :style="{ width: barWidth(g.share) }" aria-hidden="true" /></td>
                </tr>
              </tbody>
            </table>
            <StatsMetaNote :meta="types.state.value.data" unknown-label="类型未知" />
          </template>
        </LoadStateView>
      </section>

      <section aria-labelledby="stats-inst">
        <h2 id="stats-inst">机构排名</h2>
        <LoadStateView :state="institutions.state.value" :show-spinner="institutions.showSpinner.value" @retry="loadAll">
          <template v-if="institutions.state.value.data">
            <p v-if="institutions.state.value.data.rows.length === 0" class="muted">无数据。</p>
            <table v-else>
              <thead>
                <tr><th scope="col">名次</th><th scope="col">机构</th><th scope="col">成果数</th></tr>
              </thead>
              <tbody>
                <tr v-for="row in institutions.state.value.data.rows" :key="row.institution.id">
                  <td>{{ row.rank }}</td>
                  <td>{{ row.institution.name ?? row.institution.id }}</td>
                  <td>{{ row.count }}</td>
                </tr>
              </tbody>
            </table>
            <p class="small muted">名次并列时后续名次跳号（例如 1、1、3）。</p>
            <StatsMetaNote :meta="institutions.state.value.data" unknown-label="无机构信息" />
          </template>
        </LoadStateView>
      </section>

      <section aria-labelledby="stats-fields">
        <h2 id="stats-fields">领域分布</h2>
        <LoadStateView :state="fields.state.value" :show-spinner="fields.showSpinner.value" @retry="loadAll">
          <template v-if="fields.state.value.data">
            <p v-if="fields.state.value.data.rows.length === 0" class="muted">无数据。</p>
            <table v-else>
              <thead>
                <tr><th scope="col">领域</th><th scope="col">数量</th><th scope="col">占比</th><th scope="col"><span class="visually-hidden">图示</span></th></tr>
              </thead>
              <tbody>
                <tr v-for="row in fields.state.value.data.rows" :key="row.field.id">
                  <td>{{ row.field.name ?? row.field.id }}</td>
                  <td>{{ row.count }}</td>
                  <td>{{ formatShare(row.share) }}</td>
                  <td class="bar-cell"><div class="bar" :style="{ width: barWidth(row.share) }" aria-hidden="true" /></td>
                </tr>
              </tbody>
            </table>
            <StatsMetaNote :meta="fields.state.value.data" unknown-label="无领域信息" />
          </template>
        </LoadStateView>
      </section>

      <section aria-labelledby="stats-hot">
        <h2 id="stats-hot">领域热点（按年份）</h2>
        <LoadStateView :state="hotspots.state.value" :show-spinner="hotspots.showSpinner.value" @retry="loadAll">
          <template v-if="hotspots.state.value.data">
            <p v-if="hotspots.state.value.data.years.length === 0" class="muted">无数据。</p>
            <div v-for="year in hotspots.state.value.data.years" :key="year.year" class="card">
              <h3>{{ year.year }} 年（当年成果 {{ year.denominator }} 条）</h3>
              <table>
                <thead>
                  <tr><th scope="col">领域</th><th scope="col">数量</th><th scope="col">占当年比例</th><th scope="col">较上一年</th></tr>
                </thead>
                <tbody>
                  <tr v-for="row in year.rows" :key="row.field.id">
                    <td>{{ row.field.name ?? row.field.id }}</td>
                    <td>{{ row.count }}</td>
                    <td>{{ formatShare(row.share) }}</td>
                    <td>{{ formatDelta(row.delta) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="small muted">只描述已有记录的分布，不表示预测或因果。</p>
            <StatsMetaNote :meta="hotspots.state.value.data" unknown-label="年份未知" />
          </template>
        </LoadStateView>
      </section>

      <section aria-labelledby="stats-collab">
        <h2 id="stats-collab">合作关系（合作次数最多的前 10 对）</h2>
        <LoadStateView :state="collabs.state.value" :show-spinner="collabs.showSpinner.value" @retry="loadAll">
          <template v-if="collabs.state.value.data">
            <p v-if="collabs.state.value.data.edges.length === 0" class="muted">无数据。</p>
            <table v-else>
              <thead>
                <tr><th scope="col">学者</th><th scope="col">学者</th><th scope="col">共同成果数</th></tr>
              </thead>
              <tbody>
                <tr v-for="edge in collabs.state.value.data.edges.slice(0, 10)" :key="`${edge.a}-${edge.b}`">
                  <td>{{ scholarName(collabs.state.value.data, edge.a) }}</td>
                  <td>{{ scholarName(collabs.state.value.data, edge.b) }}</td>
                  <td>{{ edge.weight }}</td>
                </tr>
              </tbody>
            </table>
            <p class="small muted">合作关系不受上方类型与年份范围影响。</p>
            <StatsMetaNote :meta="collabs.state.value.data" unknown-label="无作者信息" />
          </template>
        </LoadStateView>
      </section>
    </template>
  </div>
</template>
