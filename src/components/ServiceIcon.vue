<script setup lang="ts">
import { computed } from 'vue'
import { serviceIcon } from '../utils/serviceIcon'

const props = defineProps<{ type: string; size?: 'sm' | 'md' | 'lg' }>()

const meta = computed(() => serviceIcon(props.type))
const sizeCls = computed(
  () =>
    (
      {
        sm: 'h-8 w-8 rounded-lg',
        md: 'h-10 w-10 rounded-xl',
        lg: 'h-11 w-11 rounded-xl',
      } as const
    )[props.size ?? 'md'],
)
const iconSize = computed(() =>
  sizeCls.value.startsWith('h-8') ? 15 : sizeCls.value.startsWith('h-10') ? 18 : 20,
)
</script>

<template>
  <div class="flex shrink-0 items-center justify-center text-white" :class="[sizeCls, meta.cls]">
    <component :is="meta.icon" :size="iconSize" />
  </div>
</template>
