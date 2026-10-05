import { ref } from 'vue'
import type { RenewUnit } from '../../shared/renew'
import { useToast } from './useToast'
import { useServices } from './useServices'
import { AuthExpiredError } from '../services/api'
import type { ServiceInput, ServiceItem } from '../services/api'

/** 登录失效已跳转登录页，不再弹错误 toast */
function shouldNotify(err: unknown): boolean {
  return !(err instanceof AuthExpiredError)
}

export function useServiceActions() {
  const { create, update, remove, renew } = useServices()
  const { show, error } = useToast()

  const formOpen = ref(false)
  const editing = ref<ServiceItem | null>(null)
  const renewing = ref<ServiceItem | null>(null)
  const deleting = ref<ServiceItem | null>(null)
  const busy = ref(false)

  function openAdd() {
    editing.value = null
    formOpen.value = true
  }

  function openEdit(service: ServiceItem) {
    editing.value = service
    formOpen.value = true
  }

  async function handleSave(input: ServiceInput) {
    busy.value = true
    try {
      if (editing.value) {
        await update(editing.value.id, input)
        show('服务已更新')
      } else {
        await create(input)
        show('服务已添加')
      }
      formOpen.value = false
    } catch (err) {
      if (shouldNotify(err)) error(err instanceof Error ? err.message : '保存失败')
    } finally {
      busy.value = false
    }
  }

  async function handleRenew(amount: number, unit: RenewUnit) {
    if (!renewing.value) return
    busy.value = true
    try {
      await renew(renewing.value.id, amount, unit)
      renewing.value = null
      show('续费成功，到期时间已更新')
    } catch (err) {
      if (shouldNotify(err)) error(err instanceof Error ? err.message : '续费失败')
    } finally {
      busy.value = false
    }
  }

  async function handleDelete() {
    if (!deleting.value) return
    busy.value = true
    try {
      await remove(deleting.value.id)
      deleting.value = null
      show('服务已删除')
    } catch (err) {
      if (shouldNotify(err)) error(err instanceof Error ? err.message : '删除失败')
    } finally {
      busy.value = false
    }
  }

  return {
    formOpen,
    editing,
    renewing,
    deleting,
    busy,
    openAdd,
    openEdit,
    handleSave,
    handleRenew,
    handleDelete,
  }
}
