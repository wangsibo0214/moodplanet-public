import { describe, expect, it } from 'vitest'

import { breathGate, breathWave } from '@/features/planet/lib/breath'
import { BASELINE, MOOD_ENV } from '@/features/planet/scene/moodEnvironment'

describe('breathWave', () => {
  it('起点是呼尽（-1），2.4s 时吸满（+1）', () => {
    expect(breathWave(0)).toBe(-1)
    expect(breathWave(2.4)).toBeCloseTo(1, 10)
  })

  it('6s 一个周期，周期末回到呼尽', () => {
    expect(breathWave(6)).toBe(-1)
    expect(breathWave(5.999)).toBeCloseTo(-1, 4)
    for (const t of [0.3, 1.2, 2.4, 3.1, 4.2, 5.5]) {
      expect(breathWave(t + 6)).toBeCloseTo(breathWave(t), 10)
    }
  })

  it('吸气段单调上升，呼气段单调下降', () => {
    for (let t = 0; t < 2.3; t += 0.1) {
      expect(breathWave(t + 0.1)).toBeGreaterThan(breathWave(t))
    }
    for (let t = 2.5; t < 5.9; t += 0.1) {
      expect(breathWave(t + 0.1)).toBeLessThan(breathWave(t))
    }
  })

  it('整个周期值域不超过 [-1, 1]', () => {
    for (let t = 0; t < 6; t += 0.05) {
      const w = breathWave(t)
      expect(w).toBeGreaterThanOrEqual(-1)
      expect(w).toBeLessThanOrEqual(1)
    }
  })

  it('吸气与呼气的中点都回到 0', () => {
    expect(breathWave(1.2)).toBeCloseTo(0, 10)
    expect(breathWave(4.2)).toBeCloseTo(0, 10)
  })

  it('峰谷与周期衔接处速度为零，不会跳变', () => {
    expect(Math.abs(breathWave(0.01) - breathWave(0))).toBeLessThan(0.001)
    expect(Math.abs(breathWave(2.41) - breathWave(2.4))).toBeLessThan(0.001)
    expect(Math.abs(breathWave(5.99) - breathWave(6))).toBeLessThan(0.001)
  })
})

describe('breathGate', () => {
  it('仅焦虑完全开启，其余心情与默认夜空都不开门', () => {
    for (const [mood, spec] of Object.entries(MOOD_ENV)) {
      expect(breathGate(spec.pulse), mood).toBe(mood === 'anxious' ? 1 : 0)
    }
    expect(breathGate(BASELINE.pulse)).toBe(0)
  })

  it('过渡区间内单调介于 0 与 1 之间', () => {
    const mid = breathGate(0.145)
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(1)
    expect(breathGate(0.13)).toBeLessThan(mid)
    expect(breathGate(0.16)).toBeGreaterThan(mid)
  })
})