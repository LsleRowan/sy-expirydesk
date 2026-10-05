export type DateUnit = 'day' | 'month' | 'year'

const DAY_MS = 86400000

export function parseISO(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`)
}

export function formatISO(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function isValidISO(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = parseISO(value)
  return !Number.isNaN(date.getTime()) && formatISO(date) === value
}

export function todayISO(timeZone = 'Asia/Shanghai'): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
  } catch {
    return formatISO(new Date())
  }
}

export function addDays(iso: string, amount: number): string {
  return formatISO(new Date(parseISO(iso).getTime() + amount * DAY_MS))
}

export function addMonths(iso: string, amount: number): string {
  const base = parseISO(iso)
  const targetMonth = base.getUTCMonth() + amount
  const targetYear = base.getUTCFullYear() + Math.floor(targetMonth / 12)
  const normalizedMonth = ((targetMonth % 12) + 12) % 12
  const lastDay = daysInMonth(targetYear, normalizedMonth)
  const day = Math.min(base.getUTCDate(), lastDay)
  return formatISO(new Date(Date.UTC(targetYear, normalizedMonth, day)))
}

export function addYears(iso: string, amount: number): string {
  return addMonths(iso, amount * 12)
}

export function addDuration(iso: string, amount: number, unit: DateUnit): string {
  if (unit === 'day') return addDays(iso, amount)
  if (unit === 'month') return addMonths(iso, amount)
  return addYears(iso, amount)
}

export function diffDays(from: string, to: string): number {
  return Math.round((parseISO(to).getTime() - parseISO(from).getTime()) / DAY_MS)
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
}

export function weekdayCN(iso: string): string {
  const names = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return names[parseISO(iso).getUTCDay()]
}

export interface MonthCell {
  iso: string
  day: number
  inMonth: boolean
}

export function buildMonthGrid(year: number, month: number): MonthCell[] {
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay()
  const mondayOffset = (firstWeekday + 6) % 7
  const totalDays = daysInMonth(year, month)
  const cells: MonthCell[] = []

  const prevDays = daysInMonth(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1)
  for (let i = mondayOffset - 1; i >= 0; i--) {
    const day = prevDays - i
    const d = new Date(Date.UTC(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1, day))
    cells.push({ iso: formatISO(d), day, inMonth: false })
  }
  for (let day = 1; day <= totalDays; day++) {
    cells.push({ iso: formatISO(new Date(Date.UTC(year, month, day))), day, inMonth: true })
  }
  let nextDay = 1
  while (cells.length % 7 !== 0) {
    cells.push({ iso: formatISO(new Date(Date.UTC(year, month + 1, nextDay))), day: nextDay, inMonth: false })
    nextDay++
  }
  return cells
}

export function monthLabel(year: number, month: number): string {
  return `${year} 年 ${month + 1} 月`
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const target = new Date(Date.UTC(year, month + delta, 1))
  return { year: target.getUTCFullYear(), month: target.getUTCMonth() }
}
