import type { Status } from './status.js'

export interface ServiceRecord {
  id: number
  name: string
  type: string
  renew_url: string
  expires_at: string
  remind_days: number
  note: string
  created_at: string
  updated_at: string
}

export interface ServiceItem extends ServiceRecord {
  remaining_days: number
  status: Status
}

export interface ServiceInput {
  name: string
  type: string
  renew_url: string
  expires_at: string
  remind_days: number
  note: string
}

export type ServiceFilter = 'all' | 'soon' | '30d' | 'expired'
export type ServiceSort = 'asc' | 'desc'

export const SERVICE_TYPES = ['域名', 'VPS', '虚拟主机', 'API', '订阅', 'DNS', 'CDN', '其他'] as const

export type CountKey = 'all' | 'soon' | 'within30' | 'expired'

export const FILTERS: Array<{ value: ServiceFilter; label: string; countKey: CountKey }> = [
  { value: 'all', label: '全部', countKey: 'all' },
  { value: 'soon', label: '即将到期', countKey: 'soon' },
  { value: '30d', label: '30 天内', countKey: 'within30' },
  { value: 'expired', label: '已过期', countKey: 'expired' },
]

export interface Envelope<T> {
  ok: true
  data: T
}

export interface ErrorEnvelope {
  ok: false
  error: string
}

export type ApiResponse<T> = Envelope<T> | ErrorEnvelope
