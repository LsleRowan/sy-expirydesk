<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { SERVICE_TYPES, type ServiceInput, type ServiceRecord } from '../../../shared/types'
import { useSettings } from '../../composables/useSettings'
import ModalShell from '../ModalShell.vue'

const props = defineProps<{ show: boolean; service: ServiceRecord | null }>()
const emit = defineEmits<{ close: []; save: [input: ServiceInput] }>()

const { defaultRemindDays } = useSettings()

const form = reactive<ServiceInput>({
  name: '',
  type: '其他',
  renew_url: '',
  expires_at: '',
  remind_days: 30,
  note: '',
})

/** 已存类型不在固定列表时（服务端允许任意 1-50 字符），动态补一个选项避免下拉显示为空 */
const typeOptions = computed(() =>
  form.type && !SERVICE_TYPES.includes(form.type as (typeof SERVICE_TYPES)[number])
    ? [...SERVICE_TYPES, form.type]
    : SERVICE_TYPES,
)

const isEdit = () => props.service !== null

watch(
  () => props.show,
  (show) => {
    if (!show) return
    const source = props.service
    form.name = source?.name ?? ''
    form.type = source?.type ?? '其他'
    form.renew_url = source?.renew_url ?? ''
    form.expires_at = source?.expires_at ?? ''
    form.remind_days = source?.remind_days ?? defaultRemindDays.value
    form.note = source?.note ?? ''
  },
)

function submit() {
  if (!form.name.trim()) return
  if (!form.expires_at) return
  emit('save', {
    name: form.name.trim(),
    type: form.type,
    renew_url: form.renew_url.trim(),
    expires_at: form.expires_at,
    remind_days: Number(form.remind_days) || 0,
    note: form.note.trim(),
  })
}
</script>

<template>
  <ModalShell :show="show" :title="isEdit() ? '编辑服务' : '添加服务'" @close="emit('close')">
    <form class="flex flex-col gap-4" @submit.prevent="submit">
      <label class="flex flex-col gap-1.5">
        <span class="text-[13px] font-medium text-ink-2">服务名称 <i class="not-italic text-danger">*</i></span>
        <input v-model="form.name" class="field-input" placeholder="例如 Cloudflare、example.com" maxlength="100" />
      </label>

      <div class="grid gap-4 sm:grid-cols-2">
        <label class="flex flex-col gap-1.5">
          <span class="text-[13px] font-medium text-ink-2">服务类型</span>
          <select v-model="form.type" class="field-input">
            <option v-for="type in typeOptions" :key="type" :value="type">{{ type }}</option>
          </select>
        </label>

        <label class="flex flex-col gap-1.5">
          <span class="text-[13px] font-medium text-ink-2">提醒天数</span>
          <input v-model.number="form.remind_days" class="field-input" type="number" min="0" max="365" />
        </label>
      </div>

      <label class="flex flex-col gap-1.5">
        <span class="text-[13px] font-medium text-ink-2">续费地址</span>
        <input
          v-model="form.renew_url"
          class="field-input"
          placeholder="https://dash.cloudflare.com/.../billing"
          maxlength="500"
        />
      </label>

      <label class="flex flex-col gap-1.5">
        <span class="text-[13px] font-medium text-ink-2">到期时间 <i class="not-italic text-danger">*</i></span>
        <input v-model="form.expires_at" class="field-input" type="date" max="9999-12-31" />
      </label>

      <label class="flex flex-col gap-1.5">
        <span class="text-[13px] font-medium text-ink-2">备注</span>
        <textarea
          v-model="form.note"
          class="field-input min-h-[76px] resize-y"
          placeholder="可选：账号、套餐、用途等"
          maxlength="2000"
        />
      </label>
    </form>

    <template #footer>
      <button class="btn btn-ghost" @click="emit('close')">取消</button>
      <button class="btn btn-primary" :disabled="!form.name.trim() || !form.expires_at" @click="submit">保存</button>
    </template>
  </ModalShell>
</template>
