import { RotateCcw } from 'lucide-react'

import { cn } from '@/utils/cn'
import { monthLabel, TIME_RANGES, type TimeRange } from '@/utils/listQuery'

import { SearchInput } from './SearchInput'
import { Select } from './Select'

interface ListToolbarProps {
  query: string
  onQuery: (value: string) => void
  range: TimeRange
  onRange: (value: TimeRange) => void
  month: string
  onMonth: (value: string) => void
  months: string[]
  matchedCount: number
  total: number
  filtering: boolean
  onReset: () => void
  searchLabel: string
  className?: string
}

const OPTION_CLASS = 'bg-cosmos-950 text-ink-100'

/** 四个列表共用的检索工具条：关键词 + 时间档 + 月份 + 匹配计数 + 一键清空。 */
export function ListToolbar({
  query,
  onQuery,
  range,
  onRange,
  month,
  onMonth,
  months,
  matchedCount,
  total,
  filtering,
  onReset,
  searchLabel,
  className,
}: ListToolbarProps) {
  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      <SearchInput value={query} onChange={onQuery} label={searchLabel} />
      <div className="flex items-center gap-2.5">
        <Select
          label="按时间筛选"
          value={range}
          onChange={(event) => onRange(event.target.value as TimeRange)}
          className="min-w-0 flex-1"
        >
          {TIME_RANGES.map((item) => (
            <option key={item.key} value={item.key} className={OPTION_CLASS}>
              {item.label}
            </option>
          ))}
        </Select>
        <Select
          label="按月份筛选"
          value={month}
          onChange={(event) => onMonth(event.target.value)}
          className="min-w-0 flex-1"
        >
          <option value="" className={OPTION_CLASS}>
            全部月份
          </option>
          {months.map((key) => (
            <option key={key} value={key} className={OPTION_CLASS}>
              {monthLabel(key)}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-ink-700">
        <span aria-live="polite">
          {filtering ? `匹配 ${matchedCount} / 共 ${total} 条` : `共 ${total} 条`}
        </span>
        {filtering ? (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex cursor-pointer items-center gap-1 rounded-sm px-1.5 py-0.5 text-ink-500 transition-colors duration-200 ease-soft hover:bg-white/6 hover:text-ink-100"
          >
            <RotateCcw className="size-3.5" strokeWidth={1.9} aria-hidden />
            清空筛选
          </button>
        ) : null}
      </div>
    </div>
  )
}