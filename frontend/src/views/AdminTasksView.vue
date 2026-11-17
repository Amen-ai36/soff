<script setup lang="ts">
// 采集任务（SPEC-M9-ADMIN-UI 第 3 节）。状态与操作按成员 7 候选状态机，未冻结。
import { onMounted, ref } from 'vue'
import LoadStateView from '../components/LoadStateView.vue'
import { useApi } from '../composables/useApi'
import { useAsync } from '../composables/useAsync'
import { useSubmit } from '../composables/useSubmit'
import { formatCount, formatDateTime, formatText } from '../domain/display'
import { errorMessage, type Failure } from '../domain/errors'
import { randomRequestKey } from '../domain/requestKey'
import { TASK_STATUS_LABEL, canRetryTask, canStopTask } from '../domain/taskState'
import type { CollectionTask, SourceOption } from '../domain/types'

const api = useApi()
const { state, showSpinner, run } = useAsync<CollectionTask[]>()
const { state: sourceState, run: runSources } = useAsync<SourceOption[]>()
const { pending, submit } = useSubmit()
const sourceId = ref('')
const notice = ref<{ kind: 'success' | 'warning' | 'error'; text: string; traceId?: string | null } | null>(null)

function load(): void {
  void run((signal) => api.listTasks({ signal }))
}

onMounted(() => {
  load()
  void runSources((signal) => api.listSources({ signal }))
})

function failed(failure: Failure): void {
  notice.value =
    failure.kind === 'CONFLICT'
      ? { kind: 'warning', text: '任务状态已变化，已刷新为最新状态。' }
      : { kind: 'error', text: errorMessage(failure.kind, 'private'), traceId: failure.traceId }
}

async function create(): Promise<void> {
  if (sourceId.value === '') {
    notice.value = { kind: 'warning', text: '请选择数据源。' }
    return
  }
  const outcome = await submit(() => api.createTask({ sourceId: sourceId.value, requestKey: randomRequestKey() }))
  if (outcome === null) return
  if (outcome.ok) notice.value = { kind: 'success', text: `已创建任务 ${outcome.value.id}，等待执行。` }
  else failed(outcome.failure)
  load()
}

async function act(task: CollectionTask, action: 'stop' | 'retry'): Promise<void> {
  const outcome = await submit(() =>
    action === 'stop' ? api.stopTask(task.id, task.version) : api.retryTask(task.id, task.version),
  )
  if (outcome === null) return
  if (outcome.ok) {
    notice.value = { kind: 'success', text: `任务 ${task.id} 当前状态：${TASK_STATUS_LABEL[outcome.value.status]}。` }
  } else failed(outcome.failure)
  load()
}
</script>

<template>
  <div class="page">
    <h1>采集任务</h1>
    <p class="small muted">状态与可用操作依据成员 7 的候选状态机，尚未冻结。只能从获准的数据源创建任务。</p>

    <form class="row" aria-label="创建任务" @submit.prevent="create">
      <label for="task-source">数据源</label>
      <select id="task-source" v-model="sourceId" :disabled="sourceState.status !== 'success'">
        <option value="">请选择</option>
        <option v-for="s in sourceState.data ?? []" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
      <button type="submit" class="primary" :disabled="pending">创建任务</button>
      <span v-if="sourceState.status === 'error'" class="field-error">数据源列表加载失败</span>
    </form>

    <div v-if="notice" class="notice" :class="`notice-${notice.kind}`" :role="notice.kind === 'success' ? 'status' : 'alert'">
      <p>{{ notice.text }}</p>
      <p v-if="notice.traceId" class="small muted">追踪编号：{{ notice.traceId }}</p>
    </div>

    <LoadStateView :state="state" :show-spinner="showSpinner" context="private" redirect="/admin/tasks" @retry="load">
      <template v-if="state.data">
        <p v-if="state.data.length === 0" class="muted">暂无采集任务。</p>
        <table v-else>
          <thead>
            <tr>
              <th scope="col">任务</th>
              <th scope="col">数据源</th>
              <th scope="col">状态</th>
              <th scope="col">已获取记录</th>
              <th scope="col">更新时间</th>
              <th scope="col">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="task in state.data" :key="task.id">
              <td>{{ task.id }}</td>
              <td>{{ task.sourceName }}</td>
              <td>
                {{ TASK_STATUS_LABEL[task.status] }}
                <p v-if="task.lastError" class="small field-error">{{ formatText(task.lastError) }}</p>
              </td>
              <td>{{ formatCount(task.fetchedCount) }}</td>
              <td>{{ formatDateTime(task.updatedAt) }}</td>
              <td class="row">
                <button v-if="canStopTask(task.status)" type="button" class="danger" :disabled="pending" @click="act(task, 'stop')">
                  停止
                </button>
                <button v-if="canRetryTask(task.status)" type="button" :disabled="pending" @click="act(task, 'retry')">重试</button>
              </td>
            </tr>
          </tbody>
        </table>
      </template>
    </LoadStateView>
  </div>
</template>
