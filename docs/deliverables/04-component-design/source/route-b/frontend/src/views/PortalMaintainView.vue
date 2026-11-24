<script setup lang="ts">
// 门户维护（IA9-SEQ-08；SPEC-M9-PORTAL-CLAIM-UI 第 5 节）。版本冲突时保留未保存的输入，不自动重试。
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import LoadStateView from '../components/LoadStateView.vue'
import { useApi } from '../composables/useApi'
import { useAsync } from '../composables/useAsync'
import { useSubmit } from '../composables/useSubmit'
import { BIO_MAX, validateProfile, type ProfileForm } from '../domain/claimForm'
import { TYPE_LABEL, formatText, formatYear } from '../domain/display'
import { errorMessage, type Failure } from '../domain/errors'
import type { MaintainView } from '../domain/types'

type Notice = { kind: 'success' | 'warning' | 'error'; text: string; traceId?: string | null }

const api = useApi()
const route = useRoute()
const { state, showSpinner, run, setData } = useAsync<MaintainView>()
const { pending, submit } = useSubmit()

const scholarId = computed(() => String(route.params.id))
const view = computed(() => state.value.data)
const form = reactive<ProfileForm>({ bio: '', homepage: '' })
const formErrors = ref<Record<string, string>>({})
const notice = ref<Notice | null>(null)
const selected = ref<string[]>([])
const confirming = ref<boolean | null>(null)

const bioLength = computed(() => [...form.bio].length)

function fillForm(v: MaintainView): void {
  form.bio = v.bio ?? ''
  form.homepage = v.homepage ?? ''
}

async function load(resetForm: boolean): Promise<void> {
  const sid = scholarId.value
  const v = await run((signal) => api.getMaintainView(sid, { signal }))
  if (!v) return
  if (resetForm) fillForm(v)
  selected.value = selected.value.filter((id) => v.works.some((w) => w.work.id === id))
}

onMounted(() => void load(true))

function failureNotice(failure: Failure): Notice {
  if (failure.kind === 'CONFLICT') {
    return { kind: 'warning', text: '记录已被更新，已载入最新版本。你未保存的输入仍保留，请核对后再保存。' }
  }
  return { kind: 'error', text: errorMessage(failure.kind, 'private'), traceId: failure.traceId }
}

async function save(): Promise<void> {
  const current = view.value
  if (!current) return
  formErrors.value = validateProfile(form)
  if (Object.keys(formErrors.value).length > 0) {
    await nextTick()
    document.getElementById(formErrors.value.bio ? 'profile-bio' : 'profile-homepage')?.focus()
    return
  }
  const outcome = await submit(() =>
    api.updateProfile(scholarId.value, {
      bio: form.bio.trim() === '' ? null : form.bio,
      homepage: form.homepage.trim() === '' ? null : form.homepage.trim(),
      expectedVersion: current.version,
    }),
  )
  if (outcome === null) return
  if (outcome.ok) {
    setData(outcome.value)
    fillForm(outcome.value)
    notice.value = { kind: 'success', text: '已保存。' }
    return
  }
  if (outcome.failure.kind === 'INVALID_INPUT' && Object.keys(outcome.failure.fieldErrors).length > 0) {
    formErrors.value = outcome.failure.fieldErrors
    return
  }
  notice.value = failureNotice(outcome.failure)
  if (outcome.failure.kind === 'CONFLICT') await load(false)
}

function askVisibility(hidden: boolean): void {
  if (selected.value.length === 0) {
    notice.value = { kind: 'warning', text: '请先勾选要调整的成果。' }
    return
  }
  notice.value = null
  confirming.value = hidden
}

async function applyVisibility(): Promise<void> {
  const hidden = confirming.value
  const current = view.value
  if (hidden === null || !current) return
  const ids = [...selected.value]
  const outcome = await submit(() =>
    api.setVisibility(scholarId.value, { workIds: ids, hidden, expectedVersion: current.version }),
  )
  if (outcome === null) return
  confirming.value = null
  if (outcome.ok) {
    const action = hidden ? '隐藏' : '恢复展示'
    const unchanged = ids.length - outcome.value.changed
    notice.value = {
      kind: 'success',
      text: `已${action} ${outcome.value.changed} 项${unchanged > 0 ? `，另有 ${unchanged} 项原本就是该状态` : ''}。`,
    }
    selected.value = []
    await load(false)
    return
  }
  notice.value = failureNotice(outcome.failure)
  if (outcome.failure.kind === 'CONFLICT') await load(false)
}
</script>

