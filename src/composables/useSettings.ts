import { ref } from 'vue'

const KEY = 'expirydesk-default-remind'
const defaultRemindDays = ref(30)

function load() {
  const raw = localStorage.getItem(KEY)
  if (raw === null) return
  const saved = Number(raw)
  defaultRemindDays.value = Number.isInteger(saved) && saved >= 0 && saved <= 365 ? saved : 30
}

load()

export function useSettings() {
  function setDefaultRemindDays(value: number) {
    const normalized = Math.min(365, Math.max(0, Math.round(value) || 0))
    defaultRemindDays.value = normalized
    localStorage.setItem(KEY, String(normalized))
  }

  return { defaultRemindDays, setDefaultRemindDays }
}
