import type {
  ApiResponse,
  Envelope,
  ServiceFilter,
  ServiceInput,
  ServiceItem,
  ServiceRecord,
  ServiceSort,
} from '../../shared/types'
import { setAuthState } from '../composables/useAuth'

export type { ServiceFilter, ServiceInput, ServiceItem, ServiceRecord, ServiceSort }
export type { StatsSummary } from '../../shared/status'

const BASE = '/api'

/** 登录失效：已跳转登录页，调用方可据此跳过错误 toast */
export class AuthExpiredError extends Error {
  constructor() {
    super('登录已过期')
    this.name = 'AuthExpiredError'
  }
}

function redirectToLogin(): void {
  if (window.location.pathname.startsWith('/login')) return
  window.location.href = '/login'
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  let payload: ApiResponse<T> | null = null
  try {
    payload = (await response.json()) as ApiResponse<T>
  } catch {
    payload = null
  }

  if (response.status === 401) {
    setAuthState({ authenticated: false })
    redirectToLogin()
    throw new AuthExpiredError()
  }

  if (!payload) throw new Error(`请求失败（HTTP ${response.status}）`)
  if (!payload.ok) throw new Error(payload.error || `请求失败（HTTP ${response.status}）`)
  return (payload as Envelope<T>).data
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path)
}

export function apiSend<T>(path: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown): Promise<T> {
  return request<T>(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}
