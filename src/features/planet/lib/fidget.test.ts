import { describe, expect, it } from 'vitest'

import {
  FIDGET_DURATION,
  FIDGET_FIRST_MAX,
  FIDGET_FIRST_MIN,
  FIDGET_GAP_MAX,
  FIDGET_GAP_MIN,
  FIDGET_LIFT,
  FIDGET_RETRY_MAX,
  FIDGET_RETRY_MIN,
  FIDGET_ROLL,
  FIDGET_WAKE_MAX,
  fidgetAmplitude,
  fidgetGate,
  fidgetLiftHeight,
  fidgetRollAngle,
  scheduleFidget,
} from '@/features/planet/lib/fidget'
import { BASELINE, MOOD_ENV } from '@/features/planet/scene/moodEnvironment'
import { between, createRandom } from '@/utils/random'

const IDLE = { calm: false, gate: 1, busy: false, wake: 0 }

describe('fidgetGate', () => {
  it('只有开心与兴奋开门，其余心情与默认夜空都不排期雀跃', () => {
    for (const [mood, spec] of Object.entries(MOOD_ENV)) {
      expect(fidgetGate(spec.starTwinkle), mood).toBe(mood === 'joy' || mood === 'excited' ? 1 : 0)
    }
    expect(fidgetGate(BASELINE.starTwinkle)).toBe(0)
  })

  it('过渡区间内单调介于 0 与 1 之间', () => {
    const mid = fidgetGate(0.175)
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(1)
    expect(fidgetGate(0.16)).toBeLessThan(mid)
    expect(fidgetGate(0.19)).toBeGreaterThan(mid)
  })

  it('与暖光守候不重叠：难过与焦虑这两档都不会又暖光又雀跃', () => {
    expect(fidgetGate(MOOD_ENV.sad.starTwinkle)).toBe(0)
    expect(fidgetGate(MOOD_ENV.anxious.starTwinkle)).toBe(0)
  })
})

describe('fidgetAmplitude', () => {
  it('开心与兴奋同为满幅一档：倍率封顶 1.0，卡片的 ±0.07 才守得住', () => {
    /* excited 的 starTwinkle 是 joy 的 3.4 倍，不封顶就会把规格给的数值乘穿 */
    expect(MOOD_ENV.excited.starTwinkle / MOOD_ENV.joy.starTwinkle).toBeGreaterThan(3)
    expect(fidgetAmplitude(MOOD_ENV.joy.starTwinkle)).toBeCloseTo(1, 12)
    expect(fidgetAmplitude(MOOD_ENV.excited.starTwinkle)).toBeCloseTo(1, 12)
    expect(fidgetRollAngle(0.5, fidgetAmplitude(MOOD_ENV.excited.starTwinkle))).toBeLessThanOrEqual(
      FIDGET_ROLL + 1e-12,
    )
  })

  it('没开门的心情拿到的是 0 而不是近似 0：其它心情逐位不受本批影响', () => {
    for (const [mood, spec] of Object.entries(MOOD_ENV)) {
      if (fidgetGate(spec.starTwinkle) === 0) {
        expect(fidgetAmplitude(spec.starTwinkle), mood).toBe(0)
      }
    }
    expect(fidgetAmplitude(BASELINE.starTwinkle)).toBe(0)
  })

  it('心情正在消退时幅值跟着门控淡出，不在门槛上蹦出整幅', () => {
    let prev = 0
    for (let twinkle = 0.15; twinkle <= 0.2; twinkle += 0.005) {
      const amp = fidgetAmplitude(twinkle)
      expect(amp).toBeLessThanOrEqual(1)
      expect(amp).toBeGreaterThanOrEqual(prev)
      prev = amp
    }
    /* 门才开一条缝时仍有 0.7 的倍率可乘，幅值靠门控本身压到近零 */
    expect(fidgetAmplitude(0.155)).toBeLessThan(0.05)
    expect(fidgetAmplitude(0.19)).toBeLessThan(1)
  })
})

describe('fidgetRollAngle 与 fidgetLiftHeight', () => {
  it('包络两端归零：起止都不在原有公式上留台阶', () => {
    for (const amp of [0.5, 1]) {
      expect(fidgetRollAngle(0, amp)).toBeCloseTo(0, 12)
      expect(fidgetRollAngle(1, amp)).toBeCloseTo(0, 12)
      expect(fidgetLiftHeight(0, amp)).toBeCloseTo(0, 12)
      expect(fidgetLiftHeight(1, amp)).toBeCloseTo(0, 12)
    }
  })

  it('一次雀跃是四个半波，读作左右两摇', () => {
    const runs: number[] = []
    for (let p = 0.02; p < 1; p += 0.005) {
      const s = Math.sign(fidgetRollAngle(p, 1))
      if (s !== 0 && s !== runs[runs.length - 1]) runs.push(s)
    }
    expect(runs.length).toBe(4)
  })

  it('摇摆不超卡片的 ±0.07', () => {
    let peak = 0
    for (let p = 0; p <= 1; p += 0.001) {
      peak = Math.max(peak, Math.abs(fidgetRollAngle(p, 1)))
    }
    expect(peak).toBeLessThanOrEqual(FIDGET_ROLL + 1e-9)
  })

  it('半个小跳是现有 hop 峰值 0.09 的四成，并随心情倍率缩放', () => {
    expect(FIDGET_LIFT).toBeCloseTo(0.09 * 0.4, 12)
    expect(fidgetLiftHeight(0.5, 1)).toBeCloseTo(FIDGET_LIFT, 12)
    expect(fidgetLiftHeight(0.5, 0.6)).toBeCloseTo(FIDGET_LIFT * 0.6, 12)
  })

  it('单帧 0.05s 的角位移有界：dt 钳位下最坏也只是小角度', () => {
    const step = 0.05 / FIDGET_DURATION
    let delta = 0
    for (let p = 0; p + step < 1; p += 0.001) {
      delta = Math.max(delta, Math.abs(fidgetRollAngle(p + step, 1) - fidgetRollAngle(p, 1)))
    }
    expect(delta).toBeLessThan(0.12)
  })
})

