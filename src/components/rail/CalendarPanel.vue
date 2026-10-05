<script setup lang="ts">
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { buildMonthGrid, monthLabel, shiftMonth } from '../../../shared/date'
import { STATUS_META } from '../../../shared/status'
import { useServices } from '../../composables/useServices'
import { useToday } from '../../composables/useToday'
import type { ServiceItem } from '../../services/api'
import ServiceIcon from '../ServiceIcon.vue'
import StatusBadge from '../StatusBadge.vue'

const { state } = useServices()
const { today, refresh } = useToday()

const [initialYear, initialMonth] = today.value.split('-').map(Number)

const cursor = ref({ year: initialYear, month: initialMonth - 1 })
const selected = ref<string | null>(null)

const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

const cells = computed(() => buildMonthGrid(cursor.value.year, cursor.value.month))

const servicesByDate = computed(() => {
  const map = new Map<string, ServiceItem[]>()
  for (const service of state.all) {
    const list = map.get(service.expires_at)
    if (list) list.push(service)
    else map.set(service.expires_at, [service])
  }
  return map
})

/** 圆点颜色跟随服务状态四档（与状态徽章一致） */
function dotColor(service: ServiceItem): string {
  return STATUS_META[service.status].dot
}

const selectedServices = computed(() => (selected.value ? (servicesByDate.value.get(selected.value) ?? []) : []))

function prevMonth() {
  cursor.value = shiftMonth(cursor.value.year, cursor.value.month, -1)
}

function nextMonth() {
  cursor.value = shiftMonth(cursor.value.year, cursor.value.month, 1)
}

function goToday() {
  refresh()
  const [year, month] = today.value.split('-').map(Number)
  cursor.value = { year, month: month - 1 }
  selected.value = today.value
}
</script>

<template>
  <section class="panel overflow-hidden">
    <div class="flex items-center justify-between border-b border-line px-4 py-3.5">
      <div class="flex items-center gap-2.5">
        <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-soft text-brand">
          <CalendarDays :size="15" />
        </span>
        <h3 class="text-sm font-semibold text-ink">到期日历</h3>
      </div>
      <div class="flex items-center gap-1">
        <button class="rounded-md p-1 text-ink-3 transition-colors hover:bg-panel-2 hover:text-ink" aria-label="上个月" @click="prevMonth">
          <ChevronLeft :size="16" />
        </button>
        <button class="rounded-md p-1 text-ink-3 transition-colors hover:bg-panel-2 hover:text-ink" aria-label="下个月" @click="nextMonth">
          <ChevronRight :size="16" />
        </button>
      </div>
    </div>

    <div class="px-4 pt-4">
      <div class="mb-2 flex items-center justify-between">
        <span class="text-[13px] font-medium text-ink">{{ monthLabel(cursor.year, cursor.month) }}</span>
        <button class="text-xs text-ink-3 transition-colors hover:text-brand" @click="goToday">今天</button>
      </div>

      <div class="grid grid-cols-7 text-center text-[11px] text-ink-3">
        <div v-for="day in weekdays" :key="day" class="py-1">{{ day }}</div>
      </div>

      <div class="grid grid-cols-7 gap-y-1">
        <button
          v-for="cell in cells"
          :key="cell.iso"
          class="group flex flex-col items-center gap-1 rounded-lg py-1.5 transition-colors"
          :class="[cell.inMonth ? 'hover:bg-panel-2' : 'opacity-35', selected === cell.iso && 'ring-1 ring-brand']"
          @click="selected = selected === cell.iso ? null : cell.iso"
        >
          <span
            class="flex h-6 w-6 items-center justify-center rounded-full text-[12px] transition-colors"
            :class="
              cell.iso === today
                ? 'bg-brand font-semibold text-white'
                : selected === cell.iso
                  ? 'font-medium text-brand'
                  : 'text-ink-2'
            "
          >
            {{ cell.day }}
          </span>
          <span class="flex h-1.5 items-center gap-0.5">
            <i
              v-for="service in (servicesByDate.get(cell.iso) ?? []).slice(0, 3)"
              :key="service.id"
              class="block h-1.5 w-1.5 rounded-full"
              :style="{ background: dotColor(service) }"
            />
          </span>
        </button>
      </div>
    </div>

    <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-4 py-3 text-[11px] text-ink-3">
      <span class="flex items-center gap-1.5"><i class="h-2 w-2 rounded-full" :style="{ background: STATUS_META.expired.dot }" />已过期</span>
      <span class="flex items-center gap-1.5"><i class="h-2 w-2 rounded-full" :style="{ background: STATUS_META.critical.dot }" />7 天内到期</span>
      <span class="flex items-center gap-1.5"><i class="h-2 w-2 rounded-full" :style="{ background: STATUS_META.soon.dot }" />进入提醒范围</span>
      <span class="flex items-center gap-1.5"><i class="h-2 w-2 rounded-full" :style="{ background: STATUS_META.normal.dot }" />正常</span>
    </div>

    <Transition name="slide">
      <div v-if="selected" class="border-t border-line px-4 py-3">
        <div class="mb-2 flex items-center justify-between">
          <span class="text-xs font-medium text-ink-2">{{ selected }} 到期</span>
          <button class="text-xs text-ink-3 hover:text-ink" @click="selected = null">收起</button>
        </div>

        <div v-if="!selectedServices.length" class="text-xs text-ink-3">当天没有到期的服务</div>
        <div v-else class="flex flex-col gap-2">
          <div v-for="service in selectedServices" :key="service.id" class="flex items-center gap-2.5">
            <ServiceIcon :type="service.type" size="sm" />
            <div class="min-w-0 flex-1">
              <div class="truncate text-[13px] font-medium text-ink">{{ service.name }}</div>
              <div class="text-[11px] text-ink-3">{{ service.type }}</div>
            </div>
            <StatusBadge :status="service.status" />
          </div>
        </div>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.18s ease;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
