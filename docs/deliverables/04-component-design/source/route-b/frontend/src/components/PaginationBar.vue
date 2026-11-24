<script setup lang="ts">
import { computed } from 'vue'
import { pageWindow, totalPages } from '../domain/pagination'

const props = defineProps<{ page: number; pageSize: number; total: number }>()
const emit = defineEmits<{ change: [page: number] }>()

const last = computed(() => totalPages(props.total, props.pageSize))
const items = computed(() => pageWindow(props.page, last.value))
</script>

<template>
  <nav v-if="last > 1" class="row" aria-label="分页">
    <button type="button" :disabled="page <= 1" @click="emit('change', page - 1)">上一页</button>
    <template v-for="(item, index) in items" :key="index">
      <span v-if="item === 'gap'" aria-hidden="true">…</span>
      <button
        v-else
        type="button"
        class="chip"
        :class="{ primary: item === page }"
        :aria-current="item === page ? 'page' : undefined"
        @click="emit('change', item)"
      >
        {{ item }}
      </button>
    </template>
    <button type="button" :disabled="page >= last" @click="emit('change', page + 1)">下一页</button>
    <span class="small muted">第 {{ page }} / {{ last }} 页，共 {{ total }} 条</span>
  </nav>
</template>
