import { describe, expect, it } from 'vitest'

import {
  DAY_KEYWORD_LIMIT,
  daySummaryLine,
  recordValence,
  sentimentOf,
  synthesizeDayText,
  synthesizeTodayText,
} from '@/features/planet/daySummary'
import type { MoodRecord } from '@/types/mood'

const DAY = '2026-11-19'

function makeRecord(overrides: Partial<MoodRecord> = {}): MoodRecord {
  return {
    id: 'r1',
    mood: 'calm',
    content: '',
    tags: [],
    keywords: [],
    theme: '',
    feedback: '',
    suggestion: '',
    planet: null,
    analyzed: false,
    createdAt: '2026-11-19T09:00:00+08:00',
    updatedAt: '2026-11-19T09:00:00+08:00',
    ...overrides,
  }
}

describe('synthesizeDayText', () => {
  it('当天没有有效记录时返回 null', () => {
    expect(synthesizeDayText([], DAY)).toBeNull()
    expect(synthesizeDayText([makeRecord({ createdAt: '2026-11-18T09:00:00+08:00' })], DAY)).toBeNull()
  })

  it('聚合当天全部记录，而不是只看最后一条', () => {
    const records = [
      makeRecord({ id: 'a', theme: '甲', createdAt: '2026-11-19T08:00:00+08:00' }),
      makeRecord({ id: 'b', theme: '乙', createdAt: '2026-11-19T09:00:00+08:00' }),
      makeRecord({ id: 'c', theme: '甲', createdAt: '2026-11-19T10:00:00+08:00' }),
      makeRecord({ id: 'other', createdAt: '2026-11-18T09:00:00+08:00' }),
    ]
    const summary = synthesizeDayText(records, DAY)
    expect(summary?.total).toBe(3)
    expect(summary?.themes.map((t) => t.theme)).toEqual(['甲', '乙'])
  })

  it('主题取文字 theme 的频次，而不是心情标题的频次', () => {
    const records = [
      makeRecord({ id: 'a', mood: 'calm', theme: '被小事点亮的一天' }),
      makeRecord({ id: 'b', mood: 'calm', theme: '被小事点亮的一天' }),
      makeRecord({ id: 'c', mood: 'joy', theme: '任务完成后的放松与满足' }),
    ]
    const summary = synthesizeDayText(records, DAY)
    expect(summary?.topTheme).toBe('被小事点亮的一天')
    expect(summary?.themes[0].count).toBe(2)
  })

  it('主题次数并列时取较晚记录的主题', () => {
    const records = [
      makeRecord({ id: 'a', theme: '早', createdAt: '2026-11-19T08:00:00+08:00' }),
      makeRecord({ id: 'b', theme: '晚', createdAt: '2026-11-19T10:00:00+08:00' }),
    ]
    expect(synthesizeDayText(records, DAY)?.topTheme).toBe('晚')
  })

  it('关键词跨记录合并计频，点名数不超过上限', () => {
    const records = ['跑步', '散步', '运动', '放松', '休息'].map((word, index) =>
      makeRecord({ id: `r${index}`, keywords: ['开心', word] }),
    )
    const summary = synthesizeDayText(records, DAY)
    expect(summary?.keywords[0]).toEqual({ keyword: '开心', count: 5 })
    expect(summary?.topKeywords.length).toBe(DAY_KEYWORD_LIMIT)
  })

  it('跳过分析的记录不贡献主题与关键词，但仍计入总数与心情配价', () => {
    const records = [
      makeRecord({ id: 'a', mood: 'joy', analyzed: false }),
      makeRecord({ id: 'b', mood: 'calm', analyzed: true, theme: 'T', keywords: ['开心'] }),
    ]
    const summary = synthesizeDayText(records, DAY)
    expect(summary?.total).toBe(2)
    expect(summary?.analyzedTotal).toBe(1)
    expect(summary?.themes).toEqual([{ theme: 'T', count: 1 }])
    expect(summary?.score).toBe(1)
  })

  it('同输入两次结果逐位一致', () => {
    const records = [
      makeRecord({ id: 'a', mood: 'joy', theme: 'T', keywords: ['开心'] }),
      makeRecord({ id: 'b', mood: 'sad', theme: 'U', keywords: ['难过'] }),
    ]
    expect(synthesizeDayText(records, DAY)).toEqual(synthesizeDayText(records, DAY))
  })
})

