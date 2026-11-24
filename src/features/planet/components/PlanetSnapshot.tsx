import { useEffect, useMemo, useState } from 'react'

import { Card } from '@/components/ui'
import { countReadyCapsules } from '@/features/capsule/capsuleTime'
import { MOODS, MOOD_MAP } from '@/features/mood/mood.config'
import { useCapsuleStore } from '@/stores/useCapsuleStore'
import { useMoodStore } from '@/stores/useMoodStore'
import { usePlanetStore } from '@/stores/usePlanetStore'
import type { MoodKey } from '@/types/mood'
import { cn } from '@/utils/cn'
import { toDate } from '@/utils/date'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

interface SnapshotItem {
  label: string
  value: string
  hint: string
  accentClass: string
  /** 情绪色点，只有「最常见情绪」用得上 */
  hex?: string
}

/** 近七天里出现次数最多的情绪；并列时取更早出现在色板里的那个，结果稳定。 */
function dominantMood(keys: readonly MoodKey[]): MoodKey | null {
  if (keys.length === 0) return null
  const counts = new Map<MoodKey, number>()
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1)
  let best: MoodKey | null = null
  let bestCount = 0
  for (const mood of MOODS) {
    const count = counts.get(mood.key) ?? 0
    if (count > bestCount) {
      bestCount = count
      best = mood.key
    }
  }
  return best
}

/** 主页概览卡片区。数值全部来自本机记录与星球状态，没有数据时如实显示「—」。 */
export function PlanetSnapshot() {
  const records = useMoodStore((state) => state.records)
  const stars = usePlanetStore((state) => state.stars)
  const capsules = useCapsuleStore((state) => state.capsules)
  const hydrateCapsules = useCapsuleStore((state) => state.hydrate)
  /* 「近七天」的起点固定在挂载时刻，和 HUD 的问候语用同一套口径 */
  const [now] = useState(() => Date.now())

  useEffect(() => {
    void hydrateCapsules()
  }, [hydrateCapsules])

  const items = useMemo<SnapshotItem[]>(() => {
    const week = records.filter((record) => {
      const created = toDate(record.createdAt)
      return created !== null && now - created.getTime() <= WEEK_MS
    })
    const dominant = dominantMood(records.map((record) => record.mood))
    const readyCapsules = countReadyCapsules(capsules, new Date(now))

    return [
      {
        label: '本周记录',
        value: week.length === 0 ? '—' : String(week.length),
        hint: week.length === 0 ? '这七天还没有落笔' : `共 ${week.length} 次心情落笔`,
        accentClass: 'text-iris-300',
      },
      {
        label: '最常见情绪',
        value: dominant ? MOOD_MAP[dominant].label : '—',
        hint: dominant
          ? `累计 ${records.length} 条记录里出现最多`
          : '数据积累后揭晓',
        accentClass: 'text-butter-400',
        hex: dominant ? MOOD_MAP[dominant].hex : undefined,
      },
      {
        label: '记忆星',
        value: stars.length === 0 ? '—' : String(stars.length),
        hint: stars.length === 0 ? '写下第一条就会亮起' : '每颗星都连着一条记录',
        accentClass: 'text-mint-400',
      },
      {
        label: '待开启胶囊',
        value: readyCapsules === 0 ? '—' : String(readyCapsules),
        hint: readyCapsules === 0 ? '暂无到期待开启的胶囊' : `共 ${readyCapsules} 颗已到开启时间`,
        accentClass: 'text-blush-400',
      },
    ]
  }, [records, stars.length, capsules, now])

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="flex flex-col gap-3 p-4 sm:p-5">
          <p className="text-xs font-medium text-ink-500">{item.label}</p>
          <p
            className={cn(
              'flex items-center gap-2 font-display text-3xl leading-none font-semibold',
              item.accentClass,
            )}
          >
            {item.hex ? (
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.hex }}
              />
            ) : null}
            {item.value}
          </p>
          <p className="text-xs leading-relaxed text-ink-700">{item.hint}</p>
        </Card>
      ))}
    </div>
  )
}
