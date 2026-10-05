<script setup lang="ts">
import { useToast } from './composables/useToast'

const { items } = useToast()
</script>

<template>
  <router-view />

  <div class="fixed bottom-5 left-1/2 z-[70] flex -translate-x-1/2 flex-col items-center gap-2">
    <TransitionGroup name="toast">
      <div
        v-for="item in items"
        :key="item.id"
        class="menu-pop px-4 py-2.5 text-sm font-medium"
        :class="item.kind === 'error' ? 'text-danger' : 'text-ink'"
      >
        {{ item.text }}
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
