<script setup lang="ts">
// 统一的加载、失败呈现（EX9-R-01、EX9-R-03、FS9-LR-01）。成功内容由默认插槽提供，空结果由页面自行判断。
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { errorMessage, isRetryable, type FailureContext } from '../domain/errors'
import type { AsyncState } from '../domain/loadState'

const props = withDefaults(
  defineProps<{
    state: AsyncState<unknown>
    showSpinner: boolean
    context?: FailureContext
    redirect?: string
    loadingText?: string
  }>(),
  { context: 'public', redirect: undefined, loadingText: '正在加载…' },
)
defineEmits<{ retry: [] }>()

const failure = computed(() => (props.state.status === 'error' ? props.state.failure : null))
const loginTarget = computed(() => ({ path: '/login', query: props.redirect ? { redirect: props.redirect } : {} }))
</script>

<template>
  <div v-if="failure" class="notice notice-error" role="alert">
    <p>{{ errorMessage(failure.kind, context) }}</p>
    <p v-if="failure.traceId" class="small muted">追踪编号：{{ failure.traceId }}（反馈问题时请提供）</p>
    <div class="row">
      <button v-if="isRetryable(failure.kind)" type="button" @click="$emit('retry')">重试</button>
      <RouterLink v-if="failure.kind === 'UNAUTHENTICATED'" :to="loginTarget">去登录</RouterLink>
    </div>
  </div>
  <template v-else>
    <p v-if="state.status === 'loading' && showSpinner" class="muted" role="status">
      {{ state.data === null ? loadingText : '正在更新…' }}
    </p>
    <slot v-if="state.data !== null" />
  </template>
</template>
