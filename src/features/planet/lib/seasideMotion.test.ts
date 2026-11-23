import { describe, expect, it } from 'vitest'

import {
  BEAM_SPEED,
  BOB_AMPLITUDE,
  ROLL_AMPLITUDE,
  beamAngle,
  boatBob,
  boatRoll,
} from '@/features/planet/lib/seasideMotion'

describe('seasideMotion', () => {
  it('光束匀速：28 秒恰好一圈', () => {
    expect(beamAngle(0)).toBe(0)
    expect(beamAngle(28)).toBeCloseTo(Math.PI * 2, 9)
    expect(BEAM_SPEED).toBeCloseTo((Math.PI * 2) / 28, 12)
  })

  it('起伏与横摇任何时刻不超出幅度', () => {
    for (let t = 0; t < 60; t += 0.7) {
      expect(Math.abs(boatBob(t))).toBeLessThanOrEqual(BOB_AMPLITUDE + 1e-9)
      expect(Math.abs(boatRoll(t))).toBeLessThanOrEqual(ROLL_AMPLITUDE + 1e-9)
    }
  })

  it('同时刻读数相同：calm 冻结 env.time 即静止', () => {
    expect(beamAngle(3.3)).toBe(beamAngle(3.3))
    expect(boatBob(3.3)).toBe(boatBob(3.3))
    expect(boatRoll(3.3)).toBe(boatRoll(3.3))
  })

  it('小船不是单频活塞：零点有相位偏移', () => {
    expect(boatBob(0)).not.toBe(0)
    expect(boatRoll(0)).not.toBe(0)
  })
})