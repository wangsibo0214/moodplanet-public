import {
  dominantMood,
  type ArchiveStats,
  type DayStat,
  type KeywordCount,
  type MoodCount,
  type TagCount,
} from '@/features/archive/archiveStats'
import { MOOD_MAP, TAG_MAP } from '@/features/mood/mood.config'
import { formatShortDate, parseDayKey, weekdayLabel } from '@/utils/date'

/** 档案页的统计面板。全部数字来自 computeArchiveStats，界面不再造任何数据。 */

interface StatCardProps {
  label: string
  value: string
  sub: string
  valueColor?: string
}

function StatCard({ label, value, sub, valueColor }: StatCardProps) {
  return (
    <div className="glass-panel flex flex-col gap-1 px-4 py-4 sm:px-5">
      <span className="text-xs text-ink-500">{label}</span>
      <span
        className="font-display text-2xl leading-tight font-semibold text-ink-50"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </span>
      <span className="text-[11px] leading-relaxed text-ink-700">{sub}</span>
    </div>
  )
}

export function StatCards({ stats, starCount }: { stats: ArchiveStats; starCount: number }) {
  const top = dominantMood(stats.moodCounts)
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      <StatCard
        label="情绪记录总数"
        value={String(stats.total)}
        sub={stats.firstAt ? `从 ${stats.firstAt.slice(0, 10).replaceAll('-', '/')} 开始积累` : '还没有记录'}
      />
      <StatCard
        label="最近 7 天"
        value={`${stats.weekTotal} 条`}
        sub={`其中 ${stats.weekActiveDays} 天有记录`}
      />
      <StatCard label="记忆星" value={`${starCount} 颗`} sub="与记录一一对应" />
      <StatCard
        label="最常出现的心情"
        value={top ? MOOD_MAP[top.mood].label : '—'}
        valueColor={top ? MOOD_MAP[top.mood].hex : undefined}
        sub={top ? `共 ${top.count} 次` : '等第一条记录来点亮'}
      />
    </div>
  )
}

export function MoodDistribution({ moodCounts }: { moodCounts: MoodCount[] }) {
  const max = Math.max(...moodCounts.map((entry) => entry.count), 1)
  return (
    <ul className="flex flex-col gap-2.5">
      {moodCounts.map(({ mood, count }) => {
        const meta = MOOD_MAP[mood]
        return (
          <li key={mood} className="flex items-center gap-3">
            <span className="flex w-12 shrink-0 items-center gap-1.5 text-sm text-ink-100">
              <span
                aria-hidden
                className="size-2 rounded-full"
                style={{ backgroundColor: meta.hex }}
              />
              {meta.label}
            </span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/6">
              <span
                className="block h-full rounded-full transition-[width] duration-300 ease-soft"
                style={{
                  width: count === 0 ? '0%' : `${Math.max(6, (count / max) * 100)}%`,
                  backgroundColor: meta.hex,
                }}
              />
            </span>
            <span className="w-10 shrink-0 text-right text-xs text-ink-500">{count} 次</span>
          </li>
        )
      })}
    </ul>
  )
}

export function WeekChart({ week }: { week: DayStat[] }) {
  const max = Math.max(...week.map((day) => day.count), 1)
  return (
    <div role="group" aria-label="最近 7 天的记录情况" className="flex items-end gap-1.5 sm:gap-2">
      {week.map((day) => {
        const date = parseDayKey(day.dayKey)
        const meta = day.mood ? MOOD_MAP[day.mood] : null
        return (
          <div key={day.dayKey} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <span className="text-[11px] text-ink-500">{day.count > 0 ? day.count : ''}</span>
            <span className="flex h-20 w-full items-end justify-center">
              <span
                aria-hidden
                className="w-full max-w-7 rounded-t-sm"
                style={{
                  height: day.count === 0 ? '4px' : `${Math.max(14, (day.count / max) * 100)}%`,
                  backgroundColor: meta ? meta.hex : 'rgb(255 255 255 / 0.08)',
                }}
              />
            </span>
            <span className="text-[11px] text-ink-700">{date ? weekdayLabel(date) : ''}</span>
            <span className="text-[11px] text-ink-500">{date ? formatShortDate(date) : ''}</span>
            <span className="sr-only">
              {date
                ? `${date.getMonth() + 1} 月 ${date.getDate()} 日 ${day.count} 条记录${meta ? `，当天心情${meta.label}` : ''}`
                : ''}
            </span>
          </div>
        )
      })}
    </div>
  )
}

interface ChipCloudProps {
  tags?: TagCount[]
  keywords?: KeywordCount[]
  emptyText: string
}

export function ChipCloud({ tags, keywords, emptyText }: ChipCloudProps) {
  const items = tags
    ? tags.map((entry) => ({ label: TAG_MAP[entry.tag].label, count: entry.count }))
    : (keywords ?? []).map((entry) => ({ label: entry.word, count: entry.count }))

  if (items.length === 0) {
    return <p className="text-sm leading-relaxed text-ink-500">{emptyText}</p>
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li
          key={item.label}
          className="rounded-full bg-white/6 px-3 py-1 text-xs text-ink-300 ring-1 ring-hairline ring-inset"
        >
          {item.label}
          <span className="ml-1 text-ink-500">×{item.count}</span>
        </li>
      ))}
    </ul>
  )
}
