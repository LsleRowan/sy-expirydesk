<script setup lang="ts">
import { CalendarClock, ChevronRight } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import type { Component } from 'vue'
import type { ServiceFilter, ServiceItem } from '../../services/api'
import ServiceIcon from '../ServiceIcon.vue'

const props = defineProps<{
  title: string
  icon: Component
  tone: 'warn' | 'brand'
  items: ServiceItem[]
  filter: ServiceFilter
}>()

const emit = defineEmits<{ renew: [service: ServiceItem] }>()
const router = useRouter()

const toneCls = {
  warn: 'bg-warn-soft text-warn',
  brand: 'bg-brand-soft text-brand',
}

/** 剩余天数文字颜色跟随状态四档，与徽章口径一致 */
const statusTextCls: Record<string, string> = {
  expired: 'text-danger',
  critical: 'text-danger',
  soon: 'text-warn',
  normal: 'text-ink-2',
}

function viewAll() {
  void router.push({ path: '/services', query: { filter: props.filter } })
}
</script>

<template>
  <section class="panel overflow-hidden">
    <div class="flex items-center justify-between border-b border-line px-4 py-3.5">
      <div class="flex items-center gap-2.5">
        <span class="flex h-7 w-7 items-center justify-center rounded-lg" :class="toneCls[tone]">
          <component :is="icon" :size="15" />
        </span>
        <h3 class="text-sm font-semibold text-ink">{{ title }}</h3>
        <span class="rounded-full bg-panel-2 px-1.5 text-[11px] leading-4 text-ink-3">{{ items.length }}</span>
      </div>
      <button
        class="inline-flex items-center gap-0.5 text-xs text-ink-3 transition-colors hover:text-brand"
        @click="viewAll"
      >
        查看全部
        <ChevronRight :size="13" />
      </button>
    </div>

    <div v-if="!items.length" class="flex flex-col items-center gap-1.5 px-4 py-7 text-center">
      <CalendarClock :size="20" class="text-ink-3" />
      <div class="text-xs text-ink-3">暂无{{ title }}的服务</div>
    </div>

    <template v-else>
      <div
        v-for="service in items"
        :key="service.id"
        class="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0"
      >
        <ServiceIcon :type="service.type" size="sm" />
        <div class="min-w-0 flex-1">
          <div class="truncate text-[13px] font-medium text-ink">{{ service.name }}</div>
          <div class="mt-0.5 text-xs text-ink-3">
            <span :class="statusTextCls[service.status] ?? 'text-ink-2'">
              {{ service.remaining_days }} 天后
            </span>
            <span class="mx-1">·</span>
            {{ service.expires_at }}
          </div>
        </div>
        <button class="btn btn-soft !px-3 !py-1 !text-[12px]" @click="emit('renew', service)">续费</button>
      </div>
    </template>
  </section>
</template>
