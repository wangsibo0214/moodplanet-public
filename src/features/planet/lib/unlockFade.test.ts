import { describe, expect, it } from 'vitest'

import { fadeStep } from '@/features/planet/lib/unlockFade'

describe('unlockFade', () => {
  it('calm 直接落到目标，两个方向都不排期过渡', () => {
    expect(fadeStep(0, 1, 0.016, true)).toBe(1)
    expect(fadeStep(1, 0, 0.016, true)).toBe(0)
    expect(fadeStep(0.4, 1, 5, true)).toBe(1)
  })

  it('非 calm 单调逼近目标', () => {
    let value = 0
    for (let i = 0; i < 150; i++) {
      const next = fadeStep(value, 1, 0.016, false)
      expect(next).toBeGreaterThan(value)
      expect(next).toBeLessThanOrEqual(1)
      value = next
    }
    expect(value).toBeGreaterThan(0.95)
  })

  it('大 dt 钳到单步 0.05，切回标签页不会瞬移', () => {
    expect(fadeStep(0, 1, 5, false)).toBe(fadeStep(0, 1, 0.05, false))
  })

  it('已在目标值时保持不动', () => {
    expect(fadeStep(1, 1, 0.016, false)).toBe(1)
    expect(fadeStep(0, 0, 0.016, false)).toBe(0)
  })
})