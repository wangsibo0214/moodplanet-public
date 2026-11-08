import { describe, expect, it } from 'vitest'

import {
  GLOW_DURATION,
  GLOW_PEAK_INTENSITY,
  GLOW_RESTART_MAX,
  GLOW_SQUASH,
  bulbScale,
  chargeAmount,
  chargeScales,
  glowIntensity,
  glowShape,
} from '@/features/planet/lib/glow'

const CHARGE_END = 0.32
const PEAK_AT = 0.44

function samples(from: number, to: number, step: number): number[] {
  const out: number[] = []
  for (let p = from; p <= to + 1e-12; p += step) out.push(Math.min(to, p))
  return out
}

describe('glowShape', () => {
  it('蓄力段完全不亮，亮灯与归零都落在预期时刻', () => {
    for (const p of samples(0, CHARGE_END, 0.02)) expect(glowShape(p), String(p)).toBe(0)
    expect(glowShape(PEAK_AT)).toBeCloseTo(1, 12)
    expect(glowShape(1)).toBe(0)
  })

  it('峰值之前单调升、之后单调降，全程不越过 1 也不为负', () => {
    const rising = samples(0.32, 0.44, 0.005).map(glowShape)
    const falling = samples(0.44, 1, 0.005).map(glowShape)
    expect(rising.every((v, i) => i === 0 || v >= rising[i - 1])).toBe(true)
    expect(falling.every((v, i) => i === 0 || v <= falling[i - 1])).toBe(true)
    for (const p of samples(0, 1, 0.002)) {
      const v = glowShape(p)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })

  it('衰减是指数形而不是直上直下：峰值后半程已经暗掉大半', () => {
    expect(glowShape(0.44 + 0.1)).toBeLessThan(0.5)
    expect(glowShape(0.9)).toBeLessThan(0.06)
  })

  it('单帧 0.05s 内的变化有界，最陡的爬升段也不构成骤闪', () => {
    const step = 0.05 / GLOW_DURATION
    let delta = 0
    for (let p = 0; p + step < 1; p += 0.002) {
      delta = Math.max(delta, Math.abs(glowShape(p + step) - glowShape(p)))
    }
    expect(delta).toBeLessThan(0.5)
  })
})

describe('glowIntensity', () => {
  it('曲线为 0 时逐位等于传进来的静息值，起止都不会闪断', () => {
    for (const base of [0.27, 0.9, 1.0425, 1.2]) {
      expect(glowIntensity(base, 0)).toBe(base)
    }
  })

  it('峰值与心情无关，一律精确落在 2.2', () => {
    for (const base of [0.27, 0.9, 1.0425, 1.2]) {
      expect(glowIntensity(base, 1)).toBeCloseTo(GLOW_PEAK_INTENSITY, 12)
    }
  })

  it('全程不低于静息值：充电是往上加，不是把灯压掉重开', () => {
    for (const base of [0.27, 0.9, 1.2]) {
      for (const shape of samples(0, 1, 0.02)) {
        expect(glowIntensity(base, shape)).toBeGreaterThanOrEqual(base)
      }
    }
  })

  it('峰值高于暖光全开时的静息上界 1.2', () => {
    expect(GLOW_PEAK_INTENSITY).toBeGreaterThan(1.2)
  })
})

describe('chargeAmount 与 chargeScales', () => {
  it('蓄力量在压下去之后保持满档到亮灯，再回弹归零', () => {
    expect(chargeAmount(0)).toBe(0)
    expect(chargeAmount(PEAK_AT)).toBeCloseTo(1, 12)
    expect(chargeAmount(0.56)).toBeCloseTo(0, 12)
    expect(chargeAmount(1)).toBe(0)
  })

  it('不蓄力时两个缩放因子严格是 1，其余心情逐位不变', () => {
    const rest = chargeScales(0)
    expect(rest.y).toBe(1)
    expect(rest.xz).toBe(1)
  })

  it('压满时纵向到 0.94，横向只补一半体积', () => {
    const full = chargeScales(1)
    expect(full.y).toBeCloseTo(GLOW_SQUASH, 12)
    expect(full.xz).toBeCloseTo(1 + (1 - GLOW_SQUASH) * 0.5, 12)
  })

  it('下蹲幅度单帧变化有限，身体不会瞬间塌', () => {
    const step = 0.05 / GLOW_DURATION
    let delta = 0
    for (let p = 0; p + step < 1; p += 0.002) {
      delta = Math.max(delta, Math.abs(chargeAmount(p + step) - chargeAmount(p)))
    }
    expect(delta).toBeLessThan(0.5)
  })
})

describe('连点重播门槛 GLOW_RESTART_MAX', () => {
  it('曲线在门槛以下的只有起收两段：门槛之内才允许从头重播', () => {
    for (const p of samples(0, CHARGE_END, 0.02)) {
      expect(glowShape(p), String(p)).toBeLessThan(GLOW_RESTART_MAX)
    }
    const live = samples(0, 1, 0.002).filter((p) => glowShape(p) >= GLOW_RESTART_MAX)
    /* 已经亮起到收势之前都算「有灯在身」，这一段重播等于把亮着的灯打回静息值 */
    expect(live[0]).toBeGreaterThan(CHARGE_END)
    expect(live[live.length - 1]).toBeLessThan(1)
  })

  it('门槛处放行的最大落差只是整段提升的一成多，连点最坏也不闪', () => {
    for (const base of [0.27, 0.9, 1.2]) {
      const worstDrop = glowIntensity(base, GLOW_RESTART_MAX) - base
      expect(worstDrop).toBeGreaterThan(0)
      expect(worstDrop / (GLOW_PEAK_INTENSITY - base)).toBeLessThan(0.2)
    }
  })
})

describe('bulbScale', () => {
  it('灯球从 1 涨到 1.3 再回到 1，曲线为 0 时逐位是 1', () => {
    expect(bulbScale(0)).toBe(1)
    expect(bulbScale(1)).toBeCloseTo(1.3, 12)
    for (const shape of samples(0, 1, 0.02)) {
      expect(bulbScale(shape)).toBeGreaterThanOrEqual(1)
      expect(bulbScale(shape)).toBeLessThanOrEqual(1.3)
    }
  })
})
