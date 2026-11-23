import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { History, SearchX } from 'lucide-react'

import { Button, buttonClasses, Card, EmptyState, ListToolbar, Pagination } from '@/components/ui'
import { MOOD_MAP, TAG_MAP } from '@/features/mood/mood.config'
import { recordSearchFields } from '@/features/mood/recordSearch'
import { useListQuery } from '@/hooks'
import type { MoodRecord } from '@/types/mood'
import { formatRecordTime, toDate } from '@/utils/date'

const recordTime = (record: MoodRecord) => record.createdAt

/**
 * 档案里的历史回顾：只读，可检索、分页。
 * 编辑与删除仍集中在心情记录页，避免两套流程各改一半。
 */
export function ArchiveRecordList({ records }: { records: MoodRecord[] }) {
  const [now] = useState(() => new Date())
  const sorted = useMemo(
    () =>
      [...records].sort(
        (a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0),
      ),
    [records],
  )

  const list = useListQuery({ items: sorted, getFields: recordSearchFields, getTime: recordTime, now })

  return (
    <Card>
      <div className="flex items-center gap-2">
        <History className="size-4 text-astro-300" strokeWidth={1.8} aria-hidden />
        <h2 className="text-sm font-semibold text-ink-100">历史记录回顾</h2>
        <span className="font-display text-xs text-ink-700">{sorted.length} 条</span>
      </div>

      <ListToolbar className="mt-5" {...list} searchLabel="搜索历史回顾" />

      {list.matchedCount === 0 ? (
        <EmptyState
          className="mt-5"
          icon={SearchX}
          title="没有匹配的记录"
          description="换个关键词，或把时间范围放宽一点试试。"
          action={
            <Button variant="outline" size="sm" onClick={list.onReset}>
              清空筛选
            </Button>
          }
        />
      ) : (
        <ul className="mt-5 flex flex-col gap-3">
          {list.pageItems.map((record) => {
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
      )}

      <Pagination page={list.page} pageCount={list.pageCount} onChange={list.onPage} />

      <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-500">
        全部 {sorted.length} 条的编辑与删除在
        <Link to="/record" className={buttonClasses('ghost', 'sm', 'h-auto px-1.5 py-0 text-xs')}>
          心情记录页
        </Link>
        。
      </p>
    </Card>
  )
}