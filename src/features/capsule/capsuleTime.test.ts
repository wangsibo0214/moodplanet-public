import { describe, expect, it } from 'vitest'

import { capsuleStatus, formatRemaining, QUICK_UNLOCK_DAYS, unlockDateFor } from './capsuleTime'

const at = (iso: string) => new Date(iso)

describe('capsuleStatus', () => {
  const sealed = { unlockAt: '2026-11-14T10:00:00.000Z', openedAt: null }

  it('到期前一毫秒仍是封存', () => {
    expect(capsuleStatus(sealed, at('2026-11-14T09:59:59.999Z'))).toBe('sealed')
  })

  it('到达开启时刻即为到期', () => {
    expect(capsuleStatus(sealed, at('2026-11-14T10:00:00.000Z'))).toBe('ready')
  })

  it('到期之后保持到期', () => {
    expect(capsuleStatus(sealed, at('2027-01-01T00:00:00.000Z'))).toBe('ready')
  })

  it('开启过就是已开启，哪怕现在早于开启日期', () => {
    const opened = { ...sealed, openedAt: '2026-11-10T00:00:00.000Z' }
    expect(capsuleStatus(opened, at('2026-11-01T00:00:00.000Z'))).toBe('opened')
  })

  it('开启日期读不出来时按封存处理', () => {
    expect(capsuleStatus({ unlockAt: 'not-a-date', openedAt: null }, at('2026-11-14T10:00:00.000Z'))).toBe(
      'sealed',
    )
  })
})

describe('unlockDateFor', () => {
  it('三个快捷档位落在正确的日期', () => {
    const from = at('2026-11-07T21:30:00.000Z')
    expect(unlockDateFor(7, from).toISOString()).toBe('2026-11-14T21:30:00.000Z')
    expect(unlockDateFor(30, from).toISOString()).toBe('2026-12-07T21:30:00.000Z')
    expect(unlockDateFor(90, from).toISOString()).toBe('2027-02-05T21:30:00.000Z')
  })

  it('跨月跨非闰年二月仍保留钟点', () => {
    const from = at('2027-02-28T08:15:00.000Z')
    expect(unlockDateFor(7, from).toISOString()).toBe('2027-03-07T08:15:00.000Z')
  })

  it('快捷档位就是 7 / 30 / 90', () => {
    expect([...QUICK_UNLOCK_DAYS]).toEqual([7, 30, 90])
  })
})

describe('formatRemaining', () => {
  it('零与负数都读作已到开启时间', () => {
    expect(formatRemaining(0)).toBe('已到开启时间')
    expect(formatRemaining(-5_000)).toBe('已到开启时间')
  })

  it('不足一分钟', () => {
    expect(formatRemaining(30_000)).toBe('不到 1 分钟')
  })

  it('分钟档', () => {
    expect(formatRemaining(59 * 60_000)).toBe('59 分钟')
  })

  it('整点与带分钟', () => {
    expect(formatRemaining(60 * 60_000)).toBe('1 小时')
    expect(formatRemaining((2 * 60 + 15) * 60_000)).toBe('2 小时 15 分钟')
  })

  it('整天与带小时', () => {
    expect(formatRemaining(24 * 3_600_000)).toBe('1 天')
    expect(formatRemaining((6 * 24 + 23) * 3_600_000)).toBe('6 天 23 小时')
  })
})
