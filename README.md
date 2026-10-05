# ExpiryDesk

个人服务续期 / 到期管理台。记录你的各类服务（域名、VPS、订阅、API 等），跟踪到期时间，在到期前一键续费并跳转到官方续费页面。数据保存在你自己的数据库中。

v1.0.0 · 个人项目

## 特性

- **服务管理**：增删改查、关键字搜索、按到期时间排序、按状态筛选（即将到期 / 30 天内 / 已过期）
- **到期状态四档**：
  - 已过期（剩余 < 0 天）
  - 临近到期（剩余 ≤ 7 天，红色）
  - 即将到期（剩余 ≤ 该服务的提醒天数，黄色）
  - 正常（绿色）
- **一键续费**：选择数量与单位（天 / 月 / 年），自动计算并顺延到期日
- **仪表盘**：总数 / 即将到期 / 30 天内 / 已过期统计卡片，日历面板与提醒面板
- **单密码登录（必须）**：依赖 `AUTH_PASSWORD`，未配置则全站锁定；token 存 `auth-token` HttpOnly cookie，默认 7 天，可在设置页修改
- **登录限流**：同一 IP 连续失败 5 次锁定 30 分钟（per-IP，失败次数与锁定时长可在设置页修改，计数窗口 15 分钟；内存 + 存储双层计数，过期键自动清理）
- **设置页**：亮 / 暗主题（点击即刻生效）、默认提醒天数、登录有效期与登录限流（服务端保存），统一保存按钮
- **响应式布局**：桌面侧栏 + 移动端抽屉

## 技术栈

Vue 3 · Vite 7 · Tailwind CSS 4 · vue-router 4 · TypeScript 5.9 · Upstash Redis（REST） · lucide 图标

## 快速开始

```bash
npm install

# 配置环境变量（二选一）
cp .env.example .env
#   方式 A（正式使用）：创建 Upstash Redis 数据库（upstash.com 或 Vercel Marketplace 一键），
#     填 UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN（或 Marketplace 注入的 KV_REST_API_*）
#   方式 B（本地演示）：.env 中设置 STORE=memory（内存示例数据，重启还原）

npm run dev
```

访问 `http://localhost:5173`。本地 `.env` 会被开发服务器自动加载。

## 环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Vercel/自建必填 | Upstash Redis 连接凭据（二选一：这对，或 Vercel Marketplace 注入的 `KV_REST_API_URL` + `KV_REST_API_TOKEN`）；Cloudflare Pages 改用 KV 绑定，无需此项 |
| `AUTH_PASSWORD` | **必填** | 登录密码；**未配置时全站锁定**：除 `/api/health`、`/api/auth/status`、`/api/login`、`/api/logout` 外全部 503，登录页显示未配置提示 |
| `AUTH_SECRET` | 可选 | HMAC 签名密钥（不设置则由 `AUTH_PASSWORD` 派生） |
| `STORE` | 可选 | `memory` = 内存演示数据；`kv` = 强制 KV 绑定（缺失则报错）；`upstash` = 强制 Upstash（缺失则报错）。默认自动选择：平台注入了 `KV` 绑定 → KV，否则 Upstash 环境变量 → Upstash |

## 登录与安全

