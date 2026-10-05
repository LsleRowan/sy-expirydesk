export interface AuthStatus {
  enabled: boolean
  authenticated: boolean
}

let status: AuthStatus | null = null
let statusPromise: Promise<AuthStatus> | null = null

/** 网络故障时的临时结果：不写入缓存，下次调用会重新请求，避免被永久误判为「未配置密码」 */
const FALLBACK_STATUS: AuthStatus = { enabled: true, authenticated: false }

export async function fetchAuthStatus(): Promise<AuthStatus> {
  if (status) return status
  if (!statusPromise) {
    statusPromise = fetch('/api/auth/status')
      .then((res) => res.json())
      .then((payload) => {
        const data = payload?.data
        status = { enabled: !!data?.enabled, authenticated: !!data?.authenticated }
        return status
      })
      .catch(() => FALLBACK_STATUS)
      .finally(() => {
        statusPromise = null
      })
  }
  return statusPromise
}

export function setAuthState(patch: Partial<AuthStatus>): void {
  if (!status) status = { enabled: true, authenticated: false }
  Object.assign(status, patch)
}

interface LoginResponse {
  ok?: boolean
  error?: string
  data?: { authenticated?: boolean }
}

export async function login(password: string): Promise<void> {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  let payload: LoginResponse | null = null
  try {
    payload = (await res.json()) as LoginResponse
  } catch {
    payload = null
  }
  if (!payload?.ok || !payload.data?.authenticated) {
    throw new Error(payload?.error || `登录失败（HTTP ${res.status}）`)
  }
  setAuthState({ enabled: true, authenticated: true })
}

export async function logout(): Promise<void> {
  try {
    await fetch('/api/logout', { method: 'POST' })
  } catch {
    // 忽略网络错误，本地状态仍按未登录处理
  }
  setAuthState({ authenticated: false })
}
