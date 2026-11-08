import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui'
import { monthLabel, monthWeeks, shiftMonth, WEEKDAY_LABELS } from '@/features/archive/calendar'
import { MOOD_MAP, TAG_MAP } from '@/features/mood/mood.config'
import { synthesizeDay } from '@/features/planet/dayMood'
import type { MoodKey, MoodRecord } from '@/types/mood'
import { cn } from '@/utils/cn'
import { formatClockTime, localDayKey, parseDayKey, toDate, weekdayLabel } from '@/utils/date'

/**
 * 月历视图：周一开头，有记录的日期点一颗对应心情的色点；
 * 点任意一天，下方列出当天全部记录。跨月补位的格子不可点。
 */
export function MoodCalendar({ records }: { records: MoodRecord[] }) {
  const [today] = useState(() => new Date())
  const todayKey = localDayKey(today)
  const [view, setView] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
  }))
  const [selectedKey, setSelectedKey] = useState(todayKey)

  const byDay = useMemo(() => {
    const map = new Map<string, MoodRecord[]>()
    for (const record of records) {
      const created = toDate(record.createdAt)
      if (!created) continue
      const key = localDayKey(created)
      const bucket = map.get(key)
      if (bucket) bucket.push(record)
      else map.set(key, [record])
    }
    for (const bucket of map.values()) {
      bucket.sort((a, b) => (toDate(a.createdAt)?.getTime() ?? 0) - (toDate(b.createdAt)?.getTime() ?? 0))
    }
    return map
  }, [records])

  const weeks = useMemo(() => monthWeeks(view.year, view.month), [view])
  /* 日点与星球同一口径：当天出现最多、并列取较晚的心情，而不是最后一条 */
  const dayMoods = useMemo(() => {
    const map = new Map<string, MoodKey>()
    for (const [key, bucket] of byDay) {
      const synthesized = synthesizeDay(bucket, key)
      if (synthesized) map.set(key, synthesized.mood)
    }
    return map
  }, [byDay])
  const selectedDate = parseDayKey(selectedKey)
  const selectedRecords = byDay.get(selectedKey) ?? []

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <span aria-live="polite" className="font-display text-sm font-semibold text-ink-100">
          {monthLabel(view.year, view.month)}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            aria-label="上一个月"
            onClick={() => setView((current) => shiftMonth(current.year, current.month, -1))}
          >
            <ChevronLeft className="size-4" strokeWidth={1.9} aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label="回到本月"
            onClick={() => {
              setView({ year: today.getFullYear(), month: today.getMonth() })
              setSelectedKey(todayKey)
            }}
          >
            今天
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label="下一个月"
            onClick={() => setView((current) => shiftMonth(current.year, current.month, 1))}
          >
            <ChevronRight className="size-4" strokeWidth={1.9} aria-hidden />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center" aria-hidden>
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className="pb-1 text-[11px] text-ink-500">
            {label}
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        {weeks.map((week) => (
          <div key={week[0].dayKey} className="grid grid-cols-7 gap-1">
            {week.map((day) => {
              const dayRecords = byDay.get(day.dayKey) ?? []
              const mood = dayMoods.get(day.dayKey) ?? null
              const selected = day.dayKey === selectedKey
              return (
                <button
                  key={day.dayKey}
                  type="button"
                  disabled={!day.inMonth}
                  aria-pressed={selected}
                  aria-label={
                    day.inMonth
                      ? `${view.year} 年 ${view.month + 1} 月 ${day.dayNumber} 日，${dayRecords.length} 条记录${mood ? `，当天心情${MOOD_MAP[mood].label}` : ''}`
                      : undefined
                  }
                  onClick={() => setSelectedKey(day.dayKey)}
                  className={cn(
                    'relative flex min-h-11 flex-col items-center justify-center gap-1 rounded-md',
                    'transition-colors duration-150 ease-soft',
                    day.inMonth
                      ? 'cursor-pointer text-ink-100 hover:bg-white/6'
                      : 'cursor-default text-ink-700/50',
                    day.dayKey === todayKey && !selected && 'text-iris-300',
                    selected && 'bg-white/8 ring-1 ring-iris-300/50 ring-inset',
                  )}
                >
                  <span className="text-xs">{day.dayNumber}</span>
                  {mood ? (
                    <span
                      aria-hidden
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: MOOD_MAP[mood].hex }}
                    />
                  ) : (
                    <span aria-hidden className="size-1.5" />
                  )}
                  {dayRecords.length > 1 ? (
                    <span className="absolute top-0.5 right-1 text-[10px] text-ink-500">
                      {dayRecords.length}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <div className="rounded-md bg-white/3 p-4 sm:p-5">
        {selectedDate ? (
          <>
            <h3 className="text-sm font-semibold text-ink-100">
              {selectedDate.getMonth() + 1} 月 {selectedDate.getDate()} 日 ·{' '}
              {weekdayLabel(selectedDate)}
              <span className="ml-2 font-display text-xs font-normal text-ink-700">
                {selectedRecords.length} 条记录
              </span>
            </h3>
            {selectedRecords.length === 0 ? (
              <p className="mt-3 text-sm leading-relaxed text-ink-500">
                {selectedKey < todayKey
                  ? '这一天没有留下记录。没写也没关系，日子本身已经过去了。'
                  : selectedKey > todayKey
                    ? '这一天还没有到来。等它来了，想写的时候再留下记录也不迟。'
                    : '今天还没有写下记录。此刻想留一句的话，随时都可以。'}
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-3">
                {selectedRecords.map((record) => {
                  const mood = MOOD_MAP[record.mood]
                  return (
                    <li
                      key={record.id}
                      className="relative overflow-hidden rounded-md bg-white/3 py-3 pr-3.5 pl-4.5"
                    >
                      <span
                        aria-hidden
                        className="absolute inset-y-0 left-0 w-1"
                        style={{ backgroundColor: `${mood.hex}b3` }}
                      />
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <span
                          className="flex items-center gap-1.5 text-sm font-medium"
                          style={{ color: mood.hex }}
                        >
                          <span
                            aria-hidden
                            className="size-2 rounded-full"
                            style={{ backgroundColor: mood.hex }}
                          />
                          {mood.label}
                        </span>
                        <span className="text-xs text-ink-700">
                          {formatClockTime(record.createdAt)}
                        </span>
                        {record.theme ? (
                          <span className="rounded-full bg-white/6 px-2.5 py-0.5 text-xs text-ink-300">
                            {record.theme}
                          </span>
                        ) : null}
                      </div>
                      {record.content.trim() ? (
                        <p className="mt-2 line-clamp-3 text-sm leading-relaxed whitespace-pre-wrap text-ink-300">
                          {record.content}
                        </p>
                      ) : null}
                      {record.tags.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {record.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-white/6 px-2.5 py-0.5 text-xs text-ink-500"
                            >
                              {TAG_MAP[tag].label}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}
