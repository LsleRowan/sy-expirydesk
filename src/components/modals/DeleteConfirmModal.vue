<script setup lang="ts">
import { TriangleAlert } from 'lucide-vue-next'
import ModalShell from '../ModalShell.vue'

defineProps<{ show: boolean; name: string }>()
defineEmits<{ close: []; confirm: [] }>()
</script>

<template>
  <ModalShell :show="show" title="删除服务" width="max-w-md" @close="$emit('close')">
    <div class="flex items-start gap-3">
      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
        <TriangleAlert :size="17" />
      </span>
      <div class="pt-1">
        <p class="text-sm font-medium text-ink">确定要删除这个服务吗？</p>
        <p class="mt-1 text-[13px] text-ink-3">
          <span class="text-ink-2">{{ name }}</span>
          将被永久删除，此操作无法撤销。
        </p>
      </div>
    </div>

    <template #footer>
      <button class="btn btn-ghost" @click="$emit('close')">取消</button>
      <button class="btn bg-danger text-white hover:brightness-95" @click="$emit('confirm')">确认删除</button>
    </template>
  </ModalShell>
</template>
