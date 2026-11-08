import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { NotebookPen, Star, X } from 'lucide-react'

import { buttonClasses } from '@/components/ui'
import { MOOD_MAP } from '@/features/mood/mood.config'
import { useMoodStore } from '@/stores/useMoodStore'
import { usePlanetStore } from '@/stores/usePlanetStore'
import { formatRecordTime } from '@/utils/date'

/**
 * 点击星球上的记忆星后弹出。
 * 内容全部来自关联的那条 MoodRecord：星只是入口，记录才是本体，
 * 所以记录一旦被删，这里会直接回到空态而不是留一颗打不开的星。
 */
export function MemoryStarPanel() {
  const selectedRecordId = usePlanetStore((state) => state.selectedRecordId)
  const openStar = usePlanetStore((state) => state.openStar)
  const record = useMoodStore((state) =>
    selectedRecordId === null
      ? null
      : (state.records.find((item) => item.id === selectedRecordId) ?? null),
  )
  /* 星在但记录已经不在：自动收起选中态，避免出现「打不开的记忆星」 */
  const orphaned = selectedRecordId !== null && record === null

  useEffect(() => {
    if (orphaned) openStar(null)
  }, [orphaned, openStar])

  if (record === null) return null

  const mood = MOOD_MAP[record.mood]

  return (
    <div className="pointer-events-none absolute top-20 right-4 z-20 w-[min(92%,21rem)] sm:right-5 lg:top-auto lg:right-6 lg:bottom-6">
      <div className="glass-panel pointer-events-auto flex max-h-[70vh] flex-col gap-3 overflow-y-auto p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Star
              className="size-4 shrink-0"
              style={{ color: mood.hex }}
              strokeWidth={1.9}
              aria-hidden
            />
            <h2 className="font-display text-sm font-semibold text-ink-50">
              {mood.label}的记忆星
            </h2>
          </div>
          <button
            type="button"
            onClick={() => openStar(null)}
            aria-label="关闭记忆星详情"
            className="-mt-1 -mr-1.5 grid size-11 shrink-0 cursor-pointer place-items-center rounded-sm text-ink-700 transition-colors duration-200 hover:text-ink-100"
          >
            <X className="size-4" strokeWidth={1.9} aria-hidden />
          </button>
        </div>

        <p className="text-xs text-ink-700">{formatRecordTime(record.createdAt)}</p>

        <dl className="flex flex-col gap-2.5">
          {record.content.trim().length > 0 ? (
            <div className="flex flex-col gap-1">
              <dt className="text-[11px] font-medium text-ink-500">当时写下</dt>
              <dd className="text-sm leading-relaxed whitespace-pre-wrap text-ink-100">
                {record.content}
              </dd>
            </div>
          ) : null}

          {record.theme.length > 0 ? (
            <div className="flex flex-col gap-1">
              <dt className="text-[11px] font-medium text-ink-500">情绪主题</dt>
              <dd className="text-sm leading-relaxed text-ink-300">{record.theme}</dd>
            </div>
          ) : null}

          {record.feedback.length > 0 ? (
            <div className="flex flex-col gap-1">
              <dt className="text-[11px] font-medium text-ink-500">想对你说</dt>
              <dd className="text-sm leading-relaxed text-ink-300">{record.feedback}</dd>
            </div>
          ) : null}
        </dl>

        <div className="flex flex-wrap items-center gap-2">
          <Link to="/memories" className={buttonClasses('primary', 'sm')}>
            <Star className="size-4" strokeWidth={1.9} aria-hidden />
            全部记忆星
          </Link>
          <Link to="/record" className={buttonClasses('ghost', 'sm')}>
            <NotebookPen className="size-4" strokeWidth={1.9} aria-hidden />
            再写一条
          </Link>
        </div>
      </div>
    </div>
  )
}
