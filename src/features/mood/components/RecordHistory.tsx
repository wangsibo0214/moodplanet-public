import { useMemo, useState } from 'react'
import { Check, History, Pencil, SearchX, Trash2, X } from 'lucide-react'

import { Button, Card, EmptyState, ListToolbar, Pagination } from '@/components/ui'
import { MOOD_MAP, TAG_MAP } from '@/features/mood/mood.config'
import { recordSearchFields } from '@/features/mood/recordSearch'
import { useListQuery } from '@/hooks'
import type { MoodRecord } from '@/types/mood'
import { cn } from '@/utils/cn'
import { formatRecordTime, toDate } from '@/utils/date'

interface RecordHistoryProps {
  records: MoodRecord[]
  /** 正在编辑的记录 id，用于高亮当前行 */
  editingId?: string | null
  onEdit: (record: MoodRecord) => void
  onDelete: (id: string) => void
}

const recordTime = (record: MoodRecord) => record.createdAt

/** 历史记录：新 → 旧，可检索、分页。删除是两步确认，避免误触一下就没了。 */
export function RecordHistory({ records, editingId = null, onEdit, onDelete }: RecordHistoryProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [now] = useState(() => new Date())

  const sorted = useMemo(
    () =>
      [...records].sort((a, b) => {
        const left = toDate(a.createdAt)?.getTime() ?? 0
        const right = toDate(b.createdAt)?.getTime() ?? 0
        return right - left
      }),
    [records],
  )

  const list = useListQuery({ items: sorted, getFields: recordSearchFields, getTime: recordTime, now })

  return (
    <Card>
      <div className="flex items-center gap-2">
        <History className="size-4 text-astro-300" strokeWidth={1.8} aria-hidden />
        <h2 className="text-sm font-semibold text-ink-100">历史记录</h2>
        <span className="font-display text-xs text-ink-700">{sorted.length} 条</span>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          className="mt-5"
          icon={History}
          title="还没有历史记录"
          description="写下第一条之后，它会保存在这台设备的浏览器里，刷新也还在。"
        />
      ) : (
        <>
          <ListToolbar className="mt-5" {...list} searchLabel="搜索历史记录" />

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
                const confirming = confirmId === record.id
                return (
                  <li
                    key={record.id}
                    className={cn(
                      'relative overflow-hidden rounded-md bg-white/3 py-3.5 pr-3.5 pl-4.5',
                      'transition-colors duration-200 ease-soft',
                      editingId === record.id && 'bg-white/6 ring-1 ring-iris-300/40 ring-inset',
                    )}
                  >
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 w-1"
                      style={{ backgroundColor: `${mood.hex}b3` }}
                    />

                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: mood.hex }}>
                        <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: mood.hex }} />
                        {mood.label}
                      </span>
                      <span className="text-xs text-ink-700">{formatRecordTime(record.createdAt)}</span>
                      {record.theme ? (
                        <span className="rounded-full bg-white/6 px-2.5 py-0.5 text-xs text-ink-300">
                          {record.theme}
                        </span>
                      ) : null}
                      {record.updatedAt !== record.createdAt ? (
                        <span className="text-xs text-ink-700">已编辑</span>
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

                    <div className="mt-3 flex items-center justify-end gap-2">
                      {confirming ? (
                        <div
                          role="group"
                          aria-label="确认删除这条记录"
                          className="flex items-center gap-2"
                        >
                          <span className="mr-auto text-xs text-ink-500 sm:mr-0">删掉就找不回来了</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmId(null)}
                            aria-label="取消删除"
                          >
                            <X className="size-4" strokeWidth={1.9} aria-hidden />
                            取消
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setConfirmId(null)
                              onDelete(record.id)
                            }}
                            aria-label="确认删除这条记录"
                          >
                            <Check className="size-4" strokeWidth={1.9} aria-hidden />
                            确认删除
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(record)}
                            aria-label={`编辑 ${formatRecordTime(record.createdAt)} 的记录`}
                          >
                            <Pencil className="size-4" strokeWidth={1.9} aria-hidden />
                            编辑
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmId(record.id)}
                            aria-label={`删除 ${formatRecordTime(record.createdAt)} 的记录`}
                          >
                            <Trash2 className="size-4" strokeWidth={1.9} aria-hidden />
                            删除
                          </Button>
                        </>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          <Pagination page={list.page} pageCount={list.pageCount} onChange={list.onPage} />
        </>
      )}
    </Card>
  )
}