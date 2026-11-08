import { describe, expect, it } from 'vitest'

import { computeArchiveStats, dominantMood } from '@/features/archive/archiveStats'
import type { MoodRecord } from '@/types/mood'

const NOW = new Date(2026, 10, 7, 10, 0, 0)

function record(
  id: string,
  createdAt: Date,
  extra: Partial<MoodRecord> = {},
): MoodRecord {
  return {
    id,
    mood: 'calm',
    content: '',
    tags: [],
    keywords: [],
    theme: '',
    feedback: '',
    suggestion: '',
    planet: null,
    analyzed: false,
    createdAt: createdAt.toISOString(),
    updatedAt: createdAt.toISOString(),
    ...extra,
  }
}

describe('computeArchiveStats', () => {
  it('空记录得到全零统计，不造数据', () => {
    const stats = computeArchiveStats([], NOW)
    expect(stats.total).toBe(0)
    expect(stats.weekTotal).toBe(0)
    expect(stats.weekActiveDays).toBe(0)
    expect(stats.week).toHaveLength(7)
    expect(stats.week.every((day) => day.count === 0 && day.mood === null)).toBe(true)
    expect(stats.moodCounts.every((entry) => entry.count === 0)).toBe(true)
    expect(stats.tagCounts).toEqual([])
    expect(stats.keywordCounts).toEqual([])
    expect(stats.firstAt).toBeNull()
    expect(stats.latestAt).toBeNull()
    expect(dominantMood(stats.moodCounts)).toBeNull()
  })

  it('七天窗口按本地日历日切分，边界当天算、第八天不算', () => {
    const stats = computeArchiveStats(
      [
        record('r-today', new Date(2026, 10, 7, 8, 0)),
        record('r-edge-in', new Date(2026, 10, 1, 0, 0)),
        record('r-edge-out', new Date(2026, 9, 31, 23, 59)),
      ],
      NOW,
    )
    expect(stats.total).toBe(3)
    expect(stats.weekTotal).toBe(2)
    expect(stats.weekActiveDays).toBe(2)
    expect(stats.week[0]).toMatchObject({ dayKey: '2026-11-01', count: 1 })
    expect(stats.week[6]).toMatchObject({ dayKey: '2026-11-07', count: 1 })
  })

  it('同一天取最新一条作为当天心情标识', () => {
    const stats = computeArchiveStats(
      [
        record('r-morning', new Date(2026, 10, 7, 8, 0), { mood: 'joy' }),
        record('r-night', new Date(2026, 10, 7, 20, 0), { mood: 'sad' }),
      ],
      NOW,
    )
    expect(stats.week[6]).toMatchObject({ count: 2, mood: 'sad' })
  })

  it('心情分布保持色板顺序并给出主导心情', () => {
    const stats = computeArchiveStats(
      [
        record('a', new Date(2026, 10, 6), { mood: 'calm' }),
        record('b', new Date(2026, 10, 6), { mood: 'calm' }),
        record('c', new Date(2026, 10, 5), { mood: 'joy' }),
      ],
      NOW,
    )
    expect(stats.moodCounts.map((entry) => entry.count)).toEqual([1, 2, 0, 0, 0, 0])
    expect(dominantMood(stats.moodCounts)).toMatchObject({ mood: 'calm', count: 2 })
  })

  it('主导心情并列时取色板靠前者', () => {
    const stats = computeArchiveStats(
      [
        record('a', new Date(2026, 10, 6), { mood: 'tired' }),
        record('b', new Date(2026, 10, 5), { mood: 'joy' }),
      ],
      NOW,
    )
    expect(dominantMood(stats.moodCounts)).toMatchObject({ mood: 'joy', count: 1 })
  })

  it('标签按计数降序，同计数按配置顺序', () => {
    const stats = computeArchiveStats(
      [
        record('a', new Date(2026, 10, 6), { tags: ['study', 'rest'] }),
        record('b', new Date(2026, 10, 5), { tags: ['study'] }),
        record('c', new Date(2026, 10, 4), { tags: ['rest', 'life'] }),
      ],
      NOW,
    )
    expect(stats.tagCounts.map((entry) => [entry.tag, entry.count])).toEqual([
      ['study', 2],
      ['rest', 2],
      ['life', 1],
    ])
  })

  it('关键词按计数降序，最多十二个', () => {
    const words = ['休息', '睡眠', '放松', '完成感', '疲惫', '压力', '紧张', '焦虑', '开心', '兴奋', '期待', '难过', '委屈', '孤独']
    const records = words.map((word, index) =>
      record(`k-${index}`, new Date(2026, 10, 6), { keywords: [word, '休息'] }),
    )
    const stats = computeArchiveStats(records, NOW)
    expect(stats.keywordCounts).toHaveLength(12)
    expect(stats.keywordCounts[0]).toEqual({ word: '休息', count: 15 })
    expect(stats.keywordCounts.slice(1).every((entry) => entry.count === 1)).toBe(true)
  })

  it('无效时间戳的记录被跳过而不是让统计崩掉', () => {
    const stats = computeArchiveStats(
      [record('bad', new Date(2026, 10, 6), { createdAt: 'not-a-date' })],
      NOW,
    )
    expect(stats.total).toBe(0)
    expect(stats.weekTotal).toBe(0)
  })

  it('首末记录时间取自真实 createdAt', () => {
    const first = new Date(2026, 8, 1, 9, 0)
    const latest = new Date(2026, 10, 7, 21, 30)
    const stats = computeArchiveStats(
      [record('late', latest), record('early', first)],
      NOW,
    )
    expect(stats.firstAt).toBe(first.toISOString())
    expect(stats.latestAt).toBe(latest.toISOString())
  })
})
