import type { PlatformEnv } from '../../server/db.js'
import { handle } from '../../server/handler.js'

interface PagesContext {
  request: Request
  env: PlatformEnv
}

/** Cloudflare Pages Functions 薄壳（context.env 携带 KV 绑定） */
export async function onRequest(context: PagesContext): Promise<Response> {
  return handle(context.request, context.env)
}
