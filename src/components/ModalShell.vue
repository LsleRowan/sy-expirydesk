<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { onBeforeUnmount, onMounted, watch } from 'vue'

const props = withDefaults(defineProps<{ title: string; show: boolean; width?: string }>(), { width: 'max-w-lg' })
const emit = defineEmits<{ close: [] }>()

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.show) emit('close')
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

/** 引用计数：多个弹窗同时打开时，全部关闭才还原 body 滚动 */
let lockCount = 0

function lockBody() {
  if (lockCount++ === 0) document.body.style.overflow = 'hidden'
}

function unlockBody() {
  if (lockCount > 0 && --lockCount === 0) document.body.style.overflow = ''
}

watch(
  () => props.show,
  (show) => (show ? lockBody() : unlockBody()),
  { immediate: true },
)

onBeforeUnmount(() => {
  if (props.show) unlockBody()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40" />
        <div class="menu-pop relative flex max-h-[90vh] w-full flex-col overflow-hidden" :class="width">
          <div class="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h3 class="text-[15px] font-semibold text-ink">{{ title }}</h3>
            <button
              class="rounded-md p-1 text-ink-3 transition-colors hover:bg-panel-2 hover:text-ink"
              aria-label="关闭"
              @click="emit('close')"
            >
              <X :size="17" />
            </button>
          </div>

          <div class="overflow-y-auto px-5 py-4">
            <slot />
          </div>

          <div v-if="$slots.footer" class="flex justify-end gap-2 border-t border-line px-5 py-3.5">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.18s ease;
}
.modal-enter-active > :last-child,
.modal-leave-active > :last-child {
  transition: transform 0.18s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from > :last-child,
.modal-leave-to > :last-child {
  transform: translateY(8px) scale(0.98);
}
</style>
