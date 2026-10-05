import { reactive } from 'vue'

interface ToastItem {
  id: number
  text: string
  kind: 'success' | 'error'
}

const items = reactive<ToastItem[]>([])
let seq = 0

function push(text: string, kind: ToastItem['kind']) {
  const id = ++seq
  items.push({ id, text, kind })
  window.setTimeout(() => {
    const index = items.findIndex((item) => item.id === id)
    if (index >= 0) items.splice(index, 1)
  }, 2600)
}

export function useToast() {
  const show = (text: string) => push(text, 'success')
  const error = (text: string) => push(text, 'error')
  return { items, show, error }
}
