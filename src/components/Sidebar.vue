<script setup lang="ts">
import { CalendarClock, Home, Layers, Settings, X } from 'lucide-vue-next'

defineProps<{ open: boolean }>()
defineEmits<{ close: [] }>()

const navItems = [
  { to: '/', label: '首页', icon: Home },
  { to: '/services', label: '服务管理', icon: Layers },
  { to: '/settings', label: '设置', icon: Settings },
]
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-40 bg-black/35 md:hidden"
    @click="$emit('close')"
  />

  <aside
    class="fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-line bg-panel transition-transform duration-200 md:translate-x-0"
    :class="open ? 'translate-x-0' : '-translate-x-full'"
  >
    <div class="flex items-center gap-3 px-5 pb-5 pt-5">
      <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white shadow-card">
        <CalendarClock :size="18" />
      </div>
      <div class="min-w-0">
        <div class="text-[15px] font-semibold leading-tight text-ink">ExpiryDesk</div>
        <div class="truncate text-xs text-ink-3">到期管理台</div>
      </div>
      <button
        class="ml-auto rounded-md p-1.5 text-ink-3 hover:bg-panel-2 hover:text-ink md:hidden"
        aria-label="关闭菜单"
        @click="$emit('close')"
      >
        <X :size="18" />
      </button>
    </div>

    <nav class="flex flex-col gap-1 px-3">
      <router-link
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-2 transition-colors hover:bg-panel-2 hover:text-ink"
        :exact="item.to === '/'"
        active-class="!bg-brand-soft !text-brand"
        exact-active-class="!bg-brand-soft !text-brand"
        @click="$emit('close')"
      >
        <component :is="item.icon" :size="17" class="shrink-0" />
        <span>{{ item.label }}</span>
      </router-link>
    </nav>

    <div class="mt-auto px-5 pb-5">
      <div class="text-xs leading-relaxed text-ink-3">
        管理你的服务<br />
        不再错过任何到期时间
      </div>
      <div class="mt-3 text-[11px] text-ink-3/70">
        v1.0.0 · © 2026
        <a
          href="https://github.com/lslerowan/sy-expirydesk"
          target="_blank"
          rel="noopener noreferrer"
          class="hover:text-brand"
          >LsleRowan</a
        >
      </div>
    </div>
  </aside>
</template>
