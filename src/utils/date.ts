const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const

/** 解析 ISO 时间戳；无效时返回 null，调用方自己决定怎么显示。 */
export function toDate(value: string): Date | null {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** 「11 月 7 日 21:04 · 周五」 */
export function formatRecordTime(value: string): string {
  const date = toDate(value)
  if (!date) return '时间未知'
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日 ${hours}:${minutes} · ${WEEKDAYS[date.getDay()]}`
}

/** 「2026 年 11 月 14 日 · 周六」 */
export function formatFullDate(value: string): string {
  const date = toDate(value)
  if (!date) return '时间未知'
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日 · ${WEEKDAYS[date.getDay()]}`
}

/** 本地日历日键「2026-11-07」。统计与日历都按本地日聚合，不用 UTC。 */
export function localDayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** 反解 localDayKey；无效返回 null。 */
export function parseDayKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

/** 「周五」 */
export function weekdayLabel(date: Date): string {
  return WEEKDAYS[date.getDay()]
}

/** 「21:04」 */
export function formatClockTime(value: string): string {
  const date = toDate(value)
  if (!date) return '时间未知'
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/** 「11/7」，图表横轴这类窄位置用 */
export function formatShortDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`
}
