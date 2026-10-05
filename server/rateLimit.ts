import { getStore, type PlatformEnv, type DataStore } from './db.js'

/** 失败计数窗口固定 15 分钟：窗口内累加，过期自动清零（实现细节，不进设置页） */
const FAIL_WINDOW_MS = 15 * 60 * 1000

const DEFAULT_MAX_FAILS = 5
const DEFAULT_LOCK_MINUTES = 30

/** 新版状态键（单键合并失败计数与锁定），旧键懒迁移 + 清理器兜底 */
const STATE_PREFIX = 'login_state:'
const LEGACY_FAILS_PREFIX = 'login_fails:'
const LEGACY_LOCK_PREFIX = 'login_lock:'
/** 存储中过期键的清理频率（每隔离室至少间隔该时长才扫一次） */
const SWEEP_INTERVAL_MS = 10 * 60 * 1000
/** 进程内状态条数上限（超出按最早插入淘汰，个人规模远达不到） */
const MAX_MEM_ENTRIES = 5000

export interface LoginLimits {
  maxFails: number
  lockMinutes: number
}

export async function getLoginLimits(env?: PlatformEnv): Promise<LoginLimits> {
  const store = getStore(env)
  const fails = Number(await store.getSetting('login_max_fails'))
  const minutes = Number(await store.getSetting('login_lock_minutes'))
  return {
    maxFails: Number.isInteger(fails) && fails >= 1 && fails <= 100 ? fails : DEFAULT_MAX_FAILS,
    lockMinutes: Number.isInteger(minutes) && minutes >= 1 && minutes <= 1440 ? minutes : DEFAULT_LOCK_MINUTES,
  }
}

/**
 * 取客户端 IP（按运行时选择可信来源，杜绝跨平台头部伪造）：
 * - Cloudflare Workers（无 process）：cf-connecting-ip 由 CF 覆写不可伪造；
 *   回退 x-forwarded-for 末段（CF 把真实 IP 追加在尾部）
 * - Node（Vercel / 本地）：x-real-ip 为平台写入；x-forwarded-for 被 Vercel 整体覆写，首段即真实客户端
 */
export function getClientIp(request: Request): string {
  if (typeof process === 'undefined') {
    const cf = request.headers.get('cf-connecting-ip')?.trim()
    if (cf) return cf
    const parts = splitHeader(request.headers.get('x-forwarded-for'))
    if (parts.length > 0) return parts[parts.length - 1]
    return 'unknown'
  }
  const real = request.headers.get('x-real-ip')?.trim()
  if (real) return real
  const parts = splitHeader(request.headers.get('x-forwarded-for'))
  if (parts.length > 0) return parts[0]
  return 'unknown'
}

function splitHeader(value: string | null): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

export interface RateState {
  /** 窗口内失败次数 */
  n: number
  /** 失败计数窗口截止时间戳 */
  reset_at: number
  /** 锁定截止时间戳，0 表示未锁定 */
  lock_until: number
}

/** 进程内第一权威层：同隔离室不受 KV 最终一致影响，同时减少远端存储读写 */
const memory = new Map<string, RateState>()
let lastSweepAt = 0

function isExpired(state: RateState): boolean {
  const now = Date.now()
  return state.reset_at <= now && state.lock_until <= now
}

function parseState(raw: string | null): RateState | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<RateState>
    if (
      typeof parsed.n === 'number' &&
      typeof parsed.reset_at === 'number' &&
      typeof parsed.lock_until === 'number'
    ) {
      return { n: parsed.n, reset_at: parsed.reset_at, lock_until: parsed.lock_until }
    }
  } catch {
    // 解析失败视为无状态
  }
  return null
}

function toStore(state: RateState): string {
  return JSON.stringify(state)
}

/** 读取状态：内存优先；未命中读存储（含旧键懒迁移）。任何存储异常 fail-open，由内存层兜底 */
async function loadState(ip: string, env?: PlatformEnv): Promise<RateState | null> {
  const cached = memory.get(ip)
  if (cached) {
    if (!isExpired(cached)) return cached
    memory.delete(ip)
  }

  let store: DataStore
  try {
    store = getStore(env)
  } catch {
    return null
  }

  try {
    const raw = await store.getSetting(STATE_PREFIX + ip)
    const state = parseState(raw)
    if (state) {
      if (!isExpired(state)) {
        memory.set(ip, state)
        return state
      }
      await store.deleteSetting(STATE_PREFIX + ip)
    }

    // 旧键（login_fails: / login_lock:）懒迁移
    const legacyFails = await store.getSetting(LEGACY_FAILS_PREFIX + ip)
    const legacyLock = await store.getSetting(LEGACY_LOCK_PREFIX + ip)
    const migrated = mergeLegacy(legacyFails, legacyLock)
    if (legacyFails !== null) await store.deleteSetting(LEGACY_FAILS_PREFIX + ip)
    if (legacyLock !== null) await store.deleteSetting(LEGACY_LOCK_PREFIX + ip)
    if (migrated && !isExpired(migrated)) {
      await store.setSetting(STATE_PREFIX + ip, toStore(migrated))
      memory.set(ip, migrated)
      return migrated
    }
    return null
  } catch {
    return null
  }
}

