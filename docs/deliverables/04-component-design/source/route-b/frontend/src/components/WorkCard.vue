<script setup lang="ts">
// 成果卡片。信息顺序依据真实问卷 Q7（n=30）：标题 23 人、年份 16 人最先看，数据来源 0 人（SPEC-M9-SEARCH-UI 第 6 节）。
import { RouterLink } from 'vue-router'
import { TYPE_LABEL, formatAuthors, formatRefs, formatText, formatYear } from '../domain/display'
import type { WorkSummary } from '../domain/types'

defineProps<{ work: WorkSummary }>()
</script>

<template>
  <article class="card">
    <h3>
      <RouterLink :to="`/works/${encodeURIComponent(work.id)}`">{{ work.title }}</RouterLink>
      <span class="muted"> · {{ formatYear(work.year) }}</span>
    </h3>
    <p class="small">
      <span class="badge">{{ TYPE_LABEL[work.type] }}</span>
      作者：{{ formatAuthors(work.authors) }} · 出处：{{ formatText(work.venue) }}
    </p>
    <p class="small muted">领域：{{ formatRefs(work.fields) }} · 机构：{{ formatRefs(work.institutions) }}</p>
    <p class="small muted">
      数据来源：{{ formatText(work.source.name) }}
      <span v-if="work.simulated" class="badge badge-simulated">模拟数据</span>
    </p>
  </article>
</template>
