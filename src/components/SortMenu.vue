<script setup lang="ts">
import { ArrowDownAZ, ArrowUpAZ } from 'lucide-vue-next'
import type { ServiceSort } from '../services/api'

defineProps<{ modelValue: ServiceSort }>()
defineEmits<{ 'update:modelValue': [value: ServiceSort] }>()
</script>

<template>
  <div class="flex items-center rounded-lg border border-line bg-panel p-0.5">
    <button
      class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px] transition-colors"
      :class="modelValue === 'asc' ? 'bg-brand-soft text-brand' : 'text-ink-2 hover:text-ink'"
      title="到期时间升序"
      @click="$emit('update:modelValue', 'asc')"
    >
      <ArrowUpAZ :size="14" />
      <span class="hidden sm:inline">到期时间升序</span>
    </button>
    <button
      class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px] transition-colors"
      :class="modelValue === 'desc' ? 'bg-brand-soft text-brand' : 'text-ink-2 hover:text-ink'"
      title="到期时间降序"
      @click="$emit('update:modelValue', 'desc')"
    >
      <ArrowDownAZ :size="14" />
      <span class="hidden sm:inline">到期时间降序</span>
    </button>
  </div>
</template>
