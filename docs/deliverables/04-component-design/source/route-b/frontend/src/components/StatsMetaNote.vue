<script setup lang="ts">
// 统计口径说明（SPEC-M8-STATS：输出分母、未知数、计数方式、数据版本、更新时间）。
import { formatDateTime } from '../domain/display'
import type { StatsMeta } from '../domain/types'

defineProps<{ meta: StatsMeta; unknownLabel: string }>()
</script>

<template>
  <p class="small muted">
    口径：{{ meta.countingRule }}。分母 {{ meta.denominator }} 条成果；{{ unknownLabel }} {{ meta.unknownCount }} 条。
    数据版本 {{ meta.dataVersion }}，更新于 {{ formatDateTime(meta.updatedAt) }}。
  </p>
</template>
