<script setup lang="ts">
// 认领申请：三步表单（SPEC-M9-PORTAL-CLAIM-UI 第 3 节；IA9-SEQ-06）。
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import LoadStateView from '../components/LoadStateView.vue'
import { useApi } from '../composables/useApi'
import { useAsync } from '../composables/useAsync'
import { useSubmit } from '../composables/useSubmit'
import {
  CLAIM_FIELD_ORDER,
  STATEMENT_MAX,
  claimFingerprint,
  emptyClaimForm,
  evidenceRefs,
  stepOfField,
  validateClaimForm,
  validateClaimStep,
  type ClaimForm,
  type ClaimStep,
} from '../domain/claimForm'
import { CLAIM_STATUS_LABEL, CLAIM_STATUS_NOTE, formatDateTime } from '../domain/display'
import { errorMessage } from '../domain/errors'
import { findPendingApplication } from '../domain/portalEntry'
import { nextRequestKey, randomRequestKey, type KeyedFingerprint } from '../domain/requestKey'
import type { ClaimApplication, ScholarPortal } from '../domain/types'

const api = useApi()
const route = useRoute()
const router = useRouter()
const { state, showSpinner, run } = useAsync<ScholarPortal>()
const { pending, submit } = useSubmit()

const scholarId = computed(() => String(route.params.id))
const portal = computed(() => state.value.data)
const myClaims = ref<ClaimApplication[] | null>(null)
const pendingId = computed(() => findPendingApplication(myClaims.value, scholarId.value))

const step = ref<ClaimStep>(1)
const form = reactive<ClaimForm>(emptyClaimForm())
const errors = ref<Record<string, string>>({})
const result = ref<ClaimApplication | null>(null)
const failureText = ref('')
const failureTrace = ref<string | null>(null)
const unconfirmed = ref(false)
const stepHeading = ref<HTMLElement | null>(null)
let keyed: KeyedFingerprint | null = null

const statementLength = computed(() => [...form.statement.trim()].length)

async function load(): Promise<void> {
  const sid = scholarId.value
  void run((signal) => api.getPortal(sid, { signal }))
  try {
    myClaims.value = await api.listMyClaims()
  } catch {
    myClaims.value = []
  }
}

onMounted(load)

async function focusFirstError(): Promise<void> {
  await nextTick()
  const field = CLAIM_FIELD_ORDER.find((f) => errors.value[f])
  if (field) document.getElementById(`claim-${field}`)?.focus()
}

async function focusHeading(): Promise<void> {
  await nextTick()
  stepHeading.value?.focus()
}

function nextStep(): void {
  const found = validateClaimStep(form, step.value)
  errors.value = found
  if (Object.keys(found).length > 0) {
    void focusFirstError()
    return
  }
  step.value = (step.value + 1) as ClaimStep
  void focusHeading()
}

function prevStep(): void {
  errors.value = {}
  step.value = (step.value - 1) as ClaimStep
  void focusHeading()
}

function clearFailure(): void {
  failureText.value = ''
  failureTrace.value = null
  unconfirmed.value = false
}

async function send(): Promise<void> {
  const checked = validateClaimForm(form)
  if (checked.firstInvalidStep !== null) {
    step.value = checked.firstInvalidStep
    errors.value = checked.errors
    void focusFirstError()
    return
  }
  // 内容不变时复用同一个 request_key，网络中断后重试不会产生第二个申请。
  keyed = nextRequestKey(keyed, claimFingerprint(scholarId.value, form), randomRequestKey)
  const key = keyed.key
  const outcome = await submit(() =>
    api.submitClaim({
      scholarId: scholarId.value,
      statement: form.statement.trim(),
      evidenceRefs: evidenceRefs(form),
      requestKey: key,
    }),
  )
  if (outcome === null) return
  clearFailure()
  if (outcome.ok) {
    result.value = outcome.value
    return
  }
  const failure = outcome.failure
  switch (failure.kind) {
    case 'INVALID_INPUT': {
      const mapped: Record<string, string> = {}
      for (const [field, message] of Object.entries(failure.fieldErrors)) {
        mapped[field === 'evidenceRefs' ? 'homepageUrl' : field] = message
      }
      const firstField = CLAIM_FIELD_ORDER.find((f) => mapped[f])
      if (firstField) {
        errors.value = mapped
        step.value = stepOfField(firstField)
        void focusFirstError()
      } else {
        failureText.value = errorMessage('INVALID_INPUT')
      }
      break
    }
    case 'CONFLICT':
      failureText.value = '已有审核中的申请，或该门户已被认领。页面已刷新为最新状态。'
      await load()
      break
    case 'UNAUTHENTICATED':
      void router.push({ path: '/login', query: { redirect: route.fullPath } })
      break
    case 'NETWORK':
    case 'TIMEOUT':
      unconfirmed.value = true
      break
    default:
      failureText.value = errorMessage(failure.kind, 'private')
      failureTrace.value = failure.traceId
  }
}

