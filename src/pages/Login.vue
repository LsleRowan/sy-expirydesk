<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fetchAuthStatus, login } from '../composables/useAuth'

const router = useRouter()

const password = ref('')
const error = ref('')
const loading = ref(false)
const configured = ref(true)

async function submit() {
  if (!password.value || loading.value || !configured.value) return
  loading.value = true
  error.value = ''
  try {
    await login(password.value)
    await router.replace('/')
  } catch (err) {
    error.value = err instanceof Error ? err.message : '登录失败'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  const { enabled, authenticated } = await fetchAuthStatus()
  if (authenticated) {
    await router.replace('/')
  } else if (!enabled) {
    configured.value = false
    error.value = '服务端未配置登录密码（AUTH_PASSWORD）'
  }
})
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-page px-4">
    <div class="w-full max-w-sm">
      <form class="panel flex flex-col gap-4 p-6" @submit.prevent="submit">
        <div class="flex flex-col items-center gap-1.5 pb-1 text-center">
          <div>
            <h1 class="text-lg font-semibold text-ink">ExpiryDesk</h1>
            <p class="text-[13px] text-ink-3">到期管理台</p>
          </div>
        </div>

        <label class="flex flex-col gap-1.5">
          <span class="text-[13px] font-medium text-ink-2">密码</span>
          <input
            v-model="password"
            class="field-input"
            type="password"
            placeholder="请输入登录密码"
            autocomplete="current-password"
            autofocus
          />
        </label>

        <p v-if="error" class="-mt-1 text-[13px] text-danger">{{ error }}</p>

        <button class="btn btn-primary w-full" type="submit" :disabled="!password || loading || !configured">
          {{ loading ? '登录中…' : '登录' }}
        </button>

        <p class="-mt-1 text-center text-xs text-ink-3">输入密码以继续使用到期管理台</p>
      </form>
    </div>
  </div>
</template>
