import { describe, expect, it } from 'vitest'

import { computeArchiveStats } from '@/features/archive/archiveStats'
import type { MoodKey, MoodRecord } from '@/types/mood'

const NOW = new Date(2026, 10, 7, 10, 0, 0)

function record(id: string, createdAt: Date, mood: MoodKey): MoodRecord {
  return {
    id,
    mood,
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
  }
}

describe('七天图表的当天心情与星球同一口径', () => {
  it('多数优先：两条开心加一条较晚的难过，当天标识取开心而不是最后一条', () => {
    const stats = computeArchiveStats(
      [
        record('a', new Date(2026, 10, 7, 8, 0), 'joy'),
        record('b', new Date(2026, 10, 7, 12, 0), 'joy'),
        record('c', new Date(2026, 10, 7, 20, 0), 'sad'),
      ],
      NOW,
    )
    expect(stats.week[6]).toMatchObject({ count: 3, mood: 'joy' })
  })

  it('只写一条的日子，当天标识就是那条的心情', () => {
    const stats = computeArchiveStats(
      [record('only', new Date(2026, 10, 7, 9, 0), 'tired')],
      NOW,
    )
    expect(stats.week[6]).toMatchObject({ count: 1, mood: 'tired' })
  })
})