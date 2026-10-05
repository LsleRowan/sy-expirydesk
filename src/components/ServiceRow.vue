<script setup lang="ts">
import { ExternalLink, MoreVertical, Pencil, RefreshCw, Trash2 } from 'lucide-vue-next'
import { ref } from 'vue'
import type { ServiceItem } from '../services/api'
import ServiceIcon from './ServiceIcon.vue'
import StatusBadge from './StatusBadge.vue'

defineProps<{ service: ServiceItem }>()
defineEmits<{ edit: [service: ServiceItem]; renew: [service: ServiceItem]; remove: [service: ServiceItem] }>()

const menuOpen = ref(false)

function jump(service: ServiceItem) {
  menuOpen.value = false
  if (!service.renew_url) return
  window.open(service.renew_url, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <div
    class="flex flex-col gap-3 border-b border-line px-4 py-3.5 transition-colors last:border-b-0 last:rounded-b-[13px] hover:bg-panel-2 sm:flex-row sm:items-center sm:gap-4"
  >
    <div class="flex min-w-0 flex-1 items-center gap-3">
      <ServiceIcon :type="service.type" />
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <span class="truncate text-sm font-semibold text-ink">{{ service.name }}</span>
          <span class="badge !bg-panel-2 !text-ink-3">{{ service.type }}</span>
        </div>
        <a
          v-if="service.renew_url"
          :href="service.renew_url"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-0.5 block max-w-full truncate text-xs text-ink-3 hover:text-brand"
          :title="service.renew_url"
        >
          {{ service.renew_url }}
        </a>
        <div v-else class="mt-0.5 text-xs text-ink-3/70">未设置续费地址</div>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 sm:flex-nowrap sm:justify-start">
      <div class="text-xs leading-5 text-ink-2">
        <span class="text-ink-3">到期时间</span>
        <span class="ml-1.5 font-medium text-ink">{{ service.expires_at }}</span>
      </div>
      <div class="text-xs leading-5 text-ink-2">
        <span class="text-ink-3">剩余</span>
        <span class="ml-1.5 font-medium" :class="service.remaining_days < 0 ? 'text-danger' : 'text-ink'">
          {{ service.remaining_days >= 0 ? `${service.remaining_days} 天` : `过期 ${-service.remaining_days} 天` }}
        </span>
      </div>
      <div class="sm:hidden">
        <StatusBadge :status="service.status" />
      </div>
      <div class="hidden text-right sm:block sm:w-[86px] sm:shrink-0">
        <StatusBadge :status="service.status" />
      </div>
    </div>

    <div class="flex items-center gap-2 sm:shrink-0">
      <button class="btn btn-soft !px-3 !py-1.5 !text-[13px]" title="编辑服务信息" @click="$emit('edit', service)">
        <Pencil :size="13" />
        管理
      </button>
      <button class="btn btn-ghost !px-3 !py-1.5 !text-[13px]" title="记录续费" @click="$emit('renew', service)">
        <RefreshCw :size="13" />
        续费
      </button>

      <div class="relative">
        <button
          class="rounded-md p-1.5 text-ink-3 transition-colors hover:bg-panel-2 hover:text-ink"
          aria-label="更多操作"
          @click="menuOpen = !menuOpen"
        >
          <MoreVertical :size="16" />
        </button>

        <template v-if="menuOpen">
          <div class="fixed inset-0 z-40" @click="menuOpen = false" />
          <div class="menu-pop absolute right-0 top-full z-50 mt-1 w-36 overflow-hidden py-1">
            <button
              class="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-ink-2 transition-colors hover:bg-panel-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="!service.renew_url"
              @click="jump(service)"
            >
              <ExternalLink :size="14" />
              跳转续费页
            </button>
            <button
              class="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-danger transition-colors hover:bg-danger-soft"
              @click="menuOpen = false; $emit('remove', service)"
            >
              <Trash2 :size="14" />
              删除服务
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
