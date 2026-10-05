import { diffDays } from './date.js'

export type Status = 'expired' | 'critical' | 'soon' | 'normal'

export const STATUS_META: Record<Status, { label: string; className: string; dot: string }> = {
  expired: { label: '已过期', className: 'status-expired', dot: '#c0393f' },
  critical: { label: '临近到期', className: 'status-critical', dot: '#e5484d' },
  soon: { label: '即将到期', className: 'status-soon', dot: '#f59e0b' },
  normal: { label: '正常', className: 'status-normal', dot: '#22a55b' },
}

export function remainingDays(expiresAt: string, today: string): number {
  return diffDays(today, expiresAt)
}

export function deriveStatus(remaining: number, remindDays: number): Status {
  if (remaining < 0) return 'expired'
  if (remaining <= 7) return 'critical'
  if (remaining <= remindDays) return 'soon'
  return 'normal'
}

/** 「即将到期」口径与徽章一致：soon（≤提醒天数）+ critical（≤7 天） */
export function isSoonStatus(status: Status): boolean {
  return status === 'soon' || status === 'critical'
}

export interface StatsSummary {
  total: number
  soon: number
  within30: number
  expired: number
}

export function computeStats(
  rows: Array<{ expires_at: string; remind_days: number }>,
  today: string,
): StatsSummary {
  const stats: StatsSummary = { total: rows.length, soon: 0, within30: 0, expired: 0 }
  for (const row of rows) {
    const remaining = remainingDays(row.expires_at, today)
    if (remaining < 0) {
      stats.expired++
      continue
    }
    if (isSoonStatus(deriveStatus(remaining, row.remind_days))) stats.soon++
    if (remaining <= 30) stats.within30++
  }
  return stats
}
