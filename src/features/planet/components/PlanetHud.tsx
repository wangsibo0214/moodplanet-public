import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Archive, ChevronRight, Hourglass, NotebookPen, Star } from 'lucide-react'

import { buttonClasses } from '@/components/ui'
import { MOODS, MOOD_MAP } from '@/features/mood/mood.config'
import { synthesizeLatestDay, synthesizeToday } from '@/features/planet/dayMood'
import { useMoodStore } from '@/stores/useMoodStore'
import { usePlanetStore } from '@/stores/usePlanetStore'
import { cn } from '@/utils/cn'
import { formatShortDate, localDayKey, parseDayKey } from '@/utils/date'

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const

function getGreeting(date: Date): string {
  const hour = date.getHours()
  if (hour < 5) return '夜深了'
  if (hour < 11) return '早上好'
  if (hour < 14) return '午安'
  if (hour < 18) return '下午好'
  return '晚上好'
}

function formatDate(date: Date): string {
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日 · ${WEEKDAYS[date.getDay()]}`
}

/**
 * 日期、问候与星球状态行。
 * 桌面上叠在舞台左上角；窄屏幕上移到舞台上方独立成行，
 * 免得文字压住星球顶部的小伙伴。
 */
export function PlanetGreeting() {
  /* 问候语只取决于挂载时刻，用惰性初始值固定住 */
  const [now] = useState(() => new Date())
  const records = useMoodStore((state) => state.records)
  const activeDay = useMemo(() => synthesizeLatestDay(records), [records])
  const environmentMood = usePlanetStore((state) => state.environment.mood)
  const sceneMood = environmentMood ? MOOD_MAP[environmentMood] : null

  const activeDayLabel = activeDay
    ? activeDay.dayKey === localDayKey(now)
      ? '今天'
      : formatShortDate(parseDayKey(activeDay.dayKey) ?? now)
    : ''

  return (
    <div className="stagger-rise min-w-0">
      <p className="font-display text-[11px] font-medium text-iris-300 sm:text-xs">
        {formatDate(now)}
      </p>
      <h1 className="mt-1 text-lg leading-snug font-semibold text-balance text-ink-50 [text-shadow:0_2px_18px_rgb(7_8_26/0.9)] sm:text-xl lg:text-2xl">
        {getGreeting(now)}，今天你的星球是什么颜色？
      </h1>
      {sceneMood ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-ink-500 sm:text-xs">
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: sceneMood.hex }}
          />
          星球正停在「{sceneMood.label}」的样子
          {activeDay && activeDay.total > 1 ? (
            <span className="text-ink-700">
              · 由{activeDayLabel}的 {activeDay.total} 条记录综合
            </span>
          ) : null}
        </p>
      ) : null}
    </div>
  )
}

/**
 * 覆盖在 3D 舞台上的界面层。
 * 容器本身 pointer-events-none，只有具体的按钮恢复点击，
 * 这样空白区域的拖拽依然能转星球。
 */
export function PlanetHud() {
  const [now] = useState(() => new Date())
  const records = useMoodStore((state) => state.records)
  const todaySyn = useMemo(() => synthesizeToday(records, now), [records, now])
  const todayMood = todaySyn ? MOOD_MAP[todaySyn.mood] : null
  const starCount = usePlanetStore((state) => state.stars.length)

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4 sm:p-5 lg:p-6">
      <div data-hud-top className="flex items-start justify-end gap-3 lg:justify-between">
        <div className="hidden lg:block">
          <PlanetGreeting />
        </div>

        <Link
          to="/memories"
          className="glass-panel pointer-events-auto flex min-h-11 shrink-0 items-center gap-2 rounded-full py-2 pr-3.5 pl-3 text-xs transition-transform duration-200 ease-soft hover:-translate-y-0.5 active:scale-[0.97]"
        >
          <Star className="size-4 text-butter-300" strokeWidth={1.9} aria-hidden />
          <span className="text-ink-300">记忆星</span>
          <span className="font-display text-sm font-semibold text-ink-50">{starCount}</span>
          <span className="text-ink-700">颗</span>
        </Link>
      </div>

      <div className="hidden items-end justify-between gap-4 lg:flex">
        <Link
          to="/record"
          className="glass-panel pointer-events-auto flex min-h-11 items-center gap-3 rounded-full py-2 pr-4 pl-3 transition-transform duration-200 ease-soft hover:-translate-y-0.5 active:scale-[0.97]"
        >
          {todaySyn ? (
            <span className="flex -space-x-1" aria-hidden>
              {todaySyn.timeline.slice(-6).map((mood, index) => (
                <span
                  key={`${mood}-${index}`}
                  className="size-2.5 rounded-full ring-2 ring-cosmos-900"
                  style={{ backgroundColor: MOOD_MAP[mood].hex }}
                />
              ))}
            </span>
          ) : (
            <span className="flex -space-x-1" aria-hidden>
              {MOODS.map((mood) => (
                <span
                  key={mood.key}
                  className="size-2.5 rounded-full ring-2 ring-cosmos-900"
                  style={{ backgroundColor: mood.hex }}
                />
              ))}
            </span>
          )}
          <span className="flex flex-col leading-tight">
            <span className="text-[11px] text-ink-700">今日心情</span>
            <span
              className={cn('text-xs font-medium', !todayMood && 'text-ink-100')}
              style={todayMood ? { color: todayMood.hex } : undefined}
            >
              {todayMood
                ? todaySyn && todaySyn.total > 1
                  ? `${todayMood.label} · ${todaySyn.total} 条综合`
                  : todayMood.label
                : '还没有记录'}
            </span>
          </span>
          <ChevronRight className="size-4 text-ink-700" strokeWidth={1.9} aria-hidden />
        </Link>

        <Link to="/record" className={buttonClasses('primary', 'md', 'pointer-events-auto')}>
          <NotebookPen className="size-4" strokeWidth={1.9} aria-hidden />
          新建记录
        </Link>

        <div className="flex items-center gap-2.5">
          <Link
            to="/capsule"
            className={buttonClasses('secondary', 'md', 'pointer-events-auto')}
          >
            <Hourglass className="size-4" strokeWidth={1.9} aria-hidden />
            时光胶囊
          </Link>
          <Link
            to="/archive"
            className={buttonClasses('secondary', 'md', 'pointer-events-auto')}
          >
            <Archive className="size-4" strokeWidth={1.9} aria-hidden />
            情绪档案
          </Link>
        </div>
      </div>
    </div>
  )
}
