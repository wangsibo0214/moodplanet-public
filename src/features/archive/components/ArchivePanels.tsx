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
  /* 一条 100% 堆叠色带：段宽用 flex-grow 按次数分配，余数由布局算法摊平，
     段与段之间既不留亚像素缝也不需要分隔线——六段本身就是一条连续的带。
     端角写死 3px 而不用刻度：本项目的 --radius-sm 是 12px，在 12px 高的带上等于胶囊，
     两端会收细成半圆，看起来就不是一条平的带。 */
  const total = moodCounts.reduce((sum, entry) => sum + entry.count, 0)
  const percent = (count: number) => {
    if (count === 0 || total === 0) return '0%'
    const share = (count / total) * 100
    return share < 1 ? '不足 1%' : `${Math.round(share)}%`
  }
  return (
    <div className="flex flex-col gap-4">
      <div aria-hidden className="flex h-3 w-full overflow-hidden rounded-[3px] bg-white/6">
        {moodCounts.map(({ mood, count }) => (
          <span
            key={mood}
            className="basis-0 transition-[flex-grow] duration-300 ease-soft"
            style={{ flexGrow: count, backgroundColor: MOOD_MAP[mood].hex }}
          />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
        {moodCounts.map(({ mood, count }) => {
          const meta = MOOD_MAP[mood]
          return (
            <li key={mood} className="flex min-w-0 items-center gap-2 text-sm">
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: meta.hex }}
              />
              <span className="truncate text-ink-100">{meta.label}</span>
              <span className="ml-auto shrink-0 text-xs text-ink-500">
                {count} 次 · {percent(count)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
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
