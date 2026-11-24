<script setup lang="ts">
// 检索筛选面板。顺序依据真实问卷 Q6（n=30）：领域 23、类型 16、年份 15、机构 4（SPEC-M9-SEARCH-UI）。
import { reactive, watch } from 'vue'
import { TYPE_LABEL } from '../domain/display'
import { validateYearRange } from '../domain/searchQuery'
import { WORK_TYPES, type Facets, type WorkQuery, type WorkType } from '../domain/types'

const props = defineProps<{
  query: WorkQuery
  facets: Facets | null
  facetsFailed: boolean
  yearFromText: string
  yearToText: string
  urlErrors: Record<string, string>
}>()
const emit = defineEmits<{ update: [patch: Partial<WorkQuery>]; retryFacets: [] }>()

const years = reactive({ from: '', to: '' })
const yearErrors = reactive<Record<string, string>>({})

function setYearErrors(source: Record<string, string>): void {
  for (const key of Object.keys(yearErrors)) delete yearErrors[key]
  for (const key of ['yearFrom', 'yearTo']) if (source[key]) yearErrors[key] = source[key]
}

watch(
  () => [props.yearFromText, props.yearToText, props.urlErrors] as const,
  ([from, to, errors]) => {
    years.from = from
    years.to = to
    setYearErrors(errors)
  },
  { immediate: true },
)

function toggle<T extends string>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

function applyYears(): void {
  const result = validateYearRange(years.from, years.to)
  setYearErrors(result.errors)
  if (Object.keys(result.errors).length === 0) emit('update', { yearFrom: result.yearFrom, yearTo: result.yearTo })
}

function onType(type: WorkType): void {
  emit('update', { types: toggle(props.query.types, type) })
}
</script>

<template>
  <aside aria-label="筛选条件">
    <p v-if="facetsFailed" class="notice notice-error small" role="alert">
      领域和机构筛选项加载失败，检索结果不受影响。
      <button type="button" @click="emit('retryFacets')">重新加载筛选项</button>
    </p>

    <fieldset>
      <legend>研究领域</legend>
      <p v-if="!facets && !facetsFailed" class="small muted">正在加载…</p>
      <div v-for="field in facets?.fields ?? []" :key="field.id">
        <label class="small">
          <input
            type="checkbox"
            :value="field.id"
            :checked="query.fieldIds.includes(field.id)"
            @change="emit('update', { fieldIds: toggle(query.fieldIds, field.id) })"
          />
          {{ field.name ?? field.id }}
        </label>
      </div>
    </fieldset>

    <fieldset>
      <legend>成果类型</legend>
      <div v-for="type in WORK_TYPES" :key="type">
        <label class="small">
          <input type="checkbox" :value="type" :checked="query.types.includes(type)" @change="onType(type)" />
          {{ TYPE_LABEL[type] }}
        </label>
      </div>
      <p v-if="urlErrors.types" class="field-error">{{ urlErrors.types }}</p>
    </fieldset>

    <form @submit.prevent="applyYears">
      <fieldset>
        <legend>年份</legend>
        <div class="row">
          <label class="visually-hidden" for="year-from">起始年份</label>
          <input
            id="year-from"
            v-model="years.from"
            inputmode="numeric"
            size="6"
            placeholder="起始"
            :aria-invalid="yearErrors.yearFrom ? 'true' : undefined"
            aria-describedby="year-error"
          />
          <span aria-hidden="true">–</span>
          <label class="visually-hidden" for="year-to">结束年份</label>
          <input
            id="year-to"
            v-model="years.to"
            inputmode="numeric"
            size="6"
            placeholder="结束"
            :aria-invalid="yearErrors.yearTo ? 'true' : undefined"
            aria-describedby="year-error"
          />
          <button type="submit">应用</button>
        </div>
        <p id="year-error" class="field-error" aria-live="polite">{{ yearErrors.yearFrom ?? yearErrors.yearTo ?? '' }}</p>
        <p class="small muted">设置年份后，年份未知的记录不会出现。</p>
      </fieldset>
    </form>

    <fieldset>
      <legend>机构</legend>
      <div v-for="inst in facets?.institutions ?? []" :key="inst.id">
        <label class="small">
          <input
            type="checkbox"
            :value="inst.id"
            :checked="query.institutionIds.includes(inst.id)"
            @change="emit('update', { institutionIds: toggle(query.institutionIds, inst.id) })"
          />
          {{ inst.name ?? inst.id }}
        </label>
      </div>
    </fieldset>
  </aside>
</template>
