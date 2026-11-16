import { describe, expect, it } from 'vitest'

import {
  DANCE_DURATION,
  HEART_DURATION,
  SLEEP_DURATION,
  SIT_DURATION,
  danceEnvelope,
  dancePose,
  heartLift,
  heartPose,
  sitPose,
  sitSettle,
  sleepDepth,
  sleepPose,
} from '@/features/planet/lib/actions'

function timeline(duration: number, step = 0.005): number[] {
  const times: number[] = []
  for (let t = 0; t <= duration + 1e-9; t += step) times.push(Math.min(duration, t))
  return times
}

describe('sitSettle / sitPose', () => {
  it('两端都回到静息：0 秒与坐满时长时完全一样', () => {
    expect(sitSettle(0)).toBe(0)
    expect(sitSettle(SIT_DURATION)).toBe(0)
    expect(sitSettle(-1)).toBe(0)
    expect(sitSettle(SIT_DURATION + 5)).toBe(0)
    const rest = sitPose(SIT_DURATION)
    expect(rest.sink).toBe(0)
    expect(rest.squashY).toBe(1)
    expect(rest.xz).toBe(1)
    expect(rest.tiltX).toBe(0)
  })

  it('中段坐实：保持段深度为 1，压扁有体积补偿', () => {
    expect(sitSettle(SIT_DURATION / 2)).toBe(1)
    const pose = sitPose(SIT_DURATION / 2)
    expect(pose.squashY).toBeLessThan(1)
    expect(pose.xz).toBeGreaterThan(1)
    expect(pose.sink).toBeGreaterThan(0)
    expect(pose.tiltX).toBeGreaterThan(0)
  })

  it('坐下段单调加深、起身段单调变浅', () => {
    let prev = 0
    for (const t of timeline(SIT_DURATION / 2)) {
      const value = sitSettle(t)
      expect(value).toBeGreaterThanOrEqual(prev)
      prev = value
    }
    prev = 1
    for (const t of timeline(SIT_DURATION)) {
      if (t < SIT_DURATION / 2) continue
      const value = sitSettle(t)
      expect(value).toBeLessThanOrEqual(prev)
      prev = value
    }
  })

  it('全程数值有限且不越界 [0, 1]', () => {
    for (const t of timeline(SIT_DURATION)) {
      const value = sitSettle(t)
      expect(Number.isFinite(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(1)
    }
  })
})

describe('sleepDepth / sleepPose', () => {
  it('两端严格回到清醒', () => {
    expect(sleepDepth(0)).toBe(0)
    expect(sleepDepth(SLEEP_DURATION)).toBe(0)
    const pose = sleepPose(SLEEP_DURATION)
    expect(pose.eyeOpen).toBe(1)
    expect(pose.tiltX).toBe(0)
    expect(pose.glowDim).toBe(0)
    expect(pose.breath).toBeCloseTo(0, 12)
  })

  it('熟睡段闭眼到位、呼吸有起伏', () => {
    const mid = SLEEP_DURATION / 2
    expect(sleepDepth(mid)).toBe(1)
    const pose = sleepPose(mid)
    expect(pose.eyeOpen).toBeCloseTo(0.06, 12)
    expect(pose.tiltX).toBeGreaterThan(0)
    expect(pose.glowDim).toBeGreaterThan(0)
    /* 呼吸是正弦：整段时间里必然出现过明显起伏 */
    let maxBreath = 0
    for (const t of timeline(SLEEP_DURATION)) {
      maxBreath = Math.max(maxBreath, Math.abs(sleepPose(t).breath))
      expect(Number.isFinite(maxBreath)).toBe(true)
    }
    expect(maxBreath).toBeGreaterThan(0.01)
  })

  it('呼吸两端不甩动：临近起止时幅度趋零', () => {
    expect(Math.abs(sleepPose(0.02).breath)).toBeLessThan(0.005)
    expect(Math.abs(sleepPose(SLEEP_DURATION - 0.02).breath)).toBeLessThan(0.005)
  })
})

describe('danceEnvelope / dancePose', () => {
  it('包络两端为 0，中间达到峰值 1', () => {
    expect(danceEnvelope(0)).toBe(0)
    expect(danceEnvelope(DANCE_DURATION)).toBe(0)
    expect(danceEnvelope(DANCE_DURATION / 2)).toBeCloseTo(1, 12)
  })

  it('弹跳永不为负：落地不会沉到地里', () => {
    for (const t of timeline(DANCE_DURATION)) {
      const pose = dancePose(t)
      expect(pose.bounce).toBeGreaterThanOrEqual(0)
      expect(Number.isFinite(pose.bounce)).toBe(true)
      expect(Number.isFinite(pose.sway)).toBe(true)
      expect(Number.isFinite(pose.spin)).toBe(true)
    }
  })

  it('起止姿态与不跳完全一样', () => {
    for (const t of [0, DANCE_DURATION]) {
      const pose = dancePose(t)
      expect(pose.bounce).toBe(0)
      /* 包络在两端严格为 0，乘出来的 ±0 都等于「没有贡献」 */
      expect(Math.abs(pose.sway)).toBe(0)
      expect(Math.abs(pose.spin)).toBe(0)
      expect(Math.abs(pose.arm)).toBe(0)
    }
  })

  it('中段确实动了起来：弹跳、摇摆、拧转都出现过非零值', () => {
    let maxBounce = 0
    let maxSway = 0
    let maxSpin = 0
    for (const t of timeline(DANCE_DURATION)) {
      const pose = dancePose(t)
      maxBounce = Math.max(maxBounce, pose.bounce)
      maxSway = Math.max(maxSway, Math.abs(pose.sway))
      maxSpin = Math.max(maxSpin, Math.abs(pose.spin))
    }
    expect(maxBounce).toBeGreaterThan(0.02)
    expect(maxSway).toBeGreaterThan(0.05)
    expect(maxSpin).toBeGreaterThan(0.2)
  })
})

describe('heartLift / heartPose', () => {
  it('两端放下手', () => {
    expect(heartLift(0)).toBe(0)
    expect(heartLift(HEART_DURATION)).toBe(0)
    const pose = heartPose(HEART_DURATION)
    expect(pose.arm).toBe(0)
    expect(pose.blush).toBe(0)
    expect(pose.tiltZ).toBe(0)
    expect(pose.pulse).toBeCloseTo(0, 12)
  })

  it('举着保持段：手臂到顶、腮红加深', () => {
    const mid = HEART_DURATION / 2
    expect(heartLift(mid)).toBe(1)
    const pose = heartPose(mid)
    expect(pose.arm).toBeGreaterThan(2)
    expect(pose.blush).toBe(1)
    expect(pose.tiltZ).toBeGreaterThan(0)
  })

  it('举手段单调上升、放下段单调下降，全程有限', () => {
    let prev = 0
    for (const t of timeline(HEART_DURATION)) {
      const value = heartLift(t)
      expect(Number.isFinite(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(1)
      if (t <= HEART_DURATION / 2) {
        expect(value).toBeGreaterThanOrEqual(prev)
        prev = value
      }
    }
  })
})
