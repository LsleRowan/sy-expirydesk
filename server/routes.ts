import { isValidISO, todayISO } from '../shared/date.js'
import { computeRenewDate, isValidRenewAmount } from '../shared/renew.js'
import { computeStats, deriveStatus, isSoonStatus, remainingDays, type StatsSummary } from '../shared/status.js'
import type {
  ServiceFilter,
  ServiceInput,
  ServiceItem,
  ServiceRecord,
  ServiceSort,
} from '../shared/types.js'
import {
  buildAuthCookie,
  buildClearCookie,
  isPasswordConfigured,
  issueToken,
  resolveTokenDays,
  verifyAuthToken,
  verifyPassword,
} from './auth.js'
import { getStore, StoreError, type PlatformEnv } from './db.js'
import { checkLocked, clearFails, getClientIp, getLoginLimits, recordFail } from './rateLimit.js'

const PUBLIC_PATHS = new Set(['/api/health', '/api/auth/status'])

/**
 * 所有 API 响应的基础安全头。
 * HSTS 与 CSP 只配在静态层（vercel.json / public/_headers），因为它们仅对 HTML 文档有意义，
 * 且 Vercel 默认已带 HSTS，避免重复下发；CF 侧 _headers 不作用于 Functions，故这些头在代码里兜底。
 */
const BASE_SECURITY_HEADERS: Record<string, string> = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'SAMEORIGIN',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...BASE_SECURITY_HEADERS },
  })
}

function ok<T>(data: T): Response {
  return json({ ok: true, data })
}

function okWithHeaders<T>(data: T, headers: Record<string, string | string[]>): Response {
  const responseHeaders = new Headers({
    'content-type': 'application/json; charset=utf-8',
    ...BASE_SECURITY_HEADERS,
  })
  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      for (const item of value) responseHeaders.append(key, item)
    } else {
      responseHeaders.set(key, value)
    }
  }
  return new Response(JSON.stringify({ ok: true, data }), { status: 200, headers: responseHeaders })
}

