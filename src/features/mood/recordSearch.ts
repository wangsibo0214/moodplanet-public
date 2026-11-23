import type { MoodRecord } from '@/types/mood'
import { formatFullDate, formatRecordTime } from '@/utils/date'

/**
 * 一条记录可供关键词检索的字段：只有用户自己写下的正文，再加上格式化时间，
 * 让「11 月」「2026」「周五」这类时间词也能从同一个搜索框命中。
 *
 * 本地解读生成的四处文本——情绪主题、想对你说、关键词、自我关怀建议——刻意不进检索：
 * 搜「压力」不该命中一条没写过它的记录，机器说的话也不算用户说过的话。
 */
export function recordSearchFields(record: MoodRecord): string[] {
  return [record.content, formatRecordTime(record.createdAt), formatFullDate(record.createdAt)]
}
