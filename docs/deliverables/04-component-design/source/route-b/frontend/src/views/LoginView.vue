<script setup lang="ts">
// 登录（SPEC-M8-AUTH）。失败统一提示，不区分账号不存在与密码错误。回跳地址只接受站内路径。
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApi } from '../composables/useApi'
import { useSession } from '../composables/useSession'
import { useSubmit } from '../composables/useSubmit'
import { errorMessage } from '../domain/errors'
import { safeRedirect } from '../domain/redirect'

const api = useApi()
const session = useSession()
const route = useRoute()
const router = useRouter()
const { pending, submit } = useSubmit()
const username = ref('')
const password = ref('')
const message = ref('')

const redirect = computed(() => safeRedirect(route.query.redirect))

async function login(): Promise<void> {
  if (username.value.trim() === '' || password.value === '') {
    message.value = '请输入账号和密码'
    return
  }
  const outcome = await submit(() => session.login(username.value, password.value))
  if (outcome === null) return
  if (outcome.ok) {
    password.value = ''
    void router.replace(redirect.value)
    return
  }
  password.value = ''
  message.value = outcome.failure.kind === 'UNAUTHENTICATED' ? '账号或密码不正确' : errorMessage(outcome.failure.kind)
}
</script>

<template>
  <div class="page">
    <h1>登录</h1>
    <p v-if="route.query.redirect" class="small muted">登录后将回到刚才的页面。</p>
    <form class="stack" novalidate @submit.prevent="login">
      <label for="login-username">账号</label>
      <input id="login-username" v-model="username" autocomplete="username" size="30" />
      <label for="login-password">密码</label>
      <input id="login-password" v-model="password" type="password" autocomplete="current-password" size="30" />
      <p class="field-error" role="alert">{{ message }}</p>
      <button type="submit" class="primary" :disabled="pending">{{ pending ? '登录中…' : '登录' }}</button>
    </form>
    <p v-if="api.mode === 'mock'" class="notice small" role="note">
      当前为模拟模式。示例账号：user1（普通用户）、scholar1（已认领学者）、admin1、admin2（管理员）。
      模拟模式不校验密码，任意非空密码即可；真实环境的认证方式待团队选型。
    </p>
  </div>
</template>
