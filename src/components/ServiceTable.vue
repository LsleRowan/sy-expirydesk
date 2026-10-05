<script setup lang="ts">
import { Inbox, Plus } from 'lucide-vue-next'
import { useServices } from '../composables/useServices'
import type { ServiceItem } from '../services/api'
import FilterTabs from './FilterTabs.vue'
import ServiceRow from './ServiceRow.vue'
import SortMenu from './SortMenu.vue'

withDefaults(defineProps<{ title?: string; showHeader?: boolean; showAdd?: boolean }>(), {
  title: '服务列表',
  showHeader: true,
  showAdd: true,
})
defineEmits<{
  edit: [service: ServiceItem]
  renew: [service: ServiceItem]
  remove: [service: ServiceItem]
  add: []
}>()

const { state, counts, visible, refresh } = useServices()
</script>

<template>
  <section class="panel">
    <div v-if="showHeader" class="flex flex-col gap-3 border-b border-line px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex flex-wrap items-center gap-3">
        <h2 class="text-[15px] font-semibold text-ink">{{ title }}</h2>
        <FilterTabs v-model="state.filter" :counts="counts" />
      </div>
      <div class="flex items-center gap-2">
        <button v-if="showAdd" class="btn btn-primary !py-1.5 !text-[13px]" @click="$emit('add')">
          <Plus :size="14" />
          添加服务
        </button>
        <SortMenu v-model="state.sort" />
      </div>
    </div>
    <div v-else class="flex items-center justify-end border-b border-line px-4 py-3">
      <SortMenu v-model="state.sort" />
    </div>

    <div v-if="state.loading && !state.all.length" class="flex flex-col items-center gap-2 py-14 text-sm text-ink-3">
      正在加载服务…
    </div>

    <div v-else-if="state.error" class="flex flex-col items-center gap-2 py-14 text-sm">
      <span class="text-danger">{{ state.error }}</span>
      <button class="btn btn-ghost !py-1.5 !text-[13px]" @click="refresh">重新加载</button>
    </div>

    <template v-else>
      <ServiceRow
        v-for="service in visible"
        :key="service.id"
        :service="service"
        @edit="$emit('edit', $event)"
        @renew="$emit('renew', $event)"
        @remove="$emit('remove', $event)"
      />

      <div v-if="!visible.length" class="flex flex-col items-center gap-2 py-14 text-center">
        <Inbox :size="26" class="text-ink-3" />
        <div class="text-sm font-medium text-ink-2">没有符合条件的服务</div>
        <div class="text-xs text-ink-3">试试调整筛选条件，或点击「添加服务」新增一个</div>
      </div>
    </template>
  </section>
</template>
