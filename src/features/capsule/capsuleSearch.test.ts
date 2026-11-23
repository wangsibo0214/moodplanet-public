import { describe, expect, it } from 'vitest'

import { capsuleSearchFields } from '@/features/capsule/capsuleSearch'
import type { TimeCapsule } from '@/types/capsule'

const base: TimeCapsule = {
  id: 'c1',
  title: '给一年后的自己',
  content: '这是一段沉睡的正文',
  createdAt: '2026-11-19T09:00:00.000Z',
  unlockAt: '2027-11-19T09:00:00.000Z',
  status: 'sealed',
  openedAt: null,
}

describe('capsuleSearchFields', () => {
  it('封存中：标题、状态、日期可搜，正文绝不进入', () => {
    const fields = capsuleSearchFields(base, 'sealed')
    expect(fields).toContain('给一年后的自己')
    expect(fields).toContain('封存中')
    expect(fields.some((f) => f.includes('2026'))).toBe(true)
    expect(fields).not.toContain('这是一段沉睡的正文')
    expect(fields.join('\n')).not.toContain('沉睡的正文')
  })

  it('待开启：正文同样不进入', () => {
    const fields = capsuleSearchFields(base, 'ready')
    expect(fields).toContain('待开启')
    expect(fields.join('\n')).not.toContain('沉睡的正文')
  })

  it('已开启：正文与开启时间才可搜', () => {
    const opened: TimeCapsule = { ...base, status: 'opened', openedAt: '2027-11-19T10:00:00.000Z' }
    const fields = capsuleSearchFields(opened, 'opened')
    expect(fields).toContain('已开启')
    expect(fields).toContain('这是一段沉睡的正文')
  })
})