import { addDays, todayISO } from '../shared/date.js'
import type { ServiceInput, ServiceRecord } from '../shared/types.js'
import { readEnv } from './env.js'

export class StoreError extends Error {
  /** true：可安全返回给客户端的业务信息；false：基础设施/内部错误，只记日志不外泄 */
  readonly expose: boolean

  constructor(message: string, expose = true) {
    super(message)
    this.name = 'StoreError'
    this.expose = expose
  }
}

export interface DataStore {
  list(): Promise<ServiceRecord[]>
  get(id: number): Promise<ServiceRecord | null>
  create(input: ServiceInput): Promise<ServiceRecord>
  update(id: number, input: ServiceInput): Promise<ServiceRecord>
  setExpiry(id: number, expiresAt: string): Promise<ServiceRecord>
  remove(id: number): Promise<void>
  getSetting(key: string): Promise<string | null>
  setSetting(key: string, value: string): Promise<void>
  /** 删除设置键（真删除，避免写空串导致键空间无限残留） */
  deleteSetting(key: string): Promise<void>
  /** 列出以 prefix 开头的设置键（返回不含存储前缀的逻辑键名） */
  listSettings(prefix: string): Promise<string[]>
}

/** Cloudflare KV 的最小结构接口（与 Pages 绑定结构兼容，不依赖 workers-types） */
interface KvListResult {
  keys: Array<{ name: string }>
  list_complete: boolean
  cursor?: string
}

interface KvLike {
  list(options: { prefix?: string; cursor?: string; limit?: number }): Promise<KvListResult>
  get(key: string): Promise<string | null>
  put(key: string, value: string): Promise<void>
  delete(key: string): Promise<void>
}

/** 平台运行时注入（Cloudflare Pages 的 context.env 等） */
export interface PlatformEnv {
  KV?: unknown
  [key: string]: unknown
}

function isKvLike(value: unknown): value is KvLike {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.list === 'function' &&
    typeof v.get === 'function' &&
    typeof v.put === 'function' &&
    typeof v.delete === 'function'
  )
}

class KvStore implements DataStore {
  constructor(private kv: KvLike) {}

  private async listKeys(prefix: string): Promise<string[]> {
    const names: string[] = []
    let cursor: string | undefined
    for (;;) {
      const res: KvListResult = cursor
        ? await this.kv.list({ prefix, cursor, limit: 1000 })
        : await this.kv.list({ prefix, limit: 1000 })
      names.push(...res.keys.map((key) => key.name))
      if (res.list_complete || !res.cursor) break
      cursor = res.cursor
    }
    return names
  }

  private async readRecord(name: string): Promise<ServiceRecord | null> {
    const raw = await this.kv.get(name)
    if (!raw) return null
    try {
      return JSON.parse(raw) as ServiceRecord
    } catch {
      return null
    }
  }

  async list(): Promise<ServiceRecord[]> {
    const names = await this.listKeys('svc:')
    const rows = await Promise.all(names.map((name) => this.readRecord(name)))
    return rows
      .filter((row): row is ServiceRecord => row !== null)
      .sort((a, b) => a.expires_at.localeCompare(b.expires_at))
  }

  async get(id: number): Promise<ServiceRecord | null> {
    return this.readRecord(`svc:${id}`)
  }

  async create(input: ServiceInput): Promise<ServiceRecord> {
    const now = new Date().toISOString()
    const counter = await this.kv.get('next_id')
    let id: number
    if (counter !== null && /^\d+$/.test(counter)) {
      id = Number(counter)
    } else {
      const names = await this.listKeys('svc:')
      id = names.reduce((max, name) => Math.max(max, Number(name.slice(4)) || 0), 0) + 1
    }
    // 并发创建时 next_id 可能撞号：写前确认键不存在，冲突则顺延重试
    let attempts = 0
    while ((await this.kv.get(`svc:${id}`)) !== null) {
      if (++attempts > 20) throw new StoreError('创建服务失败：ID 分配冲突，请重试')
      id++
    }
    const row: ServiceRecord = { id, ...input, created_at: now, updated_at: now }
    await this.kv.put(`svc:${id}`, JSON.stringify(row))
    await this.kv.put('next_id', String(id + 1))
    return row
  }

