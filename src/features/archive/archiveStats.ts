import { MOODS, TAGS } from '@/features/mood/mood.config'
import { synthesizeDay } from '@/features/planet/dayMood'
import type { MoodKey, MoodRecord, TagKey } from '@/types/mood'
import { localDayKey, toDate } from '@/utils/date'

/**
 * 情绪档案的全部统计。
 * 纯函数：只读传入的记录与当前时间，不碰存储、不造数据；
 * 没有记录时所有计数都是 0，界面据此显示空状态。
 */

export interface MoodCount {
  mood: MoodKey
  count: number
}

export interface TagCount {
  tag: TagKey
  count: number
}

export interface KeywordCount {
  word: string
  count: number
}

export interface DayStat {
  dayKey: string
  count: number
  /** 当天综合心情（出现最多，并列取较晚），与星球同一口径；没有记录为 null */
  mood: MoodKey | null
}

export interface ArchiveStats {
  total: number
  /** 固定 7 项，旧 → 新，最后一项是 now 所在的本地日 */
  week: DayStat[]
  weekTotal: number
  weekActiveDays: number
  /** 六种心情全在，顺序与色板一致，计数可为 0 */
  moodCounts: MoodCount[]
  /** 只含出现过的标签，计数降序 */
  tagCounts: TagCount[]
  /** 只含出现过的关键词，计数降序 */
  keywordCounts: KeywordCount[]
  firstAt: string | null
  latestAt: string | null
}

const WEEK_DAYS = 7
const MAX_KEYWORDS_SHOWN = 12

export function computeArchiveStats(
  records: readonly MoodRecord[],
  now: Date,
): ArchiveStats {
  const moodCounts: MoodCount[] = MOODS.map((meta) => ({ mood: meta.key, count: 0 }))
  const moodIndex = new Map(moodCounts.map((entry, index) => [entry.mood, index]))
  const tagCounts = new Map<TagKey, number>()
  const keywordCounts = new Map<string, number>()
  const byDay = new Map<string, MoodRecord[]>()

  let total = 0
  let firstTime = Number.POSITIVE_INFINITY
  let latestTime = Number.NEGATIVE_INFINITY
  let firstAt: string | null = null
  let latestAt: string | null = null

  for (const record of records) {
    const created = toDate(record.createdAt)
    if (!created) continue
    total += 1

    const time = created.getTime()
    if (time < firstTime) {
      firstTime = time
      firstAt = record.createdAt
    }
    if (time > latestTime) {
      latestTime = time
      latestAt = record.createdAt
    }

    moodCounts[moodIndex.get(record.mood) ?? 0].count += 1
    for (const tag of record.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
    for (const word of record.keywords) {
      keywordCounts.set(word, (keywordCounts.get(word) ?? 0) + 1)
    }

    const key = localDayKey(created)
    const bucket = byDay.get(key)
    if (bucket) bucket.push(record)
    else byDay.set(key, [record])
  }

  const week: DayStat[] = []
  for (let offset = WEEK_DAYS - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset)
    const dayKey = localDayKey(date)
    const dayRecords = byDay.get(dayKey) ?? []
    week.push({
      dayKey,
      count: dayRecords.length,
      mood: synthesizeDay(dayRecords, dayKey)?.mood ?? null,
    })
  }

  const tagOrder = new Map(TAGS.map((meta, index) => [meta.key, index]))
  const sortedTags: TagCount[] = [...tagCounts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || (tagOrder.get(a.tag) ?? 0) - (tagOrder.get(b.tag) ?? 0))

  const sortedKeywords: KeywordCount[] = [...keywordCounts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word, 'zh-Hans-CN'))
    .slice(0, MAX_KEYWORDS_SHOWN)

  return {
    total,
    week,
    weekTotal: week.reduce((sum, day) => sum + day.count, 0),
    weekActiveDays: week.filter((day) => day.count > 0).length,
    moodCounts,
    tagCounts: sortedTags,
    keywordCounts: sortedKeywords,
    firstAt,
    latestAt,
  }
}

/** 出现次数最多的心情；全为 0 时返回 null。并列时取色板靠前者。 */
export function dominantMood(moodCounts: readonly MoodCount[]): MoodCount | null {
  let best: MoodCount | null = null
  for (const entry of moodCounts) {
    if (entry.count > 0 && (best === null || entry.count > best.count)) best = entry
  }
  return best
}
