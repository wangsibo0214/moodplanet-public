import { describe, expect, it } from 'vitest'

import { monthLabel, monthWeeks, shiftMonth } from '@/features/archive/calendar'

describe('monthWeeks', () => {
  it('周一开头并补足整周', () => {
    const weeks = monthWeeks(2026, 10)
    expect(weeks.every((week) => week.length === 7)).toBe(true)
    expect(weeks[0][0]).toMatchObject({ dayKey: '2026-10-26', inMonth: false })
    expect(weeks[0][6]).toMatchObject({ dayKey: '2026-11-01', dayNumber: 1, inMonth: true })
    const last = weeks[weeks.length - 1][6]
    expect(last).toMatchObject({ dayKey: '2026-12-06', inMonth: false })
  })

  it('闰年二月包含 29 日', () => {
    const flat = monthWeeks(2024, 1).flat()
    expect(flat.some((day) => day.dayKey === '2024-02-29' && day.inMonth)).toBe(true)
  })

  it('日键连续且不重复', () => {
    const flat = monthWeeks(2026, 1).flat()
    const keys = flat.map((day) => day.dayKey)
    expect(new Set(keys).size).toBe(keys.length)
    for (let index = 1; index < keys.length; index += 1) {
      const prev = new Date(keys[index - 1])
      const next = new Date(keys[index])
      expect(next.getFullYear()).toBe(prev.getFullYear())
      expect(Math.round((next.getTime() - prev.getTime()) / 86400000)).toBe(1)
    }
  })
})

describe('shiftMonth', () => {
  it('跨年翻月', () => {
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 })
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 })
  })
})

describe('monthLabel', () => {
  it('月份从 1 开始展示', () => {
    expect(monthLabel(2026, 10)).toBe('2026 年 11 月')
  })
})
