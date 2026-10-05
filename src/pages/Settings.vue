<script setup lang="ts">
import { Info, Moon, Sun } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { fetchAuthStatus } from '../composables/useAuth'
import { useSettings } from '../composables/useSettings'
import { useTheme } from '../composables/useTheme'
import { apiGet, apiSend } from '../services/api'

const { isDark, toggle } = useTheme()
const { defaultRemindDays, setDefaultRemindDays } = useSettings()

const authEnabled = ref(false)

const remindDraft = ref(defaultRemindDays.value)
const savedRemind = ref(defaultRemindDays.value)
const remindError = ref('')

const tokenDaysDraft = ref(7)
const savedTokenDays = ref(7)
const tokenDaysError = ref('')

const maxFailsDraft = ref(5)
const savedMaxFails = ref(5)
const maxFailsError = ref('')

const lockMinutesDraft = ref(30)
const savedLockMinutes = ref(30)
const lockMinutesError = ref('')

const saving = ref(false)
const savedTip = ref(false)
const saveError = ref('')
let tipTimer: ReturnType<typeof setTimeout> | null = null

const dirty = computed(
  () =>
    remindDraft.value !== savedRemind.value ||
    (authEnabled.value &&
      (tokenDaysDraft.value !== savedTokenDays.value ||
        maxFailsDraft.value !== savedMaxFails.value ||
        lockMinutesDraft.value !== savedLockMinutes.value)),
)

interface SettingsData {
  token_days: number
  login_max_fails: number
  login_lock_minutes: number
}

onMounted(async () => {
  savedRemind.value = defaultRemindDays.value
  remindDraft.value = defaultRemindDays.value
  const status = await fetchAuthStatus()
  authEnabled.value = status.enabled
  if (!status.enabled) return
  try {
    const data = await apiGet<SettingsData>('/settings')
    tokenDaysDraft.value = data.token_days
    savedTokenDays.value = data.token_days
    maxFailsDraft.value = data.login_max_fails
    savedMaxFails.value = data.login_max_fails
    lockMinutesDraft.value = data.login_lock_minutes
    savedLockMinutes.value = data.login_lock_minutes
  } catch (err) {
    saveError.value = err instanceof Error ? `读取登录设置失败：${err.message}` : '读取登录设置失败'
  }
})

