<script setup lang="ts">
// 学者卡片。区分线索顺序依据真实问卷 Q12（n=30）：研究领域 18、代表成果 18、机构 11。
import { RouterLink } from 'vue-router'
import { formatCount, scholarClues } from '../domain/display'
import type { ScholarSummary } from '../domain/types'

defineProps<{ scholar: ScholarSummary; duplicate: boolean }>()
</script>

<template>
  <article class="card">
    <h3>
      <RouterLink :to="`/scholars/${encodeURIComponent(scholar.id)}`">{{ scholar.name }}</RouterLink>
      <span v-if="duplicate" class="badge badge-warning">同名</span>
    </h3>
    <dl class="clues">
      <template v-for="clue in scholarClues(scholar)" :key="clue.label">
        <dt>{{ clue.label }}</dt>
        <dd>{{ clue.value }}</dd>
      </template>
    </dl>
    <p class="small muted">公开成果数：{{ formatCount(scholar.workCount) }} · 学者编号：{{ scholar.id }}</p>
  </article>
</template>
