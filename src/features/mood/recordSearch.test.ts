import { describe, expect, it } from 'vitest'

import { recordSearchFields } from '@/features/mood/recordSearch'
import type { MoodRecord } from '@/types/mood'

const record: MoodRecord = {
  id: 'r1',
  mood: 'joy',
  content: '今天去公园跑步',
  tags: ['exercise', 'life'],
  keywords: ['跑步', '阳光'],
  theme: '运动后的轻松',
  feedback: '保持这个节奏',
  suggestion: '记得拉伸',
  planet: null,
  analyzed: true,
  createdAt: '2026-11-19T09:00:00.000Z',
  updatedAt: '2026-11-19T09:00:00.000Z',
}

describe('recordSearchFields', () => {
  const fields = recordSearchFields(record)
  const haystack = fields.join('\n')

  it('只把用户写的正文放进检索', () => {
    expect(fields).toContain('今天去公园跑步')
    expect(fields).toHaveLength(3)
  })

  it('带上格式化时间，便于按时间词检索', () => {
    expect(haystack.includes('2026')).toBe(true)
    expect(haystack.includes('11 月')).toBe(true)
  })

  it('本地解读生成的主题、反馈、建议与关键词不进检索', () => {
    for (const machineText of ['运动后的轻松', '保持这个节奏', '记得拉伸', '阳光']) {
      expect(haystack.includes(machineText)).toBe(false)
    }
  })

  it('心情名与标签中文名不进检索，搜的是文字本身', () => {
    for (const label of ['开心', '运动', '生活']) {
      expect(haystack.includes(label)).toBe(false)
    }
  })

  it('正文为空时也不回落到主题、关键词或心情名', () => {
    const blank = recordSearchFields({
      ...record,
      content: '',
      theme: '被小事点亮的一天',
      keywords: ['愉悦'],
    })
    const blankHaystack = blank.join('\n')
    expect(blankHaystack.includes('被小事点亮的一天')).toBe(false)
    expect(blankHaystack.includes('愉悦')).toBe(false)
    expect(blank).toHaveLength(3)
  })
})
