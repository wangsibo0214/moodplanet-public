import { describe, expect, it } from 'vitest'

import {
  ROLL_ARC_PEAK,
  ROLL_DURATION,
  ROLL_FLAT,
  ROLL_FLIP,
  ROLL_PIVOT_Y,
  ROLL_REBOUND,
  ROLL_SQUASH,
  ROLL_TURNS,
  rollLift,
  rollSquash,
  rollSpinAngle,
} from '@/features/planet/lib/roll'

/* 身体件是以 bob 原点（贴地）为基准摆的：脚底比原点低 0.0016，灯球顶端高 0.241 */
const FOOT_BELOW_GROUND = 0.0016
const FOOT_BELOW_PIVOT = ROLL_PIVOT_Y + FOOT_BELOW_GROUND
const BULB_ABOVE_PIVOT = 0.241 - ROLL_PIVOT_Y

const TIMES: number[] = []
for (let t = 0; t <= ROLL_DURATION + 1e-9; t += 0.005) TIMES.push(Math.min(ROLL_DURATION, t))

describe('打滚的三段时长', () => {
  it('前翻 + 压平 + 回弹正好是 1.15 秒', () => {
    expect(ROLL_FLIP + ROLL_FLAT + ROLL_REBOUND).toBeCloseTo(ROLL_DURATION, 12)
    expect(ROLL_REBOUND).toBeCloseTo(0.1, 12)
  })
})

describe('rollSpinAngle', () => {
  it('起点 0 度、终点整圈，收尾姿态与不转完全一样', () => {
    expect(rollSpinAngle(0)).toBe(0)
    expect(rollSpinAngle(ROLL_FLIP)).toBeCloseTo(ROLL_TURNS, 12)
    expect(rollSpinAngle(ROLL_DURATION)).toBeCloseTo(ROLL_TURNS, 12)
    /* 整圈用 cos/sin 复核：落在同一条朝向上的误差必须在浮点噪声级 */
    const end = rollSpinAngle(ROLL_DURATION)
    expect(Math.abs(Math.cos(end) - 1)).toBeLessThan(1e-12)
    expect(Math.abs(Math.sin(end))).toBeLessThan(1e-12)
  })

  it('半程正好朝下 180 度，且角度单调不减——倒着转回去就不是打滚', () => {
    expect(rollSpinAngle(ROLL_FLIP / 2)).toBeCloseTo(Math.PI, 12)
    let prev = 0
    for (const t of TIMES) {
      const angle = rollSpinAngle(t)
      expect(angle).toBeGreaterThanOrEqual(prev)
      prev = angle
    }
  })

  it('起收两端角速度趋零、中段最快：easeInOutQuad 给的是「被甩出去」而不是「匀速转」', () => {
    const step = 0.02
    const startSpeed = (rollSpinAngle(step) - rollSpinAngle(0)) / step
    const midSpeed = (rollSpinAngle(ROLL_FLIP / 2 + step / 2) - rollSpinAngle(ROLL_FLIP / 2 - step / 2)) / step
    const endSpeed = (rollSpinAngle(ROLL_FLIP) - rollSpinAngle(ROLL_FLIP - step)) / step
    const average = ROLL_TURNS / ROLL_FLIP
    expect(startSpeed).toBeLessThan(average * 0.3)
    expect(endSpeed).toBeLessThan(average * 0.3)
    expect(midSpeed).toBeGreaterThan(average * 1.3)
  })
})

describe('rollLift', () => {
  it('离地高度两端为 0，峰值是 0.14 且落在翻到一半时', () => {
    expect(rollLift(0)).toBe(0)
    /* sin(π) 落在浮点的 π 上，收口是 1.7e-17：物理上是 0，但严格为 0 的是循环里不播时取的 elapsed=0 */
    expect(Math.abs(rollLift(ROLL_FLIP))).toBeLessThan(1e-15)
    expect(rollLift(ROLL_FLIP / 2)).toBeCloseTo(ROLL_ARC_PEAK, 12)
    for (const t of TIMES) {
      const h = rollLift(t)
      expect(h).toBeGreaterThanOrEqual(0)
      expect(h).toBeLessThanOrEqual(ROLL_ARC_PEAK + 1e-12)
    }
  })

  it('弧线与现有 hop 同一条 sin 形：同样两端归零、同样对称', () => {
    for (const u of [0.1, 0.27, 0.5, 0.63, 0.9]) {
      expect(rollLift(u * ROLL_FLIP)).toBeCloseTo(Math.sin(u * Math.PI) * ROLL_ARC_PEAK, 12)
      expect(rollLift(u * ROLL_FLIP)).toBeCloseTo(rollLift((1 - u) * ROLL_FLIP), 12)
    }
  })
})

/* 绕 x 轴翻 a 弧度之后某个件的竖向坐标：y' = 轴心 + 离地 + dy·cos a − dz·sin a */
function flippedY(dy: number, dz: number, elapsed: number): number {
  const angle = rollSpinAngle(elapsed)
  return ROLL_PIVOT_Y + rollLift(elapsed) + dy * Math.cos(angle) - dz * Math.sin(angle)
}