- **登录必须**：`POST /api/login` 校验 `AUTH_PASSWORD`，签发 HMAC-SHA256 签名 token，通过 `Set-Cookie` 写入 `auth-token`（`HttpOnly; SameSite=Lax`，https 下附加 `Secure`），前端不接触 token 内容
- **未配置密码即锁定**：除公开端点外所有接口返回 503，登录页显示「服务端未配置登录密码（AUTH_PASSWORD）」且无法提交
- **IP 取值平台感知**：Cloudflare 运行时只信 `cf-connecting-ip`（平台覆写、不可伪造），Node 运行时（Vercel/本地）取 `x-real-ip` / `x-forwarded-for` 首段（Vercel 整体覆写该头），防止伪造请求头绕过限流或锁死他人
- **限流双层存储**：进程内存优先（同实例不受 KV 最终一致影响、省远端命令），并写穿到 KV/Redis 跨实例兜底；失败计数与锁定合并为单键，过期状态与历史残留键由内置清理器定期删除，键空间有界；限流自身的存储异常只降级为内存限流，不影响登录接口
- **错误不外泄**：内部/基础设施错误只写服务端日志，客户端统一收到「服务器内部错误」；业务提示（如「服务不存在」）正常透出
- **安全响应头**：`HSTS` / `CSP` / `Permissions-Policy` 配在 `vercel.json` 与 `public/_headers`（静态层），`nosniff` / `X-Frame-Options` / `Referrer-Policy` / `Permissions-Policy` 由服务端在所有 API 响应上兜底（Cloudflare 的 `_headers` 不作用于 Functions 响应）；主题初始化脚本外联为 `/theme-init.js`，因此 CSP 可用严格的 `script-src 'self'`
- 服务端鉴权读取 cookie（同时兼容 `Authorization: Bearer`，便于 curl 调试）
- **登录有效期**存存储键 `set:token_days`（KV / Redis 键值，无建表无 SQL），在设置页修改（1-3650 天，默认 7 天），下次登录生效
- 退出登录通过 `POST /api/logout` 清除 cookie
- 公开接口：`/api/health`、`/api/auth/status`、`/api/login`、`/api/logout`
- **同源调用**：前端与 API 同域部署，服务端不返回 CORS 跨域响应头

## 部署

三种部署形态共用同一份服务端核心（`server/handler.ts` → `server/routes.ts`），存储自动选择：**平台注入 `KV` 绑定 → Cloudflare KV，否则 Upstash 环境变量 → Upstash Redis，本地兜底内存**。

| 平台 | 存储 | API 入口 |
|---|---|---|
| Cloudflare Pages | **Workers KV** | `functions/api/[[path]].ts` |
| Vercel | **Upstash Redis** | `api/index.ts`（`vercel.json` 将全部 `/api/*` rewrite 转发至此，含 SPA 回退） |
| 本地开发 | 内存 / Upstash | `server/dev.ts`（Vite 中间件挂载 `/api/*`） |

### Cloudflare Pages（KV）

1. 创建 KV Namespace：Dashboard → Workers & Pages → KV → Create namespace
2. Pages 项目 → Settings → **Bindings** → Add → KV Namespace，**变量名必须为 `KV`**
3. 环境变量只需 `AUTH_PASSWORD`（**不需要** Upstash 变量）
4. 构建命令 `npm run build`，输出目录 `dist/`，绑定域名后部署

> KV 首次部署为空数据（无示例记录）；KV 为最终一致存储，跨区域访问时新写入的列表刷新可能有秒级延迟。

### Vercel（Upstash Redis）

1. 创建 Upstash 数据库（两种方式任选）：
   - **推荐**：Vercel Dashboard → Marketplace → **Upstash for Redis** → Install → 创建数据库（区域选东京/新加坡，国内访问友好）→ Link 到项目，环境变量 `KV_REST_API_URL` / `KV_REST_API_TOKEN` **自动注入**
   - 或：[upstash.com](https://upstash.com) Console 手动建库，把 `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` 填入 Vercel 环境变量
2. 配置 `AUTH_PASSWORD`（必填）
3. 构建命令 `npm run build`，输出目录 `dist/`，部署——**无建表、无 SQL、无其他依赖**

> 免费额度：50 万条命令/月、256 MB 存储，个人使用绰绰有余；免费库 **30 天无活动会归档**（数据保留备份、可恢复），正常每天打开使用不会触发。

## 项目结构

```
├── src/            # 前端（页面、组件、组合式函数、样式）
├── server/         # 服务端核心（路由、鉴权、数据库、开发中间件）
├── shared/         # 前后端共享逻辑（日期、状态计算、类型定义）
├── api/            # Vercel 无服务器函数（薄壳）
├── functions/      # Cloudflare Pages 路由（薄壳）
└── public/         # 静态资源
```

## 命令

| 命令 | 说明 |
|---|---|
| `npm run dev` | 本地开发（含 `/api/*` 后端） |
| `npm run build` | 类型检查 + 生产构建（输出 `dist/`） |
| `npm run typecheck` | 仅类型检查（`vue-tsc --noEmit`） |
| `npm run preview` | 预览生产构建 |

## 📄 许可证

MIT License
