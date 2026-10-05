<script setup lang="ts">
import type { Component } from 'vue'

withDefaults(
  defineProps<{
    label: string
    value: number | string
    hint: string
    icon: Component
    tone: 'brand' | 'red' | 'orange' | 'deep'
  }>(),
  {},
)

const toneCls: Record<string, string> = {
  brand: 'bg-brand-soft text-brand',
  red: 'bg-danger-soft text-danger',
  orange: 'bg-warn-soft text-warn',
  deep: 'bg-deep-soft text-deep',
}

const labelCls: Record<string, string> = {
  brand: 'text-brand',
  red: 'text-danger',
  orange: 'text-warn',
  deep: 'text-deep',
}
</script>

<template>
  <div class="panel flex flex-col gap-2 p-4">
    <div class="flex items-center gap-2.5">
      <span class="flex h-8 w-8 items-center justify-center rounded-lg" :class="toneCls[tone]">
        <component :is="icon" :size="16" />
      </span>
      <span class="text-[13px] font-medium" :class="labelCls[tone]">{{ label }}</span>
    </div>
    <div class="text-[26px] font-semibold leading-none text-ink">{{ value }}</div>
    <div class="text-xs text-ink-3">{{ hint }}</div>
  </div>
</template>
