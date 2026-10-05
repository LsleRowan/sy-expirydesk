import type { PlatformEnv } from './db.js'
import { readEnv } from './env.js'

const enc = new TextEncoder()

const DEFAULT_TOKEN_DAYS = 7

/** 是否已配置登录密码；未配置时服务端锁定（除公开端点外全部 503） */
export function isPasswordConfigured(env?: PlatformEnv): boolean {
  return !!readEnv('AUTH_PASSWORD', env)
}

function base64url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlToString(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
  return bin
}

function tokenTtlMs(): number {
  return DEFAULT_TOKEN_DAYS * 86400000
}

async function hmacKey(env?: PlatformEnv): Promise<CryptoKey> {
  const material =
    readEnv('AUTH_SECRET', env) || `expirydesk:${readEnv('AUTH_PASSWORD', env) ?? ''}`
  return crypto.subtle.importKey('raw', enc.encode(material), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
}

async function hmacSign(message: string, env?: PlatformEnv): Promise<string> {
  const key = await hmacKey(env)
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return base64url(new Uint8Array(sig))
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function verifyPassword(input: string, env?: PlatformEnv): Promise<boolean> {
  const expected = readEnv('AUTH_PASSWORD', env)
  if (!expected) return false
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(input)),
    crypto.subtle.digest('SHA-256', enc.encode(expected)),
  ])
  const bytesA = new Uint8Array(a)
  const bytesB = new Uint8Array(b)
  let diff = 0
  for (let i = 0; i < bytesA.length; i++) diff |= bytesA[i] ^ bytesB[i]
  return diff === 0
}

export async function issueToken(days?: number, env?: PlatformEnv): Promise<string> {
  const ttl = Number.isInteger(days) && days! >= 1 && days! <= 3650 ? days! * 86400000 : tokenTtlMs()
  const payload = base64url(enc.encode(JSON.stringify({ exp: Date.now() + ttl })))
  const sig = await hmacSign(payload, env)
  return `${payload}.${sig}`
}

export function resolveTokenDays(): number {
  return DEFAULT_TOKEN_DAYS
}

async function verifyToken(token: string, env?: PlatformEnv): Promise<boolean> {
  const dot = token.indexOf('.')
  if (dot <= 0 || dot === token.length - 1) return false

  const payload = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = await hmacSign(payload, env)
  if (!constantTimeEqual(sig, expected)) return false

  try {
    const data = JSON.parse(base64urlToString(payload)) as { exp?: number }
    return typeof data.exp === 'number' && data.exp > Date.now()
  } catch {
    return false
  }
}

export const AUTH_COOKIE = 'auth-token'

export function cookieToken(request: Request): string | null {
  const header = request.headers.get('cookie')
  if (!header) return null
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    if (part.slice(0, eq).trim() === AUTH_COOKIE) return part.slice(eq + 1).trim()
  }
  return null
}

export async function verifyAuthToken(request: Request, env?: PlatformEnv): Promise<boolean> {
  let token: string | null = null
  const auth = request.headers.get('authorization')
  const match = auth?.match(/^Bearer\s+(\S+)$/i)
  if (match) {
    token = match[1]
  } else {
    token = cookieToken(request)
  }
  return token ? verifyToken(token, env) : false
}

function secureAttr(request: Request): string {
  return new URL(request.url).protocol === 'https:' ? '; Secure' : ''
}

export function buildAuthCookie(request: Request, token: string, days: number): string[] {
  return [`${AUTH_COOKIE}=${token}; Max-Age=${days * 86400}; Path=/; HttpOnly; SameSite=Lax${secureAttr(request)}`]
}

export function buildClearCookie(request: Request): string[] {
  return [`${AUTH_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secureAttr(request)}`]
}