<template>
  <div class="page">
    <LoadStateView :state="state" :show-spinner="showSpinner" context="private" :redirect="route.fullPath" @retry="load(true)">
      <template v-if="view">
        <h1>维护门户：{{ view.scholarName }}</h1>
        <p class="small muted">
          版本 {{ view.version }} ·
          <RouterLink :to="`/scholars/${encodeURIComponent(view.scholarId)}`">查看公开门户</RouterLink>
        </p>

        <div v-if="notice" class="notice" :class="`notice-${notice.kind}`" :role="notice.kind === 'success' ? 'status' : 'alert'">
          <p>{{ notice.text }}</p>
          <p v-if="notice.traceId" class="small muted">追踪编号：{{ notice.traceId }}</p>
        </div>

        <h2>个人公开信息</h2>
        <form class="stack" novalidate @submit.prevent="save">
          <label for="profile-bio">简介</label>
          <textarea
            id="profile-bio"
            v-model="form.bio"
            rows="4"
            :aria-invalid="formErrors.bio ? 'true' : undefined"
            aria-describedby="profile-bio-error"
          />
          <p class="small muted">{{ bioLength }} / {{ BIO_MAX }} 字 · 已保存：{{ formatText(view.bio) }}</p>
          <p id="profile-bio-error" class="field-error">{{ formErrors.bio ?? '' }}</p>
          <label for="profile-homepage">个人主页</label>
          <input
            id="profile-homepage"
            v-model="form.homepage"
            type="url"
            size="50"
            :aria-invalid="formErrors.homepage ? 'true' : undefined"
            aria-describedby="profile-homepage-error"
          />
          <p class="small muted">已保存：{{ formatText(view.homepage) }}</p>
          <p id="profile-homepage-error" class="field-error">{{ formErrors.homepage ?? '' }}</p>
          <button type="submit" class="primary" :disabled="pending">保存</button>
        </form>

        <h2>成果展示</h2>
        <p class="small muted">
          隐藏只影响你的门户展示，不删除成果，也不影响其他作者。成果题名、作者等共享信息有误时，请走纠错流程（待团队确认）。
        </p>
        <table>
          <thead>
            <tr>
              <th scope="col">选择</th>
              <th scope="col">成果</th>
              <th scope="col">年份</th>
              <th scope="col">展示状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in view.works" :key="item.work.id">
              <td>
                <input
                  :id="`select-${item.work.id}`"
                  v-model="selected"
                  type="checkbox"
                  :value="item.work.id"
                  :aria-label="`选择：${item.work.title}`"
                />
              </td>
              <td>
                <span class="badge">{{ TYPE_LABEL[item.work.type] }}</span> {{ item.work.title }}
              </td>
              <td>{{ formatYear(item.work.year) }}</td>
              <td>{{ item.hidden ? '已隐藏' : '展示中' }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="view.works.length === 0" class="muted">该门户暂无公开成果。</p>
        <div class="row">
          <span class="small">已选 {{ selected.length }} 项</span>
          <button type="button" @click="askVisibility(true)">隐藏所选</button>
          <button type="button" @click="askVisibility(false)">恢复展示所选</button>
        </div>
        <div v-if="confirming !== null" class="notice notice-warning" role="alertdialog" aria-label="确认调整展示">
          <p>
            将{{ confirming ? '隐藏' : '恢复展示' }} {{ selected.length }} 项。隐藏只影响你的门户展示，不删除成果，也不影响其他作者。
          </p>
          <div class="row">
            <button type="button" class="primary" :disabled="pending" @click="applyVisibility">确认</button>
            <button type="button" @click="confirming = null">取消</button>
          </div>
        </div>
      </template>
    </LoadStateView>
  </div>
</template>
