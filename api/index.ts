import { handle } from '../server/handler.js'

/** Vercel: 所有 /api/* 请求经 vercel.json rewrite 转发至此，内部路由由 server/routes.ts 分发 */

export async function GET(request: Request): Promise<Response> {
  return handle(request)
}

export async function POST(request: Request): Promise<Response> {
  return handle(request)
}

export async function PATCH(request: Request): Promise<Response> {
  return handle(request)
}

export async function DELETE(request: Request): Promise<Response> {
  return handle(request)
}
