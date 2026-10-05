<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import DeleteConfirmModal from '../components/modals/DeleteConfirmModal.vue'
import RenewModal from '../components/modals/RenewModal.vue'
import ServiceFormModal from '../components/modals/ServiceFormModal.vue'
import ServiceTable from '../components/ServiceTable.vue'
import { useServiceActions } from '../composables/useServiceActions'
import { useServices } from '../composables/useServices'
import { FILTERS } from '../../shared/types'

const route = useRoute()
const { state, counts } = useServices()
const { formOpen, editing, renewing, deleting, openAdd, openEdit, handleSave, handleRenew, handleDelete } =
  useServiceActions()

onMounted(() => {
  const raw = route.query.filter
  const matched = FILTERS.find((item) => item.value === raw)
  state.filter = matched ? matched.value : 'all'
})

const summary = computed(() => {
  const total = counts.value.all
  const active = FILTERS.find((item) => item.value === state.filter)
  const shown = active && active.countKey !== 'all' ? counts.value[active.countKey] : total
  return `共 ${total} 个服务${state.filter === 'all' ? '' : `，当前筛选 ${shown} 个`}`
})
</script>

<template>
  <div class="flex flex-col gap-4 pt-2">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold text-ink md:text-[22px]">服务管理</h1>
        <p class="mt-1 text-sm text-ink-3">管理你部署、购买或订阅的所有服务与到期时间。</p>
      </div>
      <span class="text-xs text-ink-3">{{ summary }}</span>
    </div>

    <ServiceTable title="全部服务" @add="openAdd" @edit="openEdit" @renew="renewing = $event" @remove="deleting = $event" />

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
