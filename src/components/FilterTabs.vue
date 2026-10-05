<script setup lang="ts">
import { FILTERS, type ServiceFilter } from '../../shared/types'

defineProps<{
  modelValue: ServiceFilter
  counts: { all: number; soon: number; within30: number; expired: number }
}>()
defineEmits<{ 'update:modelValue': [value: ServiceFilter] }>()
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <button
      v-for="tab in FILTERS"
      :key="tab.value"
      class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors"
      :class="
        modelValue === tab.value
          ? 'border-brand bg-brand text-white'
          : 'border-line bg-panel text-ink-2 hover:border-line-strong hover:text-ink'
      "
      @click="$emit('update:modelValue', tab.value)"
    >
      {{ tab.label }}
      <span
        class="rounded px-1 text-[11px] leading-4"
        :class="modelValue === tab.value ? 'bg-white/20 text-white' : 'bg-panel-2 text-ink-3'"
      >
        {{ counts[tab.countKey] }}
      </span>
    </button>
  </div>
</template>