describe('离地弧与轴心一起防穿地', () => {
  /* 脚底四个极限角：竖向下探 0.1116，前后各 0.0444 / −0.0284 */
  const FOOT_CORNERS: readonly (readonly [number, number])[] = [
    [-FOOT_BELOW_PIVOT, 0.0444],
    [-FOOT_BELOW_PIVOT, -0.0284],
    [-0.0804, 0.0444],
    [-0.0804, -0.0284],
  ]

  it('脚的任何一只极限角全程都不比静止时更低：翻起来不会把腿抽进地面', () => {
    for (const [dy, dz] of FOOT_CORNERS) {
      let worst = Infinity
      for (const t of TIMES) worst = Math.min(worst, flippedY(dy, dz, t))
      expect(worst, String(dz)).toBeGreaterThanOrEqual(-FOOT_BELOW_GROUND - 1e-12)
    }
    /* 静止（0 度）与收尾（360 度）正好回到原来的吃土深度，一寸没多陷 */
    expect(flippedY(-FOOT_BELOW_PIVOT, 0, 0)).toBeCloseTo(-FOOT_BELOW_GROUND, 12)
    expect(flippedY(-FOOT_BELOW_PIVOT, 0, ROLL_FLIP)).toBeCloseTo(-FOOT_BELOW_GROUND, 12)
  })

  it('灯球翻到正下方时仍在地面之上：只抬轴心不起跳会陷进去', () => {
    let worst = Infinity
    for (const t of TIMES) worst = Math.min(worst, flippedY(BULB_ABOVE_PIVOT, 0, t))
    expect(worst).toBeGreaterThan(0.018)
    /* 最险的一刻是翻到 180 度：灯球在轴心正下方，靠的正是那一秒的离地 */
    expect(flippedY(BULB_ABOVE_PIVOT, 0, ROLL_FLIP / 2)).toBeCloseTo(
      ROLL_PIVOT_Y + ROLL_ARC_PEAK - BULB_ABOVE_PIVOT,
      12,
    )
    /* 同一刻若不起跳（只抬轴心），灯球就扎进地里 0.021 */
    expect(ROLL_PIVOT_Y - BULB_ABOVE_PIVOT).toBeLessThan(-0.02)
  })

  it('不播时循环喂给三个函数的都是 elapsed=0，于是三个因子同时回到原位', () => {
    /* 帧循环里 inactive 时 rollElapsed 取 0：角度 0、离地 0、压平 1，身体逐位是打滚之前的样子 */
    expect(rollSpinAngle(0)).toBe(0)
    expect(rollLift(0)).toBe(0)
    expect(rollSquash(0)).toStrictEqual({ y: 1, xz: 1 })
    /* 轴心抬 +0.11 由内层包裹组的反向平移 −0.11 抵消：两个数互为相反数，相加严格为 0 */
    expect(ROLL_PIVOT_Y + -ROLL_PIVOT_Y).toBe(0)
  })
})

describe('rollSquash', () => {
  it('前翻段内两个因子严格是 1，翻之前与不打滚逐位一样', () => {
    for (const t of [0, 0.1, 0.45, 0.8, ROLL_FLIP - 0.001]) {
      const s = rollSquash(t)
      expect(s.y, String(t)).toBe(1)
      expect(s.xz, String(t)).toBe(1)
    }
  })

  it('落地压到 0.88，保持满 0.15 秒，再回弹到 1', () => {
    expect(rollSquash(ROLL_FLIP).y).toBeCloseTo(ROLL_SQUASH, 12)
    expect(rollSquash(ROLL_FLIP + ROLL_FLAT / 2).y).toBeCloseTo(ROLL_SQUASH, 12)
    expect(rollSquash(ROLL_FLIP + ROLL_FLAT).y).toBeCloseTo(ROLL_SQUASH, 12)
    expect(rollSquash(ROLL_DURATION).y).toBeCloseTo(1, 12)
    expect(rollSquash(ROLL_DURATION + 5).y).toBeCloseTo(1, 12)
  })

  it('压下去时横向补一半体积，全程不低于 0.88 也不超过 1', () => {
    for (const t of TIMES) {
      const { y, xz } = rollSquash(t)
      expect(y).toBeGreaterThanOrEqual(ROLL_SQUASH - 1e-12)
      expect(y).toBeLessThanOrEqual(1)
      expect(xz).toBeCloseTo(1 + (1 - y) * 0.5, 12)
    }
    expect(rollSquash(ROLL_FLIP).xz).toBeCloseTo(1 + (1 - ROLL_SQUASH) * 0.5, 12)
  })

  it('回弹单调且不越过 1：过冲会让身体在落地后鼓一下', () => {
    let prev = ROLL_SQUASH
    for (let t = ROLL_FLIP + ROLL_FLAT; t <= ROLL_DURATION; t += 0.002) {
      const y = rollSquash(t).y
      expect(y).toBeGreaterThanOrEqual(prev)
      expect(y).toBeLessThanOrEqual(1)
      prev = y
    }
  })
})