describe('文字配价与整体倾向', () => {
  it('正向心情 + 正向关键词判为偏正向', () => {
    const summary = synthesizeDayText([makeRecord({ mood: 'joy', keywords: ['开心', '感动'] })], DAY)
    expect(summary?.sentiment).toBe('positive')
  })

  it('负向心情 + 负向关键词判为偏负向', () => {
    const summary = synthesizeDayText([makeRecord({ mood: 'sad', keywords: ['难过', '孤独'] })], DAY)
    expect(summary?.sentiment).toBe('negative')
  })

  it('平静且无文字信号时判为中性', () => {
    expect(synthesizeDayText([makeRecord({ mood: 'calm' })], DAY)?.sentiment).toBe('neutral')
  })

  it('文字能把心情先验拉回来：开心心情但满纸负向词不算偏正向', () => {
    const summary = synthesizeDayText([makeRecord({ mood: 'joy', keywords: ['难过', '压力'] })], DAY)
    expect(summary?.score).toBe(0)
    expect(summary?.sentiment).toBe('neutral')
  })

  it('平静心情但文字负向时判为偏负向，而非照心情说中性', () => {
    const summary = synthesizeDayText([makeRecord({ mood: 'calm', keywords: ['难过'] })], DAY)
    expect(summary?.sentiment).toBe('negative')
  })

  it('recordValence 落在 [-2, 2]，关键词取平均而非累加', () => {
    const many = makeRecord({ mood: 'sad', keywords: ['难过', '委屈', '孤独', '压力'] })
    expect(recordValence(many)).toBe(-2)
    const mixed = makeRecord({ mood: 'calm', keywords: ['开心', '难过'] })
    expect(recordValence(mixed)).toBe(0)
  })

  it('sentimentOf 阈值边界：±0.25 之内算中性', () => {
    expect(sentimentOf(0.25)).toBe('neutral')
    expect(sentimentOf(-0.25)).toBe('neutral')
    expect(sentimentOf(0.26)).toBe('positive')
    expect(sentimentOf(-0.26)).toBe('negative')
  })
})

describe('daySummaryLine', () => {
  it('有主题时点主题，不报心情标题频次', () => {
    const summary = synthesizeDayText([makeRecord({ theme: '被小事点亮的一天', mood: 'joy' })], DAY)
    const line = daySummaryLine(summary!)
    expect(line).toContain('今天共 1 条记录')
    expect(line).toContain('被小事点亮的一天')
    expect(line).toContain('整体偏正向')
    expect(line).not.toContain('开心')
  })

  it('无主题但有关键词时点关键词', () => {
    const summary = synthesizeDayText([makeRecord({ keywords: ['跑步'] })], DAY)
    expect(daySummaryLine(summary!)).toContain('跑步')
  })

  it('既无主题也无关键词时只报条数与倾向', () => {
    const summary = synthesizeDayText([makeRecord()], DAY)
    expect(daySummaryLine(summary!)).toBe('今天共 1 条记录，整体偏中性。')
  })
})

describe('synthesizeTodayText', () => {
  it('按本地日键取今天', () => {
    const now = new Date('2026-11-19T12:00:00+08:00')
    const records = [makeRecord({ createdAt: '2026-11-19T08:00:00+08:00', theme: 'T' })]
    expect(synthesizeTodayText(records, now)?.dayKey).toBe(DAY)
    expect(synthesizeTodayText([], now)).toBeNull()
  })
})