  async update(id: number, input: ServiceInput): Promise<ServiceRecord> {
    const row = await this.get(id)
    if (!row) throw new StoreError('服务不存在')
    Object.assign(row, input, { updated_at: new Date().toISOString() })
    await this.kv.put(`svc:${id}`, JSON.stringify(row))
    return row
  }

  async setExpiry(id: number, expiresAt: string): Promise<ServiceRecord> {
    const row = await this.get(id)
    if (!row) throw new StoreError('服务不存在')
    row.expires_at = expiresAt
    row.updated_at = new Date().toISOString()
    await this.kv.put(`svc:${id}`, JSON.stringify(row))
    return row
  }

  async remove(id: number): Promise<void> {
    await this.kv.delete(`svc:${id}`)
  }

  async getSetting(key: string): Promise<string | null> {
    return this.kv.get(`set:${key}`)
  }

  async setSetting(key: string, value: string): Promise<void> {
    await this.kv.put(`set:${key}`, value)
  }

  async deleteSetting(key: string): Promise<void> {
    await this.kv.delete(`set:${key}`)
  }

  async listSettings(prefix: string): Promise<string[]> {
    const names = await this.listKeys(`set:${prefix}`)
    return names.map((name) => name.slice(4))
  }
}

/** Upstash REST 客户端，实现 KvLike（原生 fetch，零依赖），复用 KvStore 的键模型 */
class UpstashClient implements KvLike {
  constructor(private url: string, private token: string) {}

  private async cmd(args: Array<string | number>): Promise<unknown> {
    let res: Response
    try {
      res = await fetch(this.url, {
        method: 'POST',
        headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' },
        body: JSON.stringify(args),
      })
    } catch (err) {
      throw new StoreError(`Upstash 请求失败：${err instanceof Error ? err.message : String(err)}`, false)
    }
    if (!res.ok) throw new StoreError(`Upstash 请求失败（HTTP ${res.status}）`, false)
    const payload = (await res.json()) as { result?: unknown; error?: string }
    if (payload.error) throw new StoreError(`Upstash 错误：${payload.error}`, false)
    return payload.result
  }

  async get(key: string): Promise<string | null> {
    const value = await this.cmd(['GET', key])
    return typeof value === 'string' ? value : null
  }

  async put(key: string, value: string): Promise<void> {
    await this.cmd(['SET', key, value])
  }

  async delete(key: string): Promise<void> {
    await this.cmd(['DEL', key])
  }

  async list(options: { prefix?: string; cursor?: string; limit?: number }): Promise<KvListResult> {
    const [next, keys] = (await this.cmd([
      'SCAN',
      options.cursor ?? '0',
      'MATCH',
      `${options.prefix ?? ''}*`,
      'COUNT',
      1000,
    ])) as [string, string[]]
    const listComplete = next === '0'
    return {
      keys: (keys ?? []).map((name) => ({ name })),
      list_complete: listComplete,
      ...(listComplete ? {} : { cursor: next }),
    }
  }
}

function upstashCredentials(env?: PlatformEnv): { url: string; token: string } | null {
  const url = readEnv('UPSTASH_REDIS_REST_URL', env) || readEnv('KV_REST_API_URL', env)
  const token = readEnv('UPSTASH_REDIS_REST_TOKEN', env) || readEnv('KV_REST_API_TOKEN', env)
  return url && token ? { url, token } : null
}

