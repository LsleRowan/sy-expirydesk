import type { IncomingMessage, ServerResponse } from 'node:http'

export async function readRequestBuffer(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string))
  }
  return Buffer.concat(chunks)
}

/** Node IncomingMessage → 标准 Web Request（Vercel / 本地 dev 使用） */
export async function nodeToRequest(req: IncomingMessage, origin: string): Promise<Request> {
  const url = new URL(req.url || '/', origin)
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue
    if (Array.isArray(value)) value.forEach((item) => headers.append(key, item))
    else headers.set(key, value)
  }

  const method = (req.method || 'GET').toUpperCase()
  const init: RequestInit = { method, headers }
  if (method !== 'GET' && method !== 'HEAD') {
    init.body = new Uint8Array(await readRequestBuffer(req))
  }
  return new Request(url, init)
}

/** 标准 Web Response → Node ServerResponse */
export async function sendResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status
  const setCookies = response.headers.getSetCookie()
  if (setCookies.length > 0) res.setHeader('set-cookie', setCookies)
  response.headers.forEach((value, key) => {
    if (key === 'content-encoding' || key === 'content-length' || key === 'transfer-encoding') return
    if (key === 'set-cookie') return
    res.setHeader(key, value)
  })
  const buffer = Buffer.from(await response.arrayBuffer())
  res.end(buffer)
}