function fieldAttrs(field: string) {
  return {
    id: `claim-${field}`,
    'aria-invalid': errors.value[field] ? ('true' as const) : undefined,
    'aria-describedby': `claim-${field}-error`,
  }
}
</script>

<template>
  <div class="page">
    <LoadStateView :state="state" :show-spinner="showSpinner" @retry="load">
      <template v-if="portal">
        <h1>申请认领：{{ portal.scholar.name }}</h1>
        <p class="small muted">学者编号 {{ portal.scholar.id }}。提交后由管理员审核，审核通过前你不能维护该门户。</p>

        <section v-if="result" class="notice notice-success" role="status">
          <p><strong>申请已提交</strong></p>
          <dl>
            <dt>申请编号</dt>
            <dd>{{ result.id }}</dd>
            <dt>提交时间</dt>
            <dd>{{ formatDateTime(result.submittedAt) }}</dd>
            <dt>当前状态</dt>
            <dd>{{ CLAIM_STATUS_LABEL[result.status] }}</dd>
          </dl>
          <p>{{ CLAIM_STATUS_NOTE[result.status] }}。</p>
          <RouterLink to="/me/claims">查看我的认领申请</RouterLink>
        </section>

        <p v-else-if="portal.claimed" class="notice" role="note">
          该门户已被认领，无法申请。<RouterLink :to="`/scholars/${encodeURIComponent(portal.scholar.id)}`">返回门户</RouterLink>
        </p>

        <p v-else-if="pendingId" class="notice" role="note">
          你已提交过该门户的申请（{{ pendingId }}），正在审核中。<RouterLink to="/me/claims">查看审核进度</RouterLink>
        </p>

        <form v-else-if="myClaims !== null" novalidate @submit.prevent="step === 3 ? send() : nextStep()">
          <h2 ref="stepHeading" tabindex="-1">
            第 {{ step }} 步（共 3 步）：{{ step === 1 ? '说明你与该学者的关系' : step === 2 ? '提供证明材料' : '确认并提交' }}
          </h2>

          <div v-if="step === 1" class="stack">
            <label for="claim-statement">关系说明（必填）</label>
            <textarea v-bind="fieldAttrs('statement')" v-model="form.statement" rows="4" />
            <p class="small muted">{{ statementLength }} / {{ STATEMENT_MAX }} 字</p>
            <p id="claim-statement-error" class="field-error">{{ errors.statement ?? '' }}</p>
          </div>

          <div v-else-if="step === 2" class="stack">
            <p class="small">至少提供一项。材料只用于审核，不会出现在公开页面。</p>
            <label for="claim-homepageUrl">本人官方主页链接</label>
            <input v-bind="fieldAttrs('homepageUrl')" v-model="form.homepageUrl" type="url" size="50" placeholder="https://" />
            <p id="claim-homepageUrl-error" class="field-error">{{ errors.homepageUrl ?? '' }}</p>
            <label for="claim-institutionEmail">机构邮箱</label>
            <input v-bind="fieldAttrs('institutionEmail')" v-model="form.institutionEmail" type="email" size="40" />
            <p id="claim-institutionEmail-error" class="field-error">{{ errors.institutionEmail ?? '' }}</p>
            <p class="small muted">证明材料的具体要求待团队确认；文件上传暂不提供。</p>
          </div>

          <div v-else class="stack">
            <dl>
              <dt>关系说明</dt>
              <dd>{{ form.statement.trim() }}</dd>
              <dt>官方主页</dt>
              <dd>{{ form.homepageUrl.trim() || '未填写' }}</dd>
              <dt>机构邮箱</dt>
              <dd>{{ form.institutionEmail.trim() || '未填写' }}</dd>
            </dl>
            <label>
              <input v-bind="fieldAttrs('consent')" v-model="form.consent" type="checkbox" />
              我确认以上信息真实，并同意平台管理员为审核目的查看这些材料
            </label>
            <p id="claim-consent-error" class="field-error">{{ errors.consent ?? '' }}</p>
          </div>

          <div v-if="unconfirmed" class="notice notice-warning" role="alert">
            提交是否成功尚未确认。可以直接重试，不会重复创建申请；也可以先到<RouterLink to="/me/claims">“我的认领”</RouterLink>查看。
          </div>
          <div v-if="failureText" class="notice notice-error" role="alert">
            <p>{{ failureText }}</p>
            <p v-if="failureTrace" class="small muted">追踪编号：{{ failureTrace }}</p>
          </div>

          <div class="row">
            <button v-if="step > 1" type="button" @click="prevStep">上一步</button>
            <button v-if="step < 3" type="submit" class="primary">下一步</button>
            <button v-else type="submit" class="primary" :disabled="pending">{{ pending ? '提交中…' : '提交申请' }}</button>
          </div>
        </form>
      </template>
    </LoadStateView>
  </div>
</template>
