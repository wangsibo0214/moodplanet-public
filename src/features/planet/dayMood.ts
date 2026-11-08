import { MOODS } from '@/features/mood/mood.config'
import type { MoodKey, MoodRecord } from '@/types/mood'
import { localDayKey, toDate } from '@/utils/date'

/**
 * 一天之内心情的综合。
 *
 * 星球环境不该只跟着「最后一条」记录跳：同一天写下的所有心情都算数，
 * 出现次数最多的那种成为当天的主色调；次数并列时取记录较晚的那种，
 * 让「只写了一条」的日子与旧行为保持一致。
 */

export interface DayMoodCount {
  mood: MoodKey
  count: number
}

export interface DayMood {
  dayKey: string
  /** 综合结果：当天出现最多、并列时较晚的心情 */
  mood: MoodKey
  total: number
  /** 只含出现过的心情，顺序与色板一致 */
  counts: DayMoodCount[]
  /** 当天每条记录的心情，按时间旧 → 新，供界面画一排小色点 */
  timeline: MoodKey[]
  /** 当天最新一条记录的 id，作为环境状态的锚点 */
  latestRecordId: string
}

interface MoodTally {
  mood: MoodKey
  count: number
  latestTime: number
}

/** 综合某一天（本地日键）的全部记录；当天没有有效记录时返回 null。 */
export function synthesizeDay(
  records: readonly MoodRecord[],
  dayKey: string,
): DayMood | null {
  const ofDay: { record: MoodRecord; time: number }[] = []
  for (const record of records) {
    const created = toDate(record.createdAt)
    if (!created || localDayKey(created) !== dayKey) continue
    ofDay.push({ record, time: created.getTime() })
  }
  if (ofDay.length === 0) return null

  ofDay.sort((a, b) => a.time - b.time)

  const tally = new Map<MoodKey, MoodTally>()
  for (const { record, time } of ofDay) {
    const entry = tally.get(record.mood) ?? { mood: record.mood, count: 0, latestTime: 0 }
    entry.count += 1
    entry.latestTime = Math.max(entry.latestTime, time)
    tally.set(record.mood, entry)
  }

  let best: MoodTally | null = null
  for (const meta of MOODS) {
    const entry = tally.get(meta.key)
    if (!entry) continue
    if (
      best === null ||
      entry.count > best.count ||
      (entry.count === best.count && entry.latestTime > best.latestTime)
    ) {
      best = entry
    }
  }
  if (best === null) return null

  const counts: DayMoodCount[] = MOODS.flatMap((meta) => {
    const entry = tally.get(meta.key)
    return entry ? [{ mood: meta.key, count: entry.count }] : []
  })

  return {
    dayKey,
    mood: best.mood,
    total: ofDay.length,
    counts,
    timeline: ofDay.map((entry) => entry.record.mood),
    latestRecordId: ofDay[ofDay.length - 1].record.id,
  }
}

/** 最近一个有记录的本地日键；一条有效记录都没有时为 null。 */
export function latestDayKey(records: readonly MoodRecord[]): string | null {
  let bestTime = Number.NEGATIVE_INFINITY
  let bestKey: string | null = null
  for (const record of records) {
    const created = toDate(record.createdAt)
    if (!created) continue
    const time = created.getTime()
    if (time > bestTime) {
      bestTime = time
      bestKey = localDayKey(created)
    }
  }
  return bestKey
}

/** 综合最近一个有记录的日子：今天写过就是今天，否则回落到更早的那天。 */
export function synthesizeLatestDay(records: readonly MoodRecord[]): DayMood | null {
  const dayKey = latestDayKey(records)
  return dayKey === null ? null : synthesizeDay(records, dayKey)
}

/** 综合今天的全部记录；今天还没写时为 null。 */
export function synthesizeToday(records: readonly MoodRecord[], now: Date): DayMood | null {
  return synthesizeDay(records, localDayKey(now))
}
