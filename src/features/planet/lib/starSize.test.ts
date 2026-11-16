import { describe, expect, it } from 'vitest'

import {
  STAR_SIZE_DEFAULT,
  STAR_SIZE_MAX,
  STAR_SIZE_MIN,
  TIER_PULSE_SECONDS,
  clampStarSize,
  decayTierPulse,
  smoothStarSize,
  starSizeScale,
  starSizeTier,
  starTierVisuals,
} from './starSize'

describe('clampStarSize', () => {
  it('夹回 50–150 并取整', () => {
    expect(clampStarSize(49)).toBe(STAR_SIZE_MIN)
    expect(clampStarSize(151)).toBe(STAR_SIZE_MAX)
    expect(clampStarSize(100.4)).toBe(100)
    expect(clampStarSize(120.6)).toBe(121)
  })

  it('非法值回到默认 100', () => {
    expect(clampStarSize(Number.NaN)).toBe(STAR_SIZE_DEFAULT)
    expect(clampStarSize('80')).toBe(STAR_SIZE_DEFAULT)
    expect(clampStarSize(undefined)).toBe(STAR_SIZE_DEFAULT)
  })
})

describe('starSizeTier', () => {
  it('50–80 普通', () => {
    expect(starSizeTier(50)).toBe('normal')
    expect(starSizeTier(80)).toBe('normal')
  })

  it('81–120 重要', () => {
    expect(starSizeTier(81)).toBe('important')
    expect(starSizeTier(100)).toBe('important')
    expect(starSizeTier(120)).toBe('important')
  })

  it('121–150 珍藏', () => {
    expect(starSizeTier(121)).toBe('treasured')
    expect(starSizeTier(150)).toBe('treasured')
  })

  it('越界值先夹再分级', () => {
    expect(starSizeTier(10)).toBe('normal')
    expect(starSizeTier(999)).toBe('treasured')
  })
})

describe('starSizeScale', () => {
  it('百分比换算成缩放系数', () => {
    expect(starSizeScale(50)).toBe(0.5)
    expect(starSizeScale(100)).toBe(1)
    expect(starSizeScale(150)).toBe(1.5)
  })
})

describe('starSizeTier 验收边界表', () => {
  it.each([
    [50, 'normal'],
    [80, 'normal'],
    [81, 'important'],
    [100, 'important'],
    [120, 'important'],
    [121, 'treasured'],
    [150, 'treasured'],
  ] as const)('%i%% → %s', (size, tier) => {
    expect(starSizeTier(size)).toBe(tier)
  })
})

describe('starTierVisuals', () => {
  it('重要档就是基线：默认画面逐位不变', () => {
    expect(starTierVisuals(100)).toEqual({ halo: 1, emissive: 1, ring: 1, sparkles: false })
  })

  it('普通档柔光低调，无粒子', () => {
    const v = starTierVisuals(60)
    expect(v.halo).toBeLessThan(1)
    expect(v.emissive).toBeLessThan(1)
    expect(v.ring).toBeLessThan(1)
    expect(v.sparkles).toBe(false)
  })

  it('珍藏档光晕更明显但克制，带细微粒子', () => {
    const v = starTierVisuals(130)
    expect(v.halo).toBeGreaterThan(1)
    expect(v.halo).toBeLessThanOrEqual(1.5)
    expect(v.emissive).toBeGreaterThan(1)
    expect(v.emissive).toBeLessThanOrEqual(1.3)
    expect(v.ring).toBeGreaterThan(1)
    expect(v.sparkles).toBe(true)
  })

  it('越界值先夹再取视觉参数', () => {
    expect(starTierVisuals(10)).toEqual(starTierVisuals(50))
    expect(starTierVisuals(999)).toEqual(starTierVisuals(150))
  })
})

describe('smoothStarSize', () => {
  it('向目标逼近且不 overshoot', () => {
    const next = smoothStarSize(100, 150, 1 / 60)
    expect(next).toBeGreaterThan(100)
    expect(next).toBeLessThan(150)
  })

  it('大 dt 一帧收敛到目标', () => {
    expect(smoothStarSize(50, 150, 1)).toBe(150)
  })

  it('误差足够小时吸附到目标', () => {
    expect(smoothStarSize(149.96, 150, 1 / 60)).toBe(150)
  })

  it('已在目标上保持不变', () => {
    expect(smoothStarSize(100, 100, 1 / 60)).toBe(100)
  })

  it('dt 为 0 或负数时不前进', () => {
    expect(smoothStarSize(100, 150, 0)).toBe(100)
    expect(smoothStarSize(100, 150, -1)).toBe(100)
  })
})

describe('decayTierPulse', () => {
  it('按 TIER_PULSE_SECONDS 线性衰减到 0', () => {
    expect(decayTierPulse(1, TIER_PULSE_SECONDS / 2)).toBeCloseTo(0.5, 5)
    expect(decayTierPulse(1, TIER_PULSE_SECONDS)).toBe(0)
  })

  it('不会衰减成负数', () => {
    expect(decayTierPulse(0.1, 10)).toBe(0)
    expect(decayTierPulse(0, 1 / 60)).toBe(0)
  })

  it('dt 为 0 时保持原值', () => {
    expect(decayTierPulse(0.8, 0)).toBe(0.8)
  })
})