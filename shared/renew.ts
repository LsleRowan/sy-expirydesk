import { addDuration, type DateUnit } from './date.js'

export type RenewUnit = DateUnit

export const RENEW_UNITS: Array<{ value: RenewUnit; label: string }> = [
  { value: 'day', label: '日' },
  { value: 'month', label: '月' },
  { value: 'year', label: '年' },
]

export function isValidRenewAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 120
}

/**
 * 未过期：从当前 expires_at 续接，保留剩余有效期。
 * 已过期：从今天开始重新计算。
 */
export function computeRenewDate(
  currentExpiresAt: string,
  amount: number,
  unit: RenewUnit,
  today: string,
): string {
  const base = currentExpiresAt > today ? currentExpiresAt : today
  return addDuration(base, amount, unit)
}
