import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { History } from 'lucide-react'

import { buttonClasses, Card } from '@/components/ui'
import { MOOD_MAP, TAG_MAP } from '@/features/mood/mood.config'
import type { MoodRecord } from '@/types/mood'
import { formatRecordTime, toDate } from '@/utils/date'

const PREVIEW_LIMIT = 10

/**
 * 档案里的历史回顾：只读，展示最近若干条。
 * 编辑与删除仍集中在心情记录页，避免两套流程各改一半。
 */
export function ArchiveRecordList({ records }: { records: MoodRecord[] }) {
  const sorted = useMemo(
    () =>
      [...records].sort(
        (a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0),
      ),
    [records],
  )
  const preview = sorted.slice(0, PREVIEW_LIMIT)

  return (
    <Card>
      <div className="flex items-center gap-2">
        <History className="size-4 text-astro-300" strokeWidth={1.8} aria-hidden />
        <h2 className="text-sm font-semibold text-ink-100">历史记录回顾</h2>
        <span className="font-display text-xs text-ink-700">{sorted.length} 条</span>
      </div>

      <ul className="mt-5 flex flex-col gap-3">
        {preview.map((record) => {
          const mood = MOOD_MAP[record.mood]
          return (
            <li
              key={record.id}
              className="relative overflow-hidden rounded-md bg-white/3 py-3.5 pr-3.5 pl-4.5"
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
                <span className="text-xs text-ink-700">{formatRecordTime(record.createdAt)}</span>
                {record.theme ? (
                  <span className="rounded-full bg-white/6 px-2.5 py-0.5 text-xs text-ink-300">
                    {record.theme}
                  </span>
                ) : null}
              </div>
              {record.content.trim() ? (
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-300">
                  {record.content}
                </p>
              ) : null}
              {record.keywords.length > 0 || record.tags.length > 0 ? (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {record.keywords.map((word) => (
                    <span
                      key={word}
                      className="rounded-full bg-iris-400/12 px-2.5 py-0.5 text-xs text-iris-300 ring-1 ring-iris-400/25 ring-inset"
                    >
                      {word}
                    </span>
                  ))}
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

      {sorted.length > PREVIEW_LIMIT ? (
        <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-500">
          这里展示最近 {PREVIEW_LIMIT} 条；全部 {sorted.length} 条的编辑与删除在
          <Link to="/record" className={buttonClasses('ghost', 'sm', 'h-auto px-1.5 py-0 text-xs')}>
            心情记录页
          </Link>
          。
        </p>
      ) : null}
    </Card>
  )
}