function fail(error: string, status = 400): Response {
  return json({ ok: false, error }, status)
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const data = await request.json()
    return data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function toItem(row: ServiceRecord, today: string): ServiceItem {
  const remaining = remainingDays(row.expires_at, today)
  return { ...row, remaining_days: remaining, status: deriveStatus(remaining, row.remind_days) }
}

function isSoon(item: ServiceItem): boolean {
  return isSoonStatus(item.status)
}

function queryId(url: URL): number | null {
  const raw = url.searchParams.get('id')
  if (!raw || !/^\d+$/.test(raw)) return null
  return Number(raw)
}

async function getTokenDays(env?: PlatformEnv): Promise<number> {
  const raw = await getStore(env).getSetting('token_days')
  const days = Number(raw)
  return Number.isInteger(days) && days >= 1 && days <= 3650 ? days : resolveTokenDays()
}

interface ValidationResult {
  input?: ServiceInput
  error?: string
}

function validateService(raw: Record<string, unknown>, partial: boolean): ValidationResult {
  const read = <T>(key: string): T | undefined => (key in raw ? (raw[key] as T) : undefined)

  const name = read<string>('name')
  const type = read<string>('type')
  const renewUrl = read<string>('renew_url')
  const expiresAt = read<string>('expires_at')
  const remindDays = read<number>('remind_days')
  const note = read<string>('note')

  if (!partial) {
    if (typeof name !== 'string' || !name.trim()) return { error: '请填写服务名称' }
    if (typeof expiresAt !== 'string' || !isValidISO(expiresAt)) return { error: '请选择有效的到期时间' }
  }
  if (name !== undefined && (typeof name !== 'string' || !name.trim() || name.trim().length > 100)) {
    return { error: '服务名称需为 1-100 个字符' }
  }
  if (type !== undefined && (typeof type !== 'string' || !type.trim() || type.trim().length > 50)) {
    return { error: '服务类型需为 1-50 个字符' }
  }
  if (renewUrl !== undefined) {
    if (typeof renewUrl !== 'string' || renewUrl.trim().length > 500) return { error: '续费地址过长' }
    if (renewUrl.trim() && !/^https?:\/\//i.test(renewUrl.trim())) return { error: '续费地址需以 http(s):// 开头' }
  }
  if (expiresAt !== undefined && !isValidISO(expiresAt)) return { error: '请选择有效的到期时间' }
  if (remindDays !== undefined && (!Number.isInteger(remindDays) || remindDays < 0 || remindDays > 365)) {
    return { error: '提醒天数需为 0-365 的整数' }
  }
  if (note !== undefined && (typeof note !== 'string' || note.length > 2000)) return { error: '备注不能超过 2000 字' }

  const input: ServiceInput = {
    name: (name ?? '').trim(),
    type: (type ?? '其他').trim(),
    renew_url: (renewUrl ?? '').trim(),
    expires_at: (expiresAt ?? '') as string,
    remind_days: remindDays ?? 30,
    note: (note ?? '').trim(),
  }
  return { input }
}

function applyFilter(rows: ServiceItem[], filter: ServiceFilter): ServiceItem[] {
  if (filter === 'soon') return rows.filter(isSoon)
  if (filter === '30d') return rows.filter((row) => row.remaining_days >= 0 && row.remaining_days <= 30)
  if (filter === 'expired') return rows.filter((row) => row.remaining_days < 0)
  return rows
}

async function renewById(request: Request, id: number, url: URL, env?: PlatformEnv): Promise<Response> {
  const store = getStore(env)
  const current = await store.get(id)
  if (!current) return fail('服务不存在', 404)

  const body = await readBody(request)
  const rawAmount = body.amount ?? url.searchParams.get('amount')
  const unit = body.unit ?? url.searchParams.get('unit')
  const amount = typeof rawAmount === 'string' ? Number(rawAmount) : rawAmount

  if (!isValidRenewAmount(amount)) return fail('续费数量需为 1-120 的整数')
  if (unit !== 'day' && unit !== 'month' && unit !== 'year') return fail('续费单位无效')

  const today = todayISO()
  const nextDate = computeRenewDate(current.expires_at, amount, unit, today)
  const updated = await store.setExpiry(id, nextDate)
  return ok(toItem(updated, today))
}

export async function handleRequest(request: Request, env?: PlatformEnv): Promise<Response> {
  const url = new URL(request.url)
  const method = request.method.toUpperCase()
  const path = url.pathname.replace(/\/+$/, '') || '/'

  try {
    if (path === '/api/auth/status' && method === 'GET') {
      const enabled = isPasswordConfigured(env)
      return ok({ enabled, authenticated: enabled && (await verifyAuthToken(request, env)) })
    }

    if (path === '/api/login' && method === 'POST') {
      if (!isPasswordConfigured(env)) return fail('服务端未配置登录密码（AUTH_PASSWORD）', 503)
      const ip = getClientIp(request)
      const lockedFor = await checkLocked(ip, env)
      if (lockedFor !== null) {
        return fail(`登录过于频繁，请 ${lockedFor} 分钟后重试`, 429)
      }
      const body = await readBody(request)
      const password = typeof body.password === 'string' ? body.password : ''
      if (!password || !(await verifyPassword(password, env))) {
        const limits = await getLoginLimits(env)
        const locked = await recordFail(ip, limits, env)
        if (locked) {
          return fail(`登录过于频繁，已锁定 ${limits.lockMinutes} 分钟，请稍后重试`, 429)
        }
        return fail('密码错误', 401)
      }
      await clearFails(ip, env)
      const days = await getTokenDays(env)
      const token = await issueToken(days, env)
      return okWithHeaders({ authenticated: true }, { 'set-cookie': buildAuthCookie(request, token, days) })
    }

    if (path === '/api/logout' && method === 'POST') {
      return okWithHeaders({ authenticated: false }, { 'set-cookie': buildClearCookie(request) })
    }

    if (!PUBLIC_PATHS.has(path)) {
      if (!isPasswordConfigured(env)) return fail('服务端未配置登录密码（AUTH_PASSWORD）', 503)
      if (!(await verifyAuthToken(request, env))) {
        return fail('未登录或登录已过期', 401)
      }
    }

    if (path === '/api/settings' && method === 'GET') {
      const limits = await getLoginLimits(env)
      return ok({
        token_days: await getTokenDays(env),
        login_max_fails: limits.maxFails,
        login_lock_minutes: limits.lockMinutes,
      })
    }

    if (path === '/api/settings' && method === 'POST') {
      const body = await readBody(request)
      const days = body.token_days
      if (typeof days !== 'number' || !Number.isInteger(days) || days < 1 || days > 3650) {
        return fail('登录有效期需为 1-3650 的整数')
      }
      const maxFails = body.login_max_fails
      if (
        maxFails !== undefined &&
        (typeof maxFails !== 'number' || !Number.isInteger(maxFails) || maxFails < 1 || maxFails > 100)
      ) {
        return fail('失败次数需为 1-100 的整数')
      }
      const lockMinutes = body.login_lock_minutes
      if (
        lockMinutes !== undefined &&
        (typeof lockMinutes !== 'number' || !Number.isInteger(lockMinutes) || lockMinutes < 1 || lockMinutes > 1440)
      ) {
        return fail('锁定时长需为 1-1440 的分钟数')
      }
      await getStore(env).setSetting('token_days', String(days))
      if (maxFails !== undefined) await getStore(env).setSetting('login_max_fails', String(maxFails))
      if (lockMinutes !== undefined) await getStore(env).setSetting('login_lock_minutes', String(lockMinutes))
      const limits = await getLoginLimits(env)
      return ok({
        token_days: days,
        login_max_fails: limits.maxFails,
        login_lock_minutes: limits.lockMinutes,
      })
    }

    if (path === '/api/health') return ok({ status: 'up' })

    if (path === '/api/stats' && method === 'GET') {
      const today = todayISO()
      const rows = await getStore(env).list()
      const stats: StatsSummary = computeStats(rows, today)
      return ok(stats)
    }

    const renewPathMatch = path.match(/^\/api\/services\/(\d+)\/renew$/)
    if (method === 'POST' && (path === '/api/renew' || renewPathMatch)) {
      const id = renewPathMatch ? Number(renewPathMatch[1]) : queryId(url)
      if (id === null) return fail('缺少服务 ID')
      return renewById(request, id, url, env)
    }

    const pathIdMatch = path.match(/^\/api\/services\/(\d+)$/)
    const singleId = pathIdMatch ? Number(pathIdMatch[1]) : path === '/api/services' ? queryId(url) : null

    if (singleId !== null) {
      const store = getStore(env)

      if (method === 'GET') {
        const row = await store.get(singleId)
        if (!row) return fail('服务不存在', 404)
        return ok(toItem(row, todayISO()))
      }

      if (method === 'PATCH') {
        const body = await readBody(request)
        const { input, error } = validateService(body, true)
        if (!input || error) return fail(error ?? '参数无效')
        const current = await store.get(singleId)
        if (!current) return fail('服务不存在', 404)
        // 按“字段是否出现”合并：空串可真正清空（renew_url），缺省字段保持原值
        const merged: ServiceInput = {
          name: 'name' in body ? input.name : current.name,
          type: 'type' in body ? input.type : current.type,
          renew_url: 'renew_url' in body ? input.renew_url : current.renew_url,
          expires_at: 'expires_at' in body ? input.expires_at : current.expires_at,
          remind_days: 'remind_days' in body ? input.remind_days : current.remind_days,
          note: 'note' in body ? input.note : current.note,
        }
        const updated = await store.update(singleId, merged)
        return ok(toItem(updated, todayISO()))
      }

      if (method === 'DELETE') {
        await store.remove(singleId)
        return ok({ id: singleId })
      }

      return fail('方法不允许', 405)
    }

    if (path === '/api/services' && method === 'GET') {
      const today = todayISO()
      const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
      const filter = (url.searchParams.get('filter') ?? 'all') as ServiceFilter
      const sort = (url.searchParams.get('sort') ?? 'asc') as ServiceSort

      const validFilters: ServiceFilter[] = ['all', 'soon', '30d', 'expired']
      const activeFilter = validFilters.includes(filter) ? filter : 'all'

      let items = (await getStore(env).list()).map((row) => toItem(row, today))
      items = applyFilter(items, activeFilter)
      if (q) {
        items = items.filter((row) =>
          [row.name, row.type, row.renew_url, row.note].some((field) => field.toLowerCase().includes(q)),
        )
      }
      items.sort((a, b) =>
        sort === 'desc' ? b.expires_at.localeCompare(a.expires_at) : a.expires_at.localeCompare(b.expires_at),
      )
      return ok(items)
    }

    if (path === '/api/services' && method === 'POST') {
      const body = await readBody(request)
      const { input, error } = validateService(body, false)
      if (!input || error) return fail(error ?? '参数无效')
      const created = await getStore(env).create(input)
      return ok(created)
    }

    return fail('接口不存在', 404)
  } catch (err) {
    // 详情只进日志，不回给客户端：StoreError 仅在业务可公开时透出，其余一律通用文案
    console.error(`[api] ${method} ${path} failed:`, err)
    if (err instanceof StoreError && err.expose) return fail(err.message, 500)
    return fail('服务器内部错误', 500)
  }
}
