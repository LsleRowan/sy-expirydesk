<script setup lang="ts">
import { Info } from 'lucide-vue-next'
import { computed, reactive, watch } from 'vue'
import { computeRenewDate, isValidRenewAmount, RENEW_UNITS, type RenewUnit } from '../../../shared/renew'
import { useToday } from '../../composables/useToday'
import type { ServiceItem } from '../../services/api'
import ModalShell from '../ModalShell.vue'

const props = defineProps<{ show: boolean; service: ServiceItem | null }>()
const emit = defineEmits<{ close: []; confirm: [amount: number, unit: RenewUnit] }>()

const form = reactive<{ amount: number | string; unit: RenewUnit }>({ amount: 1, unit: 'month' })

const amountValid = computed(() => isValidRenewAmount(Number(form.amount)))

const { today, refresh } = useToday()

watch(
  () => props.show,
  (show) => {
    if (!show) return
    refresh()
    form.amount = 1
    form.unit = 'month'
  },
)

const preview = computed(() => {
  if (!props.service || !amountValid.value) return ''
  return computeRenewDate(props.service.expires_at, Number(form.amount), form.unit, today.value)
})

const isExpired = computed(() => !!props.service && props.service.expires_at < today.value)

function confirm() {
  if (!props.service || !amountValid.value) return
  emit('confirm', Number(form.amount), form.unit)
}
</script>

<template>
  <ModalShell :show="show" :title="service ? `续费 ${service.name}` : '续费'" @close="emit('close')">
    <div class="flex flex-col gap-4">
      <div class="text-[13px] font-medium text-ink-2">续费时长</div>

      <div class="grid grid-cols-2 gap-4">
        <input
          v-model="form.amount"
          class="field-input"
          type="number"
          inputmode="numeric"
          min="1"
          max="120"
          step="1"
          placeholder="数量"
        />
        <select v-model="form.unit" class="field-input">
          <option v-for="unit in RENEW_UNITS" :key="unit.value" :value="unit.value">{{ unit.label }}</option>
        </select>
      </div>

      <p v-if="!amountValid" class="-mt-2 text-xs text-danger">续费数量需为 1-120 的整数</p>

      <div class="grid grid-cols-2 gap-4">
        <div class="flex flex-col gap-1.5">
          <span class="text-[13px] text-ink-3">当前到期</span>
          <div class="field-input !bg-panel-2 !text-ink-2">{{ service?.expires_at ?? '-' }}</div>
        </div>
        <div class="flex flex-col gap-1.5">
          <span class="text-[13px] text-ink-3">续费后到期</span>
          <div class="field-input border-ok/50 bg-ok-soft !font-medium text-ok">{{ preview || '-' }}</div>
        </div>
      </div>

      <div v-if="isExpired" class="rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn">
        该服务已过期，续费将从今天（{{ today }}）开始重新计算。
      </div>

      <div class="flex items-start gap-2 rounded-lg bg-panel-2 px-3 py-2.5 text-xs leading-relaxed text-ink-3">
        <Info :size="14" class="mt-0.5 shrink-0" />
        <span>续费后将更新到期时间，并保持其他信息不变。</span>
      </div>
    </div>

    <template #footer>
      <button class="btn btn-ghost" @click="emit('close')">取消</button>
      <button class="btn btn-primary" :disabled="!amountValid" @click="confirm">确认续费</button>
    </template>
  </ModalShell>
</template>
