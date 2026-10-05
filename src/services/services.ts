import { apiGet, apiSend } from './api'
import type { ServiceFilter, ServiceInput, ServiceItem, ServiceRecord, ServiceSort } from './api'

export interface ServiceQuery {
  q?: string
  filter?: ServiceFilter
  sort?: ServiceSort
}

function buildQuery(query: ServiceQuery): string {
  const params = new URLSearchParams()
  if (query.q) params.set('q', query.q)
  if (query.filter && query.filter !== 'all') params.set('filter', query.filter)
  if (query.sort) params.set('sort', query.sort)
  const search = params.toString()
  return search ? `?${search}` : ''
}

export function getServices(query: ServiceQuery = {}): Promise<ServiceItem[]> {
  return apiGet<ServiceItem[]>(`/services${buildQuery(query)}`)
}

export function createService(input: ServiceInput): Promise<ServiceRecord> {
  return apiSend<ServiceRecord>('/services', 'POST', input)
}

export function updateService(id: number, input: ServiceInput): Promise<ServiceRecord> {
  return apiSend<ServiceRecord>(`/services?id=${id}`, 'PATCH', input)
}

export function deleteService(id: number): Promise<{ id: number }> {
  return apiSend<{ id: number }>(`/services?id=${id}`, 'DELETE')
}

export interface RenewPayload {
  amount: number
  unit: 'day' | 'month' | 'year'
}

export function renewService(id: number, payload: RenewPayload): Promise<ServiceItem> {
  return apiSend<ServiceItem>(`/renew?id=${id}`, 'POST', payload)
}
