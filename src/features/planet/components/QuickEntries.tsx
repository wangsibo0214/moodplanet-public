import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Archive, Hourglass, NotebookPen, Sparkles, Star } from 'lucide-react'

import { buttonClasses } from '@/components/ui'
import { MOODS, MOOD_MAP } from '@/features/mood/mood.config'
import { synthesizeToday } from '@/features/planet/dayMood'
import { useMoodStore } from '@/stores/useMoodStore'
import { usePlanetStore } from '@/stores/usePlanetStore'

const ENTRIES = [
  { to: '/record', label: '今日心情', hint: '挑一种颜色', icon: Sparkles, tone: 'text-butter-300' },
  { to: '/memories', label: '记忆星', hint: '点亮过的时刻', icon: Star, tone: 'text-iris-300' },
  { to: '/capsule', label: '时光胶囊', hint: '写给未来', icon: Hourglass, tone: 'text-astro-300' },
  { to: '/archive', label: '情绪档案', hint: '回看轨迹', icon: Archive, tone: 'text-mint-300' },
] as const

/**
 * 竖屏手机的入口区。
 * 桌面端这些入口叠在 3D 舞台四周，手机上改成正文流，避免挡住星球。
 */
export function QuickEntries() {
  const [now] = useState(() => new Date())
  const records = useMoodStore((state) => state.records)
  const todaySyn = useMemo(() => synthesizeToday(records, now), [records, now])
  const todayMood = todaySyn ? MOOD_MAP[todaySyn.mood] : null
  const starCount = usePlanetStore((state) => state.stars.length)

  return (
    <div className="flex flex-col gap-3 lg:hidden">
      <Link to="/record" className={buttonClasses('primary', 'lg', 'w-full')}>
        <NotebookPen className="size-4" strokeWidth={1.9} aria-hidden />
        新建记录
      </Link>

      <div className="grid grid-cols-2 gap-3">
        {ENTRIES.map((entry) => (
          <Link
            key={entry.to}
            to={entry.to}
            className="glass-panel glass-panel-hover flex min-h-20 flex-col justify-center gap-1 p-3.5"
          >
            <entry.icon className={`size-4 ${entry.tone}`} strokeWidth={1.9} aria-hidden />
            <span className="text-sm font-medium text-ink-50">{entry.label}</span>
            {entry.to === '/memories' ? (
              <span className="text-xs text-ink-700">
                <span className="font-display text-sm font-semibold text-iris-300">
                  {starCount}
                </span>{' '}
                颗已点亮
              </span>
            ) : entry.to === '/record' ? (
              todayMood ? (
                <span
                  className="flex items-center gap-1.5 text-xs font-medium"
                  style={{ color: todayMood.hex }}
                >
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{ backgroundColor: todayMood.hex }}
                  />
                  {todaySyn && todaySyn.total > 1
                    ? `${todayMood.label} · ${todaySyn.total} 条综合`
                    : todayMood.label}
                </span>
              ) : (
                <span className="flex -space-x-1" aria-hidden>
                  {MOODS.map((mood) => (
                    <span
                      key={mood.key}
                      className="size-2 rounded-full ring-2 ring-cosmos-900"
                      style={{ backgroundColor: mood.hex }}
                    />
                  ))}
                </span>
              )
            ) : (
              <span className="text-xs text-ink-700">{entry.hint}</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
