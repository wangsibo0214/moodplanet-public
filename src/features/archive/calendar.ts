import { localDayKey } from '@/utils/date'

/**
 * 月历网格的纯逻辑：周一开头，补足整周，跨月的日子标 inMonth=false。
 * 组件只负责把格子画出来与响应点击。
 */

export interface CalendarDay {
  dayKey: string
  /** 当月内的日号；跨月补位也带真实日号，但 inMonth 为 false */
  dayNumber: number
  inMonth: boolean
}

export const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const

export function monthWeeks(year: number, month: number): CalendarDay[][] {
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const lead = (first.getDay() + 6) % 7
  const cells = Math.ceil((lead + daysInMonth) / 7) * 7

  const weeks: CalendarDay[][] = []
  let week: CalendarDay[] = []
  for (let index = 0; index < cells; index += 1) {
    const date = new Date(year, month, index - lead + 1)
    week.push({
      dayKey: localDayKey(date),
      dayNumber: date.getDate(),
      inMonth: date.getMonth() === month,
    })
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }
  return weeks
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const date = new Date(year, month + delta, 1)
  return { year: date.getFullYear(), month: date.getMonth() }
}

/** 「2026 年 11 月」 */
export function monthLabel(year: number, month: number): string {
  return `${year} 年 ${month + 1} 月`
}
