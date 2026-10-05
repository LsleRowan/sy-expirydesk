<script setup lang="ts">
import { LogOut, Menu, Moon, Search, Settings, Sun, User } from 'lucide-vue-next'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { logout } from '../composables/useAuth'
import { useServices } from '../composables/useServices'
import { useTheme } from '../composables/useTheme'

defineEmits<{ menu: [] }>()

const { isDark, toggle } = useTheme()
const { state } = useServices()
const router = useRouter()

const userMenuOpen = ref(false)

function goSettings() {
  userMenuOpen.value = false
  router.push('/settings')
}

function onLogout() {
  userMenuOpen.value = false
  void logout().then(() => router.replace('/login'))
}
</script>

<template>
  <header class="sticky top-0 z-30 bg-page">
    <div class="flex h-16 items-center gap-3 px-4 md:px-6">
      <button
        class="rounded-md p-2 text-ink-2 hover:bg-panel hover:text-ink md:hidden"
        aria-label="打开菜单"
        @click="$emit('menu')"
      >
        <Menu :size="20" />
      </button>

      <div class="relative w-full max-w-sm md:ml-0">
        <Search :size="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
        <input
          v-model="state.q"
          type="search"
          placeholder="搜索服务名称、域名、备注..."
          class="field-input !pl-9 !pr-3"
        />
      </div>

      <div class="ml-auto flex items-center gap-1.5">
        <button
          class="rounded-md p-2 text-ink-2 transition-colors hover:bg-panel hover:text-ink"
          :aria-label="isDark ? '切换到亮色' : '切换到暗色'"
          @click="toggle"
        >
          <Sun v-if="!isDark" :size="18" />
          <Moon v-else :size="18" />
        </button>

        <div class="relative">
          <button
            class="rounded-md p-2 text-ink-2 transition-colors hover:bg-panel hover:text-ink"
            aria-label="账户"
            @click="userMenuOpen = !userMenuOpen"
          >
            <User :size="18" />
          </button>

          <template v-if="userMenuOpen">
            <div class="fixed inset-0 z-40" @click="userMenuOpen = false" />
            <div class="menu-pop absolute right-0 top-full z-50 mt-1 w-32 overflow-hidden py-1">
              <button
                class="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-ink-2 transition-colors hover:bg-panel-2 hover:text-ink"
                @click="goSettings"
              >
                <Settings :size="14" />
                设置
              </button>
              <button
                class="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-danger transition-colors hover:bg-danger-soft"
                @click="onLogout"
              >
                <LogOut :size="14" />
                退出登录
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </header>
</template>
