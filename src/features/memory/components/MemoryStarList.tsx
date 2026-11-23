import { useMemo, useState } from 'react'
import { Orbit, SearchX, Star } from 'lucide-react'

import { Button, EmptyState, ListToolbar, Pagination } from '@/components/ui'
import { MOOD_MAP, TAG_MAP } from '@/features/mood/mood.config'
import { recordSearchFields } from '@/features/mood/recordSearch'
import { useListQuery } from '@/hooks'
import { useMoodStore } from '@/stores/useMoodStore'
import { usePlanetStore } from '@/stores/usePlanetStore'
import type { MemoryStar, MoodRecord } from '@/types/mood'
import { cn } from '@/utils/cn'
import { formatRecordTime } from '@/utils/date'

/** 一颗星对应的那条记录。星是入口，记录才是内容，所以详情一律回查记录本体。 */
function StarDetail({ record }: { record: MoodRecord }) {
  const mood = MOOD_MAP[record.mood]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
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
        {record.updatedAt !== record.createdAt ? (
          <span className="text-xs text-ink-700">已编辑</span>
        ) : null}
      </div>

      {record.content.trim().length > 0 ? (
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink-100">
          {record.content}
        </p>
      ) : (
        <p className="text-sm text-ink-700">这一条没有写正文，只留了当时的心情。</p>
      )}

      {record.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
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

      {record.theme.length > 0 ? (
        <dl className="flex flex-col gap-3 border-t border-hairline pt-4">
          <div className="flex flex-col gap-1">
            <dt className="text-[11px] font-medium text-ink-500">情绪主题</dt>
            <dd className="text-sm leading-relaxed text-ink-300">{record.theme}</dd>
          </div>
          {record.keywords.length > 0 ? (
            <div className="flex flex-col gap-1">
              <dt className="text-[11px] font-medium text-ink-500">关键词</dt>
              <dd className="flex flex-wrap gap-1.5">
                {record.keywords.map((word) => (
                  <span
                    key={word}
                    className="rounded-full bg-iris-400/12 px-2.5 py-0.5 text-xs text-iris-300 ring-1 ring-iris-400/25 ring-inset"
                  >
                    {word}
                  </span>
                ))}
              </dd>
            </div>
          ) : null}
          {record.feedback.length > 0 ? (
            <div className="flex flex-col gap-1">
              <dt className="text-[11px] font-medium text-ink-500">想对你说</dt>
              <dd className="text-sm leading-relaxed text-ink-300">{record.feedback}</dd>
            </div>
          ) : null}
          {record.suggestion.length > 0 ? (
            <div className="flex flex-col gap-1">
              <dt className="text-[11px] font-medium text-ink-500">自我关怀</dt>
              <dd className="text-sm leading-relaxed text-ink-300">{record.suggestion}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </div>
  )
}

interface StarEntry {
  star: MemoryStar
  record: MoodRecord
}

const starTime = (entry: StarEntry) => entry.record.createdAt
/* 不搜 star.title：正文为空时它是主题或「X的一天」兜出来的，属机器生成的文本；
   正文本身已由 recordSearchFields 覆盖，撤掉不丢可搜的用户原话。 */
const starFields = (entry: StarEntry) => recordSearchFields(entry.record)

/**
 * 记忆星列表。
 * 每颗星都由一条真实的心情记录点亮，点开就是那条记录本身；
 * 记录被删掉时星会一起消失，所以这里不会出现打不开的空星。
 * 可检索、分页：星再多，左栏也只占一页的高度。
 */
export function MemoryStarList() {
  const stars = usePlanetStore((state) => state.stars)
  const records = useMoodStore((state) => state.records)
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null)
  const [now] = useState(() => new Date())

  const recordMap = useMemo(() => new Map(records.map((r) => [r.id, r])), [records])
  /* 星按记录顺序存着（旧 → 新），列表倒过来展示，最新的在最上面 */
  const entries = useMemo<StarEntry[]>(
    () =>
      [...stars]
        .reverse()
        .map((star) => ({ star, record: recordMap.get(star.recordId) }))
        .filter((entry): entry is StarEntry => Boolean(entry.record)),
    [stars, recordMap],
  )

  const list = useListQuery({ items: entries, getFields: starFields, getTime: starTime, now })
  const active =
    list.pageItems.find((entry) => entry.star.recordId === activeRecordId) ?? list.pageItems[0]

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Star}
        title="还没有记忆星"
        description="每成功保存一条心情记录，星球上就会亮起一颗记忆星，随时能点回那一刻。"
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <ListToolbar {...list} searchLabel="搜索记忆星" />

      {list.matchedCount === 0 ? (
        <EmptyState
          icon={SearchX}
          title="没有匹配的记忆星"
          description="换个关键词，或把时间范围放宽一点试试。"
          action={
            <Button variant="outline" size="sm" onClick={list.onReset}>
              清空筛选
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:gap-7">
          <div className="flex min-w-0 flex-col">
            <ul className="flex max-h-[26rem] flex-col gap-2 overflow-y-auto pr-1 lg:max-h-none">
              {list.pageItems.map(({ star, record }) => {
                const mood = MOOD_MAP[star.mood]
                const selected = active?.star.id === star.id
                return (
                  <li key={star.id}>
                    <button
                      type="button"
                      onClick={() => setActiveRecordId(star.recordId)}
                      aria-current={selected ? 'true' : undefined}
                      className={cn(
                        'relative w-full cursor-pointer overflow-hidden rounded-md bg-white/3 py-3 pr-3.5 pl-4.5 text-left',
                        'transition-colors duration-200 ease-soft hover:bg-white/6',
                        selected && 'bg-white/6 ring-1 ring-iris-300/40 ring-inset',
                      )}
                    >
                      <span
                        aria-hidden
                        className="absolute inset-y-0 left-0 w-1"
                        style={{ backgroundColor: `${mood.hex}b3` }}
                      />
                      <span className="flex items-center gap-1.5">
                        <Orbit
                          className="size-3.5 shrink-0"
                          style={{ color: mood.hex }}
                          strokeWidth={1.9}
                          aria-hidden
                        />
                        <span className="text-xs font-medium" style={{ color: mood.hex }}>
                          {mood.label}
                        </span>
                      </span>
                      <span className="mt-1 block truncate text-sm text-ink-100">{star.title}</span>
                      <span className="mt-0.5 block text-xs text-ink-700">
                        {formatRecordTime(record.createdAt)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <Pagination page={list.page} pageCount={list.pageCount} onChange={list.onPage} />
          </div>

          <div className="min-w-0 rounded-md bg-white/3 p-4 sm:p-5">
            {active ? <StarDetail key={active.record.id} record={active.record} /> : null}
          </div>
        </div>
      )}
    </div>
  )
}