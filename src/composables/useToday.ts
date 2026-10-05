import { onBeforeUnmount, onMounted, ref } from 'vue'
import { todayISO } from '../../shared/date'

/**
 * 响应式「今天」：挂载时取值，标签页重新可见 / 聚焦时刷新，
 * 避免长期挂载的页面跨零点后仍使用昨天的日期。
 */
export function useToday() {
  const today = ref(todayISO())

  function refresh() {
    today.value = todayISO()
  }

  function onVisible() {
    if (document.visibilityState === 'visible') refresh()
  }

  onMounted(() => {
    refresh()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', refresh)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', onVisible)
    window.removeEventListener('focus', refresh)
  })

  return { today, refresh }
}