describe('scheduleFidget', () => {
  it('减动效、门控关闭、还没到点都不动，也不把已排好的时刻改掉', () => {
    const rng = createRandom(0x1234)
    const cases = [
      { ...IDLE, gate: 1, time: 500, nextAt: 400, calm: true },
      { ...IDLE, gate: 0, time: 500, nextAt: 400 },
      { ...IDLE, gate: 0.4, time: 300, nextAt: 400 },
    ]
    for (const input of cases) {
      const plan = scheduleFidget({ ...input, random: rng })
      expect(plan.fire, JSON.stringify(input)).toBe(false)
      expect(plan.nextAt, JSON.stringify(input)).toBe(input.nextAt)
    }
  })

  it('到点又空闲：放行，并把下一次排到 120–240 秒之后', () => {
    const plan = scheduleFidget({
      ...IDLE,
      gate: 1,
      time: 100,
      nextAt: 99.5,
      random: createRandom(7),
    })
    expect(plan.fire).toBe(true)
    expect(plan.nextAt).toBeGreaterThanOrEqual(100 + FIDGET_GAP_MIN)
    expect(plan.nextAt).toBeLessThan(100 + FIDGET_GAP_MAX)
  })

  it('有正式动作在身就顺延 1.2–2.4 秒再看：不放行，也不把长间隔烧掉', () => {
    const plan = scheduleFidget({
      ...IDLE,
      gate: 1,
      busy: true,
      time: 100,
      nextAt: 99.5,
      random: createRandom(7),
    })
    expect(plan.fire).toBe(false)
    expect(plan.nextAt).toBeGreaterThanOrEqual(100 + FIDGET_RETRY_MIN)
    expect(plan.nextAt).toBeLessThan(100 + FIDGET_RETRY_MAX)
    /* 顺延之后再试仍然受同一套规则约束，不会因为刚被点醒就漏进来 */
    const again = scheduleFidget({
      ...IDLE,
      gate: 1,
      time: plan.nextAt,
      nextAt: plan.nextAt,
      random: createRandom(9),
    })
    expect(again.fire).toBe(true)
  })

  it('刚被点醒的余温里不插队：wake 过 0.3 挡住，压到它以下才放行', () => {
    const blocked = scheduleFidget({
      ...IDLE,
      gate: 1,
      wake: FIDGET_WAKE_MAX + 0.01,
      time: 100,
      nextAt: 99,
      random: createRandom(7),
    })
    expect(blocked.fire).toBe(false)
    const allowed = scheduleFidget({
      ...IDLE,
      gate: 1,
      wake: FIDGET_WAKE_MAX - 0.01,
      time: 100,
      nextAt: 99,
      random: createRandom(7),
    })
    expect(allowed.fire).toBe(true)
  })

  it('规则本身是纯函数：同一颗种子两次算出的排期逐位相同', () => {
    const first = scheduleFidget({
      ...IDLE,
      gate: 1,
      time: 60,
      nextAt: 59,
      random: createRandom(0xa11ce),
    })
    const second = scheduleFidget({
      ...IDLE,
      gate: 1,
      time: 60,
      nextAt: 59,
      random: createRandom(0xa11ce),
    })
    expect(second).toStrictEqual(first)
  })
})

describe('调度常量', () => {
  it('间隔按「每小时最多 30 次」的上限口径给', () => {
    expect(3600 / FIDGET_GAP_MIN).toBeLessThanOrEqual(30)
    expect(3600 / ((FIDGET_GAP_MIN + FIDGET_GAP_MAX) / 2)).toBeLessThanOrEqual(30)
    expect(3600 / FIDGET_GAP_MAX).toBeGreaterThan(10)
  })

  it('单次短于 0.6 秒，且短到数不清两段', () => {
    expect(FIDGET_DURATION).toBeLessThan(0.6)
    expect(FIDGET_DURATION).toBeGreaterThan(0.4)
  })

  it('首次落在 4–9 秒之间：不必等两分钟，也不是每次打开都在同一秒', () => {
    expect(FIDGET_FIRST_MIN).toBeGreaterThan(0)
    expect(FIDGET_FIRST_MAX).toBeLessThan(FIDGET_GAP_MIN)
    const seeds = [0xb1f00, 0xf1d99, 0x51, 0x52, 0x53, 0x54, 0x55, 0x56]
    const firstAt = seeds.map((seed) =>
      between(createRandom(seed), FIDGET_FIRST_MIN, FIDGET_FIRST_MAX),
    )
    for (const at of firstAt) {
      expect(at).toBeGreaterThanOrEqual(FIDGET_FIRST_MIN)
      expect(at).toBeLessThan(FIDGET_FIRST_MAX)
    }
    expect(new Set(firstAt.map((at) => Math.floor(at))).size).toBeGreaterThan(1)
  })
})