function buildSeed(): ServiceRecord[] {
  const now = new Date().toISOString()
  const base = todayISO()
  const seeds: Array<[string, string, string, number, string, number]> = [
    ['Cloudflare', 'DNS', 'https://dash.cloudflare.com/', 700, '域名解析与 CDN', 30],
    ['example.com', '域名', 'https://www.godaddy.com/', 400, '', 30],
    ['VPS 服务器', 'VPS', 'https://my.example-vps.com/billing', 16, '主力节点', 30],
    ['GitHub Pro', '订阅', 'https://github.com/settings/billing', 120, '', 30],
    ['API 服务', 'API', 'https://console.example-api.com/billing', 57, '', 30],
    ['虚拟主机', '虚拟主机', 'https://cp.example-host.com/', 6, '', 7],
    ['某平台会员', '订阅', 'https://example.com/membership', 22, '', 30],
    ['旧服务', '其他', 'https://example.org/renew', -40, '已过期示例', 30],
  ]
  return seeds.map(([name, type, renew_url, offset, note, remind_days], index) => ({
    id: index + 1,
    name,
    type,
    renew_url,
    expires_at: addDays(base, offset),
    remind_days,
    note,
    created_at: now,
    updated_at: now,
  }))
}

class MemoryStore implements DataStore {
  private rows: ServiceRecord[] = []
  private nextId = 100
  private settings = new Map<string, string>()

  constructor() {
    this.rows = buildSeed()
  }

  async list(): Promise<ServiceRecord[]> {
    return [...this.rows].sort((a, b) => a.expires_at.localeCompare(b.expires_at))
  }

  async get(id: number): Promise<ServiceRecord | null> {
    return this.rows.find((row) => row.id === id) ?? null
  }

  async create(input: ServiceInput): Promise<ServiceRecord> {
    const now = new Date().toISOString()
    const row: ServiceRecord = { id: this.nextId++, ...input, created_at: now, updated_at: now }
    this.rows.push(row)
    return row
  }

  async update(id: number, input: ServiceInput): Promise<ServiceRecord> {
    const row = await this.get(id)
    if (!row) throw new StoreError('服务不存在')
    Object.assign(row, input, { updated_at: new Date().toISOString() })
    return row
  }

  async setExpiry(id: number, expiresAt: string): Promise<ServiceRecord> {
    const row = await this.get(id)
    if (!row) throw new StoreError('服务不存在')
    row.expires_at = expiresAt
    row.updated_at = new Date().toISOString()
    return row
  }

  async remove(id: number): Promise<void> {
    const index = this.rows.findIndex((row) => row.id === id)
    if (index === -1) throw new StoreError('服务不存在')
    this.rows.splice(index, 1)
  }

  async getSetting(key: string): Promise<string | null> {
    return this.settings.get(key) ?? null
  }

  async setSetting(key: string, value: string): Promise<void> {
    this.settings.set(key, value)
  }

  async deleteSetting(key: string): Promise<void> {
    this.settings.delete(key)
  }

  async listSettings(prefix: string): Promise<string[]> {
    return [...this.settings.keys()].filter((key) => key.startsWith(prefix))
  }
}

let store: DataStore | null = null

export function getStore(env?: PlatformEnv): DataStore {
  if (store) return store
  const mode = readEnv('STORE', env)
  const kv = isKvLike(env?.KV) ? (env?.KV as KvLike) : null
  const upstash = upstashCredentials(env)

  if (mode === 'memory') {
    store = new MemoryStore()
  } else if (mode === 'kv') {
    if (!kv) throw new StoreError('STORE=kv 但当前平台没有 KV 绑定（绑定名需为 KV）')
    store = new KvStore(kv)
  } else if (mode === 'upstash') {
    if (!upstash) {
      throw new StoreError(
        'STORE=upstash 但缺少 UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN（或 KV_REST_API_URL / KV_REST_API_TOKEN）',
      )
    }
    store = new KvStore(new UpstashClient(upstash.url, upstash.token))
  } else if (kv) {
    store = new KvStore(kv)
  } else if (upstash) {
    store = new KvStore(new UpstashClient(upstash.url, upstash.token))
  } else if (readEnv('EXPIRYDESK_DEV', env) === '1') {
    console.warn(
      '[expirydesk] 未检测到 KV 绑定或 Upstash 环境变量，本地开发使用内存演示数据（设置 STORE=memory 可关闭该提示）',
    )
    store = new MemoryStore()
  } else {
    throw new StoreError(
      '缺少存储配置：KV 绑定，或 UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN（也可用 KV_REST_API_URL / KV_REST_API_TOKEN）',
    )
  }
  return store
}
