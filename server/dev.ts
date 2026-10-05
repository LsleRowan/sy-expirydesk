import { loadEnv, type Plugin } from 'vite'
import { nodeToRequest, sendResponse } from './compat.js'
import { handle } from './handler.js'

/** 本地开发：把 /api/* 挂到 Vite 中间件上，复用同一份 server/handler.ts */
export function serverDevMiddleware(): Plugin {
  return {
    name: 'expirydesk-api-dev',
    configureServer(server) {
      process.env.EXPIRYDESK_DEV = '1'

      // Vite 只把 VITE_ 前缀的 .env 变量交给前端，这里显式加载到 process.env 供服务端使用
      const env = loadEnv(server.config.mode, server.config.envDir, [''])
      for (const [key, value] of Object.entries(env)) {
        if (!(key in process.env)) process.env[key] = value
      }

      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? ''
        if (url !== '/api' && !url.startsWith('/api/')) return next()
        try {
          const origin = `http://${req.headers.host ?? 'localhost'}`
          // 本地没有平台注入的可信 IP 头：按 socket 地址注入，避免所有本地请求落进同一个限流桶
          if (!req.headers['x-real-ip']) {
            req.headers['x-real-ip'] = req.socket.remoteAddress ?? 'local'
          }
          const request = await nodeToRequest(req, origin)
          const response = await handle(request)
          await sendResponse(res, response)
        } catch (error) {
          console.error('[dev-api]', error)
          const message =
            process.env.EXPIRYDESK_DEV === '1' && error instanceof Error
              ? error.message
              : '服务器内部错误'
          res.statusCode = 500
          res.setHeader('content-type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ ok: false, error: message }))
        }
      })
    },
  }
}
