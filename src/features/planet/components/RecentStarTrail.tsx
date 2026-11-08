import { Orbit } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Card, CardDescription, CardHeader, CardTitle, EmptyState } from '@/components/ui'
import { MOOD_MAP } from '@/features/mood/mood.config'
import { usePlanetStore } from '@/stores/usePlanetStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { cn } from '@/utils/cn'
import { formatRecordTime } from '@/utils/date'

const TRAIL_COUNT = 4

/**
 * 最近几颗记忆星。
 * 点一下会选中星球上对应的那颗星并把页面滚回舞台，等于「回到当时的场景」。
 */
export function RecentStarTrail() {
  const stars = usePlanetStore((state) => state.stars)
  const openStar = usePlanetStore((state) => state.openStar)
  const selectedRecordId = usePlanetStore((state) => state.selectedRecordId)
  const reduceMotion = useSettingsStore((state) => state.reduceMotion)

  /* 星按记录顺序存着（旧 → 新），取末尾几条即是最近的 */
  const recent = stars.length > TRAIL_COUNT ? stars.slice(-TRAIL_COUNT) : stars
  const trail = [...recent].reverse()

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Orbit className="size-4 text-butter-400" strokeWidth={1.75} aria-hidden />
          最近的星光
        </CardTitle>
        <CardDescription>
          点一下任意一颗，星球上对应的那颗星会亮起来，同时展开当时写下的内容。
        </CardDescription>
      </CardHeader>

      {trail.length === 0 ? (
        <EmptyState
          className="mt-5"
          icon={Orbit}
          title="星球还是一片安静的夜空"
          description="写下第一条心情，这里就会出现第一缕光。"
        />
      ) : (
        <ul className="mt-5 flex flex-col gap-2">
          {trail.map((star) => {
            const mood = MOOD_MAP[star.mood]
            const selected = selectedRecordId === star.recordId
            return (
              <li key={star.id}>
                <button
                  type="button"
                  onClick={() => {
                    openStar(star.recordId)
                    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
                  }}
                  aria-current={selected ? 'true' : undefined}
                  className={cn(
                    'flex w-full cursor-pointer items-center gap-3 rounded-md bg-white/3 px-3.5 py-3 text-left',
                    'transition-colors duration-200 ease-soft hover:bg-white/6',
                    selected && 'bg-white/6 ring-1 ring-iris-300/40 ring-inset',
                  )}
                >
                  <span
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: mood.hex }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink-100">{star.title}</span>
                    <span className="mt-0.5 block text-xs text-ink-700">
                      {mood.label} · {formatRecordTime(star.createdAt)}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-5">
        <Link
          to="/memories"
          className="text-xs text-iris-300 underline decoration-iris-400/40 underline-offset-4 transition-colors duration-200 ease-soft hover:text-iris-200"
        >
          查看全部 {stars.length} 颗记忆星
        </Link>
      </div>
    </Card>
  )
}
