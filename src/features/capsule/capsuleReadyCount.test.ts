import { describe, expect, it } from 'vitest'

import { countReadyCapsules } from './capsuleTime'

const now = new Date('2026-11-24T12:00:00.000Z')
const sealed = { unlockAt: '2026-11-25T12:00:00.000Z', openedAt: null }
const ready = { unlockAt: '2026-11-24T12:00:00.000Z', openedAt: null }
const opened = { unlockAt: '2026-11-20T12:00:00.000Z', openedAt: '2026-11-21T12:00:00.000Z' }

describe('countReadyCapsules', () => {
  it('空列表为 0', () => {
    expect(countReadyCapsules([], now)).toBe(0)
  })

  it('只数到期待开启，不数封存中与已开启', () => {
    expect(countReadyCapsules([sealed, ready, opened], now)).toBe(1)
  })

  it('已开启优先，哪怕开启日期已经过去也不重复计数', () => {
    expect(countReadyCapsules([opened], now)).toBe(0)
  })

  it('开启日期不可读时按封存处理', () => {
    expect(countReadyCapsules([{ unlockAt: 'not-a-date', openedAt: null }], now)).toBe(0)
  })
})