function mergeLegacy(failsRaw: string | null, lockRaw: string | null): RateState | null {
  const now = Date.now()
  const state: RateState = { n: 0, reset_at: now, lock_until: 0 }

  if (failsRaw) {
    try {
      const parsed = JSON.parse(failsRaw) as { n?: unknown; reset_at?: unknown }
      if (typeof parsed.n === 'number' && typeof parsed.reset_at === 'number') {
        state.n = parsed.n
        state.reset_at = parsed.reset_at
      }
    } catch {
      // 旧计数值损坏则丢弃
    }
  }

  if (lockRaw) {
    const unlockAt = Number(lockRaw)
    if (Number.isFinite(unlockAt)) state.lock_until = unlockAt
  }

  return state.n > 0 || state.lock_until > now ? state : null
}

/** 写入：更新内存并尽力同步存储（存储故障不影响限流本身） */
async function saveState(ip: string, state: RateState, env?: PlatformEnv): Promise<void> {
  if (isExpired(state)) {
    memory.delete(ip)
  } else {
    memory.set(ip, state)
    if (memory.size > MAX_MEM_ENTRIES) evictMemory()
  }
  try {
    await getStore(env).setSetting(STATE_PREFIX + ip, toStore(state))
  } catch {
    // best-effort
  }
}

async function dropState(ip: string, env?: PlatformEnv): Promise<void> {
  memory.delete(ip)
  try {
    const store = getStore(env)
    await store.deleteSetting(STATE_PREFIX + ip)
    await store.deleteSetting(LEGACY_FAILS_PREFIX + ip)
    await store.deleteSetting(LEGACY_LOCK_PREFIX + ip)
  } catch {
    // best-effort
  }
}

function evictMemory(): void {
  const overflow = memory.size - MAX_MEM_ENTRIES
  let removed = 0
  for (const key of memory.keys()) {
    if (removed >= overflow) break
    memory.delete(key)
    removed++
  }
}

/**
 * 清理过期的内存状态与存储键（含旧命名残留），
 * 每隔离室最多每 SWEEP_INTERVAL_MS 触发一次，键空间有界。
 */
export async function sweepExpired(env?: PlatformEnv): Promise<void> {
  const now = Date.now()
  if (now - lastSweepAt < SWEEP_INTERVAL_MS) return
  lastSweepAt = now

  for (const [ip, state] of memory) {
    if (isExpired(state)) memory.delete(ip)
  }
  if (memory.size > MAX_MEM_ENTRIES) evictMemory()

  let store: DataStore
  try {
    store = getStore(env)
  } catch {
    return
  }

  try {
    const keys = await store.listSettings('login_')
    for (const key of keys) {
      const raw = await store.getSetting(key)
      if (!raw) {
        await store.deleteSetting(key)
        continue
      }
      if (key.startsWith(STATE_PREFIX)) {
        const state = parseState(raw)
        if (!state || isExpired(state)) await store.deleteSetting(key)
      } else if (key.startsWith(LEGACY_LOCK_PREFIX)) {
        if (!(Number(raw) > now)) await store.deleteSetting(key)
      } else if (key.startsWith(LEGACY_FAILS_PREFIX)) {
        const legacy = parseLegacyFails(raw)
        if (!legacy || legacy.reset_at <= now) await store.deleteSetting(key)
      } else {
        // 未知的 login_* 键一律清掉，防止历史残留无限累积
        await store.deleteSetting(key)
      }
    }
  } catch {
    // best-effort
  }
}

function parseLegacyFails(raw: string): { reset_at: number } | null {
  try {
    const parsed = JSON.parse(raw) as { reset_at?: unknown }
    return typeof parsed.reset_at === 'number' ? { reset_at: parsed.reset_at } : null
  } catch {
    return null
  }
}

/** 触发一次清理（受频率限制），不阻塞请求路径 */
function scheduleSweep(env?: PlatformEnv): void {
  void sweepExpired(env).catch(() => undefined)
}

/** 锁定中返回剩余分钟数（至少 1），未锁定返回 null；锁过期时顺手清掉状态 */
export async function checkLocked(ip: string, env?: PlatformEnv): Promise<number | null> {
  const state = await loadState(ip, env)
  if (!state || state.lock_until <= 0) return null
  const remaining = state.lock_until - Date.now()
  if (remaining <= 0) {
    await dropState(ip, env)
    return null
  }
  return Math.max(1, Math.ceil(remaining / 60000))
}

/**
 * 记录一次失败；达到 maxFails 时写入锁定并重置计数，返回 true。
 * 计数带 15 分钟窗口：读到过期状态则从零开始。
 */
export async function recordFail(
  ip: string,
  limits: LoginLimits,
  env?: PlatformEnv,
): Promise<boolean> {
  scheduleSweep(env)
  const now = Date.now()
  const state = (await loadState(ip, env)) ?? { n: 0, reset_at: now + FAIL_WINDOW_MS, lock_until: 0 }

  if (state.reset_at <= now) {
    state.n = 0
    state.reset_at = now + FAIL_WINDOW_MS
  }

  state.n += 1
  if (state.n >= limits.maxFails) {
    state.lock_until = now + limits.lockMinutes * 60000
    state.n = 0
  }
  await saveState(ip, state, env)
  return state.lock_until > now
}

/** 登录成功或需要重置时清空该 IP 的失败计数与锁定 */
export async function clearFails(ip: string, env?: PlatformEnv): Promise<void> {
  await dropState(ip, env)
}
