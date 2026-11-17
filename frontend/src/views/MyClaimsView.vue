<script setup lang="ts">
// 我的认领申请（IA9-SEQ-07）。以服务端返回的状态为准（FS9-BR-02）。
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import LoadStateView from '../components/LoadStateView.vue'
import { useApi } from '../composables/useApi'
import { useAsync } from '../composables/useAsync'
import { CLAIM_STATUS_LABEL, CLAIM_STATUS_NOTE, formatDateTime } from '../domain/display'
import type { ClaimApplication } from '../domain/types'

const api = useApi()
const { state, showSpinner, run } = useAsync<ClaimApplication[]>()

function load(): void {
  void run((signal) => api.listMyClaims({ signal }))
}

onMounted(load)

function portalPath(app: ClaimApplication): string {
  return `/scholars/${encodeURIComponent(app.scholarId)}`
}
</script>

<template>
  <div class="page">
    <h1>我的认领申请</h1>
    <LoadStateView :state="state" :show-spinner="showSpinner" context="private" redirect="/me/claims" @retry="load">
      <template v-if="state.data">
        <p v-if="state.data.length === 0" class="muted">你还没有提交过认领申请。可以在学者门户中申请认领。</p>
        <article v-for="app in state.data" :key="app.id" class="card">
          <h2>
            {{ app.scholarName }}
            <span
              class="badge"
              :class="{ 'badge-success': app.status === 'APPROVED', 'badge-warning': app.status === 'REJECTED' }"
              >{{ CLAIM_STATUS_LABEL[app.status] }}</span
            >
          </h2>
          <p class="small">{{ CLAIM_STATUS_NOTE[app.status] }}。</p>
          <dl>
            <dt>申请编号</dt>
            <dd>{{ app.id }}<template v-if="app.previousId">（前序申请 {{ app.previousId }}）</template></dd>
            <dt>提交时间</dt>
            <dd>{{ formatDateTime(app.submittedAt) }}</dd>
            <template v-if="app.decidedAt">
              <dt>审核时间</dt>
              <dd>{{ formatDateTime(app.decidedAt) }}</dd>
            </template>
            <template v-if="app.status === 'REJECTED'">
              <dt>驳回理由</dt>
              <dd>{{ app.reason ?? '驳回理由未提供' }}</dd>
            </template>
          </dl>
          <div class="row">
            <RouterLink :to="portalPath(app)">查看门户</RouterLink>
            <RouterLink v-if="app.status === 'APPROVED'" :to="`${portalPath(app)}/maintain`">维护门户</RouterLink>
            <RouterLink v-if="app.status === 'REJECTED'" :to="`${portalPath(app)}/claim`">重新申请</RouterLink>
          </div>
        </article>
      </template>
    </LoadStateView>
  </div>
</template>