async function save() {
  remindError.value = ''
  tokenDaysError.value = ''
  maxFailsError.value = ''
  lockMinutesError.value = ''
  saveError.value = ''

  const remind = Number(remindDraft.value)
  if (!Number.isInteger(remind) || remind < 0 || remind > 365) {
    remindError.value = '提醒天数需为 0-365 的整数'
    return
  }
  if (authEnabled.value) {
    const days = Number(tokenDaysDraft.value)
    if (!Number.isInteger(days) || days < 1 || days > 3650) {
      tokenDaysError.value = '登录有效期需为 1-3650 的整数'
      return
    }
    const fails = Number(maxFailsDraft.value)
    if (!Number.isInteger(fails) || fails < 1 || fails > 100) {
      maxFailsError.value = '失败次数需为 1-100 的整数'
      return
    }
    const lock = Number(lockMinutesDraft.value)
    if (!Number.isInteger(lock) || lock < 1 || lock > 1440) {
      lockMinutesError.value = '锁定时长需为 1-1440 的分钟数'
      return
    }
  }

  saving.value = true
  try {
    // 先写服务端，成功后再落本地，避免接口失败时本地已保存的部分成功状态
    if (authEnabled.value) {
      const data = await apiSend<SettingsData>('/settings', 'POST', {
        token_days: Number(tokenDaysDraft.value),
        login_max_fails: Number(maxFailsDraft.value),
        login_lock_minutes: Number(lockMinutesDraft.value),
      })
      tokenDaysDraft.value = data.token_days
      savedTokenDays.value = data.token_days
      maxFailsDraft.value = data.login_max_fails
      savedMaxFails.value = data.login_max_fails
      lockMinutesDraft.value = data.login_lock_minutes
      savedLockMinutes.value = data.login_lock_minutes
    }
    setDefaultRemindDays(remind)
    savedRemind.value = remind
    savedTip.value = true
    if (tipTimer) clearTimeout(tipTimer)
    tipTimer = setTimeout(() => {
      savedTip.value = false
    }, 2000)
  } catch (err) {
    saveError.value = err instanceof Error ? err.message : '保存失败'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="flex max-w-2xl flex-col gap-4 pt-2">
    <div>
      <h1 class="text-xl font-semibold text-ink md:text-[22px]">设置</h1>
      <p class="mt-1 text-sm text-ink-3">调整外观与默认值：主题点击即刻生效，其余修改需点击保存。</p>
    </div>

    <section class="panel p-5">
      <h2 class="text-sm font-semibold text-ink">外观</h2>
      <p class="mt-1 text-xs text-ink-3">选择界面主题，点击即刻生效，保存在本机浏览器中。</p>

      <div class="mt-4 grid grid-cols-2 gap-3">
        <button
          class="flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors"
          :class="!isDark ? 'border-brand bg-brand-soft' : 'border-line hover:border-line-strong'"
          @click="isDark && toggle()"
        >
          <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-warn-soft text-warn">
            <Sun :size="16" />
          </span>
          <span>
            <span class="block text-sm font-medium text-ink">亮色</span>
            <span class="block text-xs text-ink-3">Light</span>
          </span>
        </button>

        <button
          class="flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors"
          :class="isDark ? 'border-brand bg-brand-soft' : 'border-line hover:border-line-strong'"
          @click="!isDark && toggle()"
        >
          <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <Moon :size="16" />
          </span>
          <span>
            <span class="block text-sm font-medium text-ink">暗色</span>
            <span class="block text-xs text-ink-3">Dark</span>
          </span>
        </button>
      </div>
    </section>

    <section class="panel p-5">
      <h2 class="text-sm font-semibold text-ink">默认提醒天数</h2>
      <p class="mt-1 text-xs text-ink-3">新增服务时的默认提醒天数（仅影响新建，已有服务按各自的提醒天数计算）。</p>

      <div class="mt-4 flex items-center gap-3">
        <input v-model.number="remindDraft" type="number" min="0" max="365" class="field-input w-28" />
        <span class="text-sm text-ink-2">天</span>
      </div>
      <p v-if="remindError" class="mt-2 text-[13px] text-danger">{{ remindError }}</p>
    </section>

    <section v-if="authEnabled" class="panel p-5">
      <h2 class="text-sm font-semibold text-ink">登录有效期</h2>
      <p class="mt-1 text-xs text-ink-3">保存在服务端，多端共享；修改后下次登录生效。</p>

      <div class="mt-4 flex items-center gap-3">
        <input v-model.number="tokenDaysDraft" type="number" min="1" max="3650" class="field-input w-28" />
        <span class="text-sm text-ink-2">天</span>
      </div>
      <p v-if="tokenDaysError" class="mt-2 text-[13px] text-danger">{{ tokenDaysError }}</p>
    </section>

    <section v-if="authEnabled" class="panel p-5">
      <h2 class="text-sm font-semibold text-ink">登录限流</h2>
      <p class="mt-1 text-xs text-ink-3">
        同一 IP 登录连续失败达到次数后锁定，锁定期内拒绝该 IP 的尝试；保存后立即生效，失败计数 15 分钟窗口。
      </p>

      <div class="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <label class="flex items-center gap-2">
          <span class="text-sm text-ink-2">连续失败</span>
          <input v-model.number="maxFailsDraft" type="number" min="1" max="100" class="field-input w-20" />
          <span class="text-sm text-ink-2">次</span>
        </label>
        <label class="flex items-center gap-2">
          <span class="text-sm text-ink-2">锁定</span>
          <input v-model.number="lockMinutesDraft" type="number" min="1" max="1440" class="field-input w-24" />
          <span class="text-sm text-ink-2">分钟</span>
        </label>
      </div>
      <p v-if="maxFailsError || lockMinutesError" class="mt-2 text-[13px] text-danger">
        {{ maxFailsError || lockMinutesError }}
      </p>
    </section>

    <div class="flex items-center gap-3">
      <button class="btn btn-primary" :disabled="!dirty || saving" @click="save">
        {{ saving ? '保存中…' : '保存' }}
      </button>
      <span v-if="savedTip" class="text-[13px] text-ok">已保存</span>
      <span v-if="saveError" class="text-[13px] text-danger">{{ saveError }}</span>
    </div>

    <section class="panel flex items-start gap-3 p-5">
      <span class="mt-0.5 text-brand"><Info :size="16" /></span>
      <div>
        <h2 class="text-sm font-semibold text-ink">关于 ExpiryDesk</h2>
        <p class="mt-1 text-xs leading-relaxed text-ink-3">
          个人服务续期 / 到期管理台。记录服务、跟踪到期时间、到期前手动续费并跳转到官方续费页面。
          数据保存在你自己的数据库中，v1.0.0。
        </p>
      </div>
    </section>
  </div>
</template>
