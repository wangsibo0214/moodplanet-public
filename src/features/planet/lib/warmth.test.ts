import { describe, expect, it } from 'vitest'

import {
  ANTENNA_WARM_MIX,
  antennaIntensity,
  swayAngle,
  warmGlowGate,
} from '@/features/planet/lib/warmth'
import { BASELINE, MOOD_ENV } from '@/features/planet/scene/moodEnvironment'

describe('warmGlowGate', () => {
  it('仅难过完全开启，其余心情与默认夜空都不开门', () => {
    for (const [mood, spec] of Object.entries(MOOD_ENV)) {
      expect(warmGlowGate(spec.warmGlow), mood).toBe(mood === 'sad' ? 1 : 0)
    }
    expect(warmGlowGate(BASELINE.warmGlow)).toBe(0)
  })

  it('过渡区间内单调介于 0 与 1 之间', () => {
    const mid = warmGlowGate(0.575)
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(1)
    expect(warmGlowGate(0.55)).toBeLessThan(mid)
    expect(warmGlowGate(0.6)).toBeGreaterThan(mid)
  })

  it('难过与焦虑的门控不会同时开启', () => {
    for (const spec of Object.values(MOOD_ENV)) {
      expect(warmGlowGate(spec.warmGlow) + (spec.pulse >= 0.17 ? 1 : 0)).toBeLessThanOrEqual(1)
    }
  })
})

describe('swayAngle', () => {
  it('门控关闭时逐位等于原来的摇摆公式', () => {
    for (const rest of [0, 0.1, 0.25, 0.5, 1]) {
      for (let t = 0; t < 12; t += 0.37) {
        expect(swayAngle(t, 0, rest)).toBe(Math.sin(t * 0.4) * 0.12 * (1 - rest))
      }
    }
  })

  it('门控全开时频率减半、幅度七成', () => {
    const peak = Math.PI / 0.2 / 2
    expect(swayAngle(peak, 1, 0)).toBeCloseTo(0.084, 12)
    for (const t of [0.7, 3.3, 9.1, 22.5]) {
      expect(swayAngle(t, 1, 0)).toBeCloseTo(Math.sin(t * 0.2) * 0.084, 12)
      /* 半个周期后回到相反数：0.2 rad/s 的周期是 2π/0.2 */
      expect(swayAngle(t + Math.PI / 0.2, 1, 0)).toBeCloseTo(-Math.sin(t * 0.2) * 0.084, 10)
    }
  })

  it('渐变途中不越出原来的幅度上界', () => {
    for (const warmth of [0, 0.25, 0.5, 0.75, 1]) {
      for (let t = 0; t < 40; t += 0.11) {
        expect(Math.abs(swayAngle(t, warmth, 0))).toBeLessThanOrEqual(0.12 + 1e-12)
      }
    }
  })

  it('相邻帧之间的变化有界：t 很大时直接改频率会甩出跳变，交叉淡入淡出不会', () => {
    const bigT = 4000
    for (const warmth of [0, 0.5, 1]) {
      for (let i = 0; i < 20; i++) {
        const t = bigT + i * 0.05
        const delta = Math.abs(swayAngle(t + 0.05, warmth, 0) - swayAngle(t, warmth, 0))
        /* 幅度 0.12 × 角速度 0.4 × 一帧 0.05s 的上界是 0.0024 */
        expect(delta).toBeLessThan(0.005)
      }
    }
  })
})

describe('antennaIntensity', () => {
  it('门控关闭时逐位等于原来的亮度', () => {
    for (const rest of [0, 0.1, 0.25, 1]) {
      for (const breath of [-1, -0.4, 0, 0.6, 1]) {
        expect(antennaIntensity(rest, breath, 0)).toBe(0.9 * (1 - rest * 0.7) + breath * 0.2)
      }
    }
  })

  it('难过时亮度整体抬升一档，打盹到最深也留得住光', () => {
    expect(antennaIntensity(1, 0, 1)).toBeCloseTo(0.57, 12)
    expect(antennaIntensity(1, 0, 0)).toBeCloseTo(0.27, 12)
    expect(antennaIntensity(0.25, 0, 1)).toBeCloseTo(1.0425, 12)
    expect(antennaIntensity(0, 0, 1)).toBeCloseTo(1.2, 12)
  })

  it('呼吸与暖光两项不会同时生效，上界因此是 1.2', () => {
    /* 门控互斥由 MOOD_ENV 的数值保证：能开 pulse 的开不了 warmGlow */
    for (const [mood, spec] of Object.entries(MOOD_ENV)) {
      const warmth = warmGlowGate(spec.warmGlow)
      const breathing = spec.pulse >= 0.17
      expect(warmth === 1 && breathing, mood).toBe(false)
    }
    for (const rest of [0, 1]) {
      expect(antennaIntensity(rest, 1, 0)).toBeLessThanOrEqual(1.2)
      expect(antennaIntensity(rest, 0, 1)).toBeLessThanOrEqual(1.2)
    }
  })

  it('灯色插值系数是 0.6，门控为 0 时不混色', () => {
    expect(ANTENNA_WARM_MIX).toBe(0.6)
    expect(warmGlowGate(0.4) * ANTENNA_WARM_MIX).toBe(0)
  })
})
