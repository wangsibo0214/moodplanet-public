import { localDayKey, toDate } from '@/utils/date'

/** 列表默认每页条数。四个列表共用，保证「页面过长」被同一把尺子压住。 */
export const PAGE_SIZE = 8

/** 时间快捷档。all 表示不限时间。 */
export type TimeRange = 'all' | 'today' | '7d' | '30d' | 'year'

export const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: 'all', label: '全部时间' },
  { key: 'today', label: '今天' },
  { key: '7d', label: '近 7 天' },
  { key: '30d', label: '近 30 天' },
  { key: 'year', label: '今年' },
]

const DAY_MS = 86_400_000

export interface ListQueryState {
  query: string
  range: TimeRange
  /** 月份键「YYYY-MM」，空串表示不限月份 */
  month: string
}

export const EMPTY_QUERY: ListQueryState = { query: '', range: 'all', month: '' }

export function normalizeQuery(raw: string): string {
  return raw.trim().toLowerCase()
}

/**
 * 关键词匹配：按空白拆词，每个词都要在任一字段里出现（词间 AND）。
 * 空查询恒真，所以「不搜」时列表保持原样。大小写不敏感。
 */
export function matchKeyword(fields: string[], raw: string): boolean {
  const q = normalizeQuery(raw)
  if (!q) return true
  const hay = fields.join('\n').toLowerCase()
  return q.split(/\s+/).every((token) => hay.includes(token))
}

/** 取本地月份键「YYYY-MM」；时间无效返回 null。 */
export function monthKeyOf(iso: string): string | null {
  const date = toDate(iso)
  return date ? localDayKey(date).slice(0, 7) : null
}

export function monthLabel(key: string): string {
  const [year, month] = key.split('-')
  return `${year} 年 ${Number(month)} 月`
}

export function inMonth(iso: string, month: string): boolean {
  if (!month) return true
  return monthKeyOf(iso) === month
}

/** 时间档判定，全部按本地时钟。无效时间在非 all 档下一律排除。 */
export function inTimeRange(iso: string, range: TimeRange, now: Date): boolean {
  if (range === 'all') return true
  const date = toDate(iso)
  if (!date) return false
  const time = date.getTime()
  const anchor = now.getTime()
  switch (range) {
    case 'today':
      return localDayKey(date) === localDayKey(now)
    case '7d':
      return time <= anchor && time >= anchor - 7 * DAY_MS
    case '30d':
      return time <= anchor && time >= anchor - 30 * DAY_MS
    case 'year':
      return date.getFullYear() === now.getFullYear()
  }
}

/** 数据里实际出现的月份，新→旧去重，供月份下拉用。 */
export function collectMonths<T>(items: T[], getTime: (item: T) => string): string[] {
  const seen = new Set<string>()
  for (const item of items) {
    const key = monthKeyOf(getTime(item))
    if (key) seen.add(key)
  }
  return [...seen].sort().reverse()
}

export function filterItems<T>(
  items: T[],
  state: ListQueryState,
  getFields: (item: T) => string[],
  getTime: (item: T) => string,
  now: Date,
): T[] {
  return items.filter((item) => {
    const iso = getTime(item)
    return (
      matchKeyword(getFields(item), state.query) &&
      inTimeRange(iso, state.range, now) &&
      inMonth(iso, state.month)
    )
  })
}

export function isFiltering(state: ListQueryState): boolean {
  return normalizeQuery(state.query) !== '' || state.range !== 'all' || state.month !== ''
}

export function pageCountOf(total: number, size: number): number {
  return Math.max(1, Math.ceil(total / size))
}

export function clampPage(page: number, pageCount: number): number {
  return Math.min(Math.max(1, page), pageCount)
}

export function paginate<T>(items: T[], page: number, size: number): T[] {
  const safe = clampPage(page, pageCountOf(items.length, size))
  const start = (safe - 1) * size
  return items.slice(start, start + size)
}

/**
 * 分页页码序列：始终含首尾页与当前页邻域，跳档处插 'gap'。
 * 总页数 <= 7 时全列，否则窗口化，避免页码把底栏撑长。
 */
export function pageTokens(page: number, pageCount: number): (number | 'gap')[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1)
  }
  const anchors = new Set<number>([1, pageCount, page, page - 1, page + 1])
  if (page <= 3) {
    anchors.add(2)
    anchors.add(3)
    anchors.add(4)
  }
  if (page >= pageCount - 2) {
    anchors.add(pageCount - 1)
    anchors.add(pageCount - 2)
    anchors.add(pageCount - 3)
  }
  const sorted = [...anchors].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b)
  const tokens: (number | 'gap')[] = []
  let prev = 0
  for (const n of sorted) {
    if (prev !== 0 && n - prev > 1) tokens.push('gap')
    tokens.push(n)
    prev = n
  }
  return tokens
}