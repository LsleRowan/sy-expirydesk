import type { PlatformEnv } from './db.js'
import { handleRequest } from './routes.js'

/**
 * 平台无关的核心入口：只接受标准 Web Request，返回标准 Response。
 * Cloudflare Pages / Vercel / 本地 dev server 都通过薄壳转发到这里。
 * Cloudflare Pages 传入 context.env（KV 绑定），其他平台不传。
 */
export function handle(request: Request, env?: PlatformEnv): Promise<Response> {
  return handleRequest(request, env)
}
