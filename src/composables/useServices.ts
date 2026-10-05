import { computed, reactive } from 'vue'
import { computeStats, isSoonStatus, type StatsSummary } from '../../shared/status'
import { todayISO } from '../../shared/date'
import type { ServiceFilter, ServiceInput, ServiceItem, ServiceSort } from '../services/api'
import { createService, deleteService, getServices, renewService, updateService } from '../services/services'

interface ServicesState {
  all: ServiceItem[]
  loading: boolean
  loaded: boolean
  error: string
  q: string
  filter: ServiceFilter
  sort: ServiceSort
}

const state = reactive<ServicesState>({
  all: [],
  loading: false,
  loaded: false,
  error: '',
  q: '',
  filter: 'all',
  sort: 'asc',
})

async function fetchAll() {
  state.loading = true
  state.error = ''
  try {
    state.all = await getServices({})
    state.loaded = true
  } catch (error) {
    state.error = error instanceof Error ? error.message : '加载失败'
  } finally {
    state.loading = false
  }
}

export function useServices() {
  if (!state.loaded && !state.loading) void fetchAll()

  /** 应用关键字搜索后的行集：统计卡片、tab 计数、右侧面板都基于它 */
  const searched = computed(() => {
    const keyword = state.q.trim().toLowerCase()
    if (!keyword) return state.all
    return state.all.filter((row) =>
      [row.name, row.type, row.renew_url, row.note].some((field) => field.toLowerCase().includes(keyword)),
    )
  })

  const stats = computed<StatsSummary>(() => computeStats(searched.value, todayISO()))

  const counts = computed(() => {
    const value = stats.value
    return { all: value.total, soon: value.soon, within30: value.within30, expired: value.expired }
  })

  const visible = computed(() => {
    let rows = searched.value
    if (state.filter === 'soon') {
      rows = rows.filter((row) => isSoonStatus(row.status))
    } else if (state.filter === '30d') {
      rows = rows.filter((row) => row.remaining_days >= 0 && row.remaining_days <= 30)
    } else if (state.filter === 'expired') {
      rows = rows.filter((row) => row.remaining_days < 0)
    }
    const direction = state.sort === 'desc' ? -1 : 1
    return [...rows].sort((a, b) => a.expires_at.localeCompare(b.expires_at) * direction)
  })

  const railSoon = computed(() =>
    searched.value
      .filter((row) => isSoonStatus(row.status))
      .sort((a, b) => a.expires_at.localeCompare(b.expires_at)),
  )

  const railWithin30 = computed(() =>
    searched.value
      .filter((row) => row.remaining_days >= 0 && row.remaining_days <= 30)
      .sort((a, b) => a.expires_at.localeCompare(b.expires_at)),
  )

  async function refresh() {
    await fetchAll()
  }

  async function create(input: ServiceInput) {
    await createService(input)
    await fetchAll()
  }

  async function update(id: number, input: ServiceInput) {
    await updateService(id, input)
    await fetchAll()
  }

  async function remove(id: number) {
    await deleteService(id)
    await fetchAll()
  }

  async function renew(id: number, amount: number, unit: 'day' | 'month' | 'year') {
    await renewService(id, { amount, unit })
    await fetchAll()
  }

  return {
    state,
    stats,
    counts,
    visible,
    railSoon,
    railWithin30,
    refresh,
    create,
    update,
    remove,
    renew,
  }
}
