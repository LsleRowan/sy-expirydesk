<script setup lang="ts">
import { Bell, CalendarClock, Clock, Layers, ShieldCheck } from 'lucide-vue-next'
import { computed } from 'vue'
import { weekdayCN } from '../../shared/date'
import DeleteConfirmModal from '../components/modals/DeleteConfirmModal.vue'
import RenewModal from '../components/modals/RenewModal.vue'
import ServiceFormModal from '../components/modals/ServiceFormModal.vue'
import CalendarPanel from '../components/rail/CalendarPanel.vue'
import ReminderPanel from '../components/rail/ReminderPanel.vue'
import ServiceTable from '../components/ServiceTable.vue'
import StatCard from '../components/StatCard.vue'
import { useServiceActions } from '../composables/useServiceActions'
import { useServices } from '../composables/useServices'
import { useToday } from '../composables/useToday'

const { state, stats, railSoon, railWithin30 } = useServices()
const {
  formOpen,
  editing,
  renewing,
  deleting,
  openAdd,
  openEdit,
  handleSave,
  handleRenew,
  handleDelete,
} = useServiceActions()

const { today } = useToday()
const greeting = computed(() => `你好，今天是 ${today.value} ${weekdayCN(today.value)}`)

const expiredHint = computed(() => {
  const value = stats.value.expired
  return state.loaded
    ? value > 0
      ? `${value} 个服务需要处理`
      : '暂无已过期服务'
    : '加载中'
})
</script>

<template>
  <div class="flex flex-col gap-4 pt-2">
    <div>
      <h1 class="text-xl font-semibold text-ink md:text-[22px]">{{ greeting }}</h1>
      <p class="mt-1 text-sm text-ink-3">合理安排，及时续费，让服务持续在线</p>
    </div>

    <div class="grid grid-cols-2 gap-4 xl:grid-cols-4">
      <StatCard label="服务总数" :value="state.loaded ? stats.total : '—'" hint="已管理的服务" :icon="Layers" tone="brand" />
      <StatCard label="即将到期" :value="state.loaded ? stats.soon : '—'" hint="已进入提醒范围" :icon="Bell" tone="red" />
      <StatCard label="30 天内到期" :value="state.loaded ? stats.within30 : '—'" hint="30 天内到期" :icon="Clock" tone="orange" />
      <StatCard label="已过期" :value="state.loaded ? stats.expired : '—'" :hint="expiredHint" :icon="ShieldCheck" tone="deep" />
    </div>

    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
      <div class="min-w-0">
        <ServiceTable @add="openAdd" @edit="openEdit" @renew="renewing = $event" @remove="deleting = $event" />
      </div>

      <aside class="flex flex-col gap-4">
        <ReminderPanel
          title="即将到期"
          :icon="CalendarClock"
          tone="warn"
          :items="railSoon"
          filter="soon"
          @renew="renewing = $event"
        />
        <ReminderPanel
          title="30 天内到期"
          :icon="Clock"
          tone="brand"
          :items="railWithin30"
          filter="30d"
          @renew="renewing = $event"
        />
        <CalendarPanel />
      </aside>
    </div>

    <ServiceFormModal :show="formOpen" :service="editing" @close="formOpen = false" @save="handleSave" />
    <RenewModal :show="renewing !== null" :service="renewing" @close="renewing = null" @confirm="handleRenew" />
    <DeleteConfirmModal
      :show="deleting !== null"
      :name="deleting?.name ?? ''"
      @close="deleting = null"
      @confirm="handleDelete"
    />
  </div>
</template>
