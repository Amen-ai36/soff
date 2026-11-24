<script setup lang="ts">
// 认领审核（SPEC-M9-ADMIN-UI 第 2 节）。页面不做角色拦截，权限以服务端响应为准。
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import LoadStateView from '../components/LoadStateView.vue'
import { useApi } from '../composables/useApi'
import { useAsync } from '../composables/useAsync'
import { useSession } from '../composables/useSession'
import { useSubmit } from '../composables/useSubmit'
import { CLAIM_STATUS_LABEL, formatDateTime } from '../domain/display'
import { errorMessage } from '../domain/errors'
import { randomRequestKey } from '../domain/requestKey'
import type { ClaimApplication, ClaimStatus } from '../domain/types'

type Decision = 'APPROVED' | 'REJECTED'

const api = useApi()
const session = useSession()
const { state, showSpinner, run } = useAsync<ClaimApplication[]>()
const { pending, submit } = useSubmit()
const filter = ref<ClaimStatus | 'ALL'>('PENDING')
const reasons = reactive<Record<string, string>>({})
const reasonErrors = reactive<Record<string, string>>({})
const confirming = ref<{ app: ClaimApplication; decision: Decision; key: string } | null>(null)
const notice = ref<{ kind: 'success' | 'warning' | 'error'; text: string; traceId?: string | null } | null>(null)

const myId = computed(() => session.state.session?.userId ?? null)

function load(): void {
  const status = filter.value === 'ALL' ? null : filter.value
  void run((signal) => api.listClaimsForReview(status, { signal }))
}

onMounted(load)

function ask(app: ClaimApplication, decision: Decision): void {
  delete reasonErrors[app.id]
  if (decision === 'REJECTED' && (reasons[app.id] ?? '').trim() === '') {
    reasonErrors[app.id] = '驳回理由不能为空'
    document.getElementById(`reason-${app.id}`)?.focus()
    return
  }
  notice.value = null
  confirming.value = { app, decision, key: randomRequestKey() }
}

async function confirm(): Promise<void> {
  const c = confirming.value
  if (!c) return
  const outcome = await submit(() =>
    api.decideClaim(c.app.id, {
      decision: c.decision,
      reason: (reasons[c.app.id] ?? '').trim(),
      expectedVersion: c.app.version,
      requestKey: c.key,
    }),
  )
  if (outcome === null) return
  confirming.value = null
  if (outcome.ok) {
    notice.value = { kind: 'success', text: `申请 ${outcome.value.id} 的审核结果：${CLAIM_STATUS_LABEL[outcome.value.status]}。` }
  } else if (outcome.failure.kind === 'CONFLICT') {
    notice.value = { kind: 'warning', text: '记录已被更新，已载入最新状态，请重新判断。' }
  } else if (outcome.failure.kind === 'INVALID_INPUT' && outcome.failure.fieldErrors.reason) {
    reasonErrors[c.app.id] = outcome.failure.fieldErrors.reason
  } else {
    notice.value = { kind: 'error', text: errorMessage(outcome.failure.kind, 'private'), traceId: outcome.failure.traceId }
  }
  load()
}
</script>

<template>
  <div class="page">
    <h1>认领审核</h1>
    <div class="row">
      <label for="review-filter">显示</label>
      <select id="review-filter" v-model="filter" @change="load">
        <option value="PENDING">审核中</option>
        <option value="ALL">全部</option>
      </select>
    </div>

    <div v-if="notice" class="notice" :class="`notice-${notice.kind}`" :role="notice.kind === 'success' ? 'status' : 'alert'">
      <p>{{ notice.text }}</p>
      <p v-if="notice.traceId" class="small muted">追踪编号：{{ notice.traceId }}</p>
    </div>

    <LoadStateView :state="state" :show-spinner="showSpinner" context="private" redirect="/admin/review" @retry="load">
      <template v-if="state.data">
        <p v-if="state.data.length === 0" class="muted">没有需要处理的申请。</p>
        <article v-for="app in state.data" :key="app.id" class="card">
          <h2>
            {{ app.id }} · <RouterLink :to="`/scholars/${encodeURIComponent(app.scholarId)}`">{{ app.scholarName }}</RouterLink>
            <span class="badge">{{ CLAIM_STATUS_LABEL[app.status] }}</span>
          </h2>
          <dl>
            <dt>申请人</dt>
            <dd>{{ app.applicantName }}（{{ app.applicantId }}）</dd>
            <dt>提交时间</dt>
            <dd>{{ formatDateTime(app.submittedAt) }}</dd>
            <dt>关系说明</dt>
            <dd>{{ app.statement }}</dd>
            <dt>证明材料</dt>
            <dd>
              <ul>
                <li v-for="evidence in app.evidenceRefs" :key="evidence">{{ evidence }}</li>
              </ul>
            </dd>
            <template v-if="app.reason">
              <dt>审核理由</dt>
              <dd>{{ app.reason }}</dd>
            </template>
            <dt>版本</dt>
            <dd>{{ app.version }}</dd>
          </dl>
          <p class="small muted">证明材料仅在审核页面显示，不进入公开页面。</p>

          <template v-if="app.status === 'PENDING'">
            <p v-if="app.applicantId === myId" class="notice notice-warning">不能审核本人提交的申请。</p>
            <div v-else class="stack">
              <label :for="`reason-${app.id}`">审核理由（驳回时必填）</label>
              <textarea
                :id="`reason-${app.id}`"
                v-model="reasons[app.id]"
                rows="2"
                :aria-invalid="reasonErrors[app.id] ? 'true' : undefined"
                :aria-describedby="`reason-${app.id}-error`"
              />
              <p :id="`reason-${app.id}-error`" class="field-error">{{ reasonErrors[app.id] ?? '' }}</p>
              <div class="row">
                <button type="button" class="primary" @click="ask(app, 'APPROVED')">通过</button>
                <button type="button" class="danger" @click="ask(app, 'REJECTED')">驳回</button>
              </div>
            </div>
          </template>

          <div
            v-if="confirming && confirming.app.id === app.id"
            class="notice notice-warning"
            role="alertdialog"
            :aria-label="`确认审核 ${app.id}`"
          >
            <p v-if="confirming.decision === 'APPROVED'">确认通过？申请人将获得该门户的维护权限。</p>
            <p v-else>确认驳回？驳回理由将展示给申请人。</p>
            <div class="row">
              <button type="button" class="primary" :disabled="pending" @click="confirm">确认</button>
              <button type="button" @click="confirming = null">取消</button>
            </div>
          </div>
        </article>
      </template>
    </LoadStateView>
  </div>
</template>
