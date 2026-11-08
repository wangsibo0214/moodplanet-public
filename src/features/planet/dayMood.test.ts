import { describe, expect, it } from 'vitest'

import { synthesizeDay, synthesizeLatestDay, synthesizeToday } from '@/features/planet/dayMood'
import type { MoodKey, MoodRecord } from '@/types/mood'

const NOW = new Date(2026, 10, 7, 21, 30)

function record(id: string, mood: MoodKey, createdAt: Date | string): MoodRecord {
  const iso = typeof createdAt === 'string' ? createdAt : createdAt.toISOString()
  return {
    id,
    mood,
    content: id,
    tags: [],
    keywords: [],
    theme: '',
    feedback: '',
    suggestion: '',
    planet: null,
    analyzed: false,
    createdAt: iso,
    updatedAt: iso,
  }
}

const at = (day: number, hour: number) => new Date(2026, 10, day, hour, 0)

describe('synthesizeDay', () => {
  it('没有记录时返回 null', () => {
    expect(synthesizeDay([], '2026-11-07')).toBeNull()
  })

  it('只有一条时就是那一条的心情', () => {
    const day = synthesizeDay([record('a', 'sad', at(7, 9))], '2026-11-07')
    expect(day).toMatchObject({ mood: 'sad', total: 1, latestRecordId: 'a' })
    expect(day?.timeline).toEqual(['sad'])
  })

  it('出现次数最多的心情胜出，而不是最后一条', () => {
    const records = [
      record('a', 'joy', at(7, 9)),
      record('b', 'joy', at(7, 13)),
      record('c', 'sad', at(7, 22)),
    ]
    expect(synthesizeDay(records, '2026-11-07')?.mood).toBe('joy')
  })

  it('次数并列时取记录较晚的心情', () => {
    const records = [
      record('a', 'joy', at(7, 9)),
      record('b', 'sad', at(7, 22)),
    ]
    expect(synthesizeDay(records, '2026-11-07')?.mood).toBe('sad')

    const reversed = [
      record('a', 'sad', at(7, 22)),
      record('b', 'joy', at(7, 9)),
    ]
    expect(synthesizeDay(reversed, '2026-11-07')?.mood).toBe('sad')
  })

  it('数组顺序不影响结果，按创建时间排序', () => {
    const records = [
      record('b', 'calm', at(7, 20)),
      record('a', 'calm', at(7, 8)),
      record('c', 'calm', at(7, 14)),
    ]
    const day = synthesizeDay(records, '2026-11-07')
    expect(day?.timeline).toEqual(['calm', 'calm', 'calm'])
    expect(day?.latestRecordId).toBe('b')
  })

  it('只统计当天的记录', () => {
    const records = [
      record('old', 'anxious', at(6, 23)),
      record('a', 'joy', at(7, 9)),
      record('b', 'joy', at(7, 20)),
    ]
    const day = synthesizeDay(records, '2026-11-07')
    expect(day).toMatchObject({ mood: 'joy', total: 2 })
    expect(day?.counts).toEqual([{ mood: 'joy', count: 2 }])
  })

  it('counts 按色板顺序且只含出现过的心情', () => {
    const records = [
      record('a', 'excited', at(7, 9)),
      record('b', 'joy', at(7, 10)),
      record('c', 'joy', at(7, 11)),
    ]
    expect(synthesizeDay(records, '2026-11-07')?.counts).toEqual([
      { mood: 'joy', count: 2 },
      { mood: 'excited', count: 1 },
    ])
  })

  it('跳过无效时间戳', () => {
    const records = [
      record('bad', 'joy', 'not-a-date'),
      record('a', 'calm', at(7, 9)),
    ]
    expect(synthesizeDay(records, '2026-11-07')).toMatchObject({ mood: 'calm', total: 1 })
  })
})

describe('synthesizeLatestDay / synthesizeToday', () => {
  const records = [
    record('y1', 'anxious', at(6, 10)),
    record('y2', 'anxious', at(6, 12)),
    record('t1', 'sad', at(7, 9)),
  ]

  it('今天有记录时综合今天', () => {
    expect(synthesizeLatestDay(records)).toMatchObject({ dayKey: '2026-11-07', mood: 'sad' })
    expect(synthesizeToday(records, NOW)).toMatchObject({ mood: 'sad', total: 1 })
  })

  it('今天没有记录时回落到最近一个有记录的日子', () => {
    const onlyYesterday = records.slice(0, 2)
    expect(synthesizeLatestDay(onlyYesterday)).toMatchObject({
      dayKey: '2026-11-06',
      mood: 'anxious',
    })
    expect(synthesizeToday(onlyYesterday, NOW)).toBeNull()
  })

  it('一条有效记录都没有时返回 null', () => {
    expect(synthesizeLatestDay([])).toBeNull()
    expect(synthesizeToday([], NOW)).toBeNull()
  })
})
