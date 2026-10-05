import type { PlatformEnv } from './db.js'

/**
 * 统一的环境变量读取：
 * - Cloudflare Pages Functions 注入 `context.env`（不含 process.env）
 * - Vercel / 本地 Node 走 process.env
 * 优先取平台注入的 env，缺失时回退 process.env（不存在 process 时安全返回 undefined）。
 */
export function readEnv(key: string, env?: PlatformEnv): string | undefined {
  const fromPlatform = env?.[key]
  if (typeof fromPlatform === 'string') return fromPlatform
  if (typeof process === 'undefined') return undefined
  return process.env[key]
}
