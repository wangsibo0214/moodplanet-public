import { describe, expect, it } from 'vitest'

import {
  DRIFT_AMPLITUDE,
  ORBIT_SPEED_MAX,
  ORBIT_SPEED_MIN,
  SCATTER_RADIUS_MAX,
  SCATTER_RADIUS_MIN,
  SCATTER_TILT_MAX,
  orbitSpeed,
  scatterOrbit,
  starDrift,
} from './starLayout'

const TAU = Math.PI * 2

/** 与场景一致的朝向换算：外层 Euler(tiltX,0,tiltZ) → 内层绕 Y 转 phase → 局部 +X 半径 */
function direction(seed: number): [number, number, number] {
  const o = scatterOrbit(seed)
  const cp = Math.cos(o.phase)
  const sp = Math.sin(o.phase)
  let v: [number, number, number] = [o.radius * cp, 0, -o.radius * sp]
  const cz = Math.cos(o.tiltZ)
  const sz = Math.sin(o.tiltZ)
  v = [v[0] * cz - v[1] * sz, v[0] * sz + v[1] * cz, v[2]]
  const cx = Math.cos(o.tiltX)
  const sx = Math.sin(o.tiltX)
  return [v[0], v[1] * cx - v[2] * sx, v[1] * sx + v[2] * cx]
}

const SEEDS = Array.from({ length: 300 }, (_, i) => (i * 2654435761 + 1013904223) >>> 0)

describe('scatterOrbit', () => {
  it('同一 seed 永远同一散点位', () => {
    expect(scatterOrbit(123456789)).toEqual(scatterOrbit(123456789))
  })

  it('不同 seed 给出不同散点位', () => {
    expect(scatterOrbit(1)).not.toEqual(scatterOrbit(2))
  })

  it('半径/经度/纬度都落在约定区间内', () => {
    for (const seed of SEEDS) {
      const o = scatterOrbit(seed)
      expect(o.radius).toBeGreaterThanOrEqual(SCATTER_RADIUS_MIN)
      expect(o.radius).toBeLessThanOrEqual(SCATTER_RADIUS_MAX)
      expect(o.phase).toBeGreaterThanOrEqual(0)
      expect(o.phase).toBeLessThan(TAU)
      expect(Math.abs(o.tiltX)).toBeLessThanOrEqual(SCATTER_TILT_MAX)
      expect(Math.abs(o.tiltZ)).toBeLessThanOrEqual(SCATTER_TILT_MAX)
    }
  })

  it('与仓储 coerceOrbit 的夹取区间兼容：读盘不会被夹回旧值', () => {
    for (const seed of SEEDS) {
      const o = scatterOrbit(seed)
      expect(o.radius).toBeGreaterThanOrEqual(1.3)
      expect(o.radius).toBeLessThanOrEqual(1.9)
      expect(Math.abs(o.tiltX)).toBeLessThanOrEqual(0.9)
      expect(Math.abs(o.tiltZ)).toBeLessThanOrEqual(0.9)
    }
  })

  it('不共面：纬度既有接近赤道也有明显偏上偏下的星', () => {
    const lats = SEEDS.map((seed) => {
      const v = direction(seed)
      return Math.asin(v[1] / Math.hypot(...v))
    })
    expect(Math.max(...lats.map(Math.abs))).toBeGreaterThan(0.4)
    expect(Math.min(...lats.map(Math.abs))).toBeLessThan(0.1)
  })

  it('不共圆周：半径连续分散而不是几个固定值', () => {
    const radii = new Set(SEEDS.map((seed) => scatterOrbit(seed).radius.toFixed(3)))
    expect(radii.size).toBeGreaterThan(100)
  })

  it('经度绕星球铺满一整圈而不是挤在一侧', () => {
    const lons = SEEDS.map((seed) => {
      const v = direction(seed)
      return Math.atan2(v[2], v[0])
    }).sort((a, b) => a - b)
    let maxGap = lons[0] + TAU - lons[lons.length - 1]
    for (let i = 1; i < lons.length; i++) maxGap = Math.max(maxGap, lons[i] - lons[i - 1])
    expect(maxGap).toBeLessThan(Math.PI / 2)
  })
})

describe('starDrift', () => {
  it('三轴位移都不超过幅度，整体有界', () => {
    for (const seed of SEEDS.slice(0, 50)) {
      for (let t = 0; t < 120; t += 7) {
        const d = starDrift(seed, t)
        for (const axis of d) expect(Math.abs(axis)).toBeLessThanOrEqual(DRIFT_AMPLITUDE)
        expect(Math.hypot(...d)).toBeLessThanOrEqual(DRIFT_AMPLITUDE * Math.sqrt(3))
      }
    }
  })

  it('同一 seed 同一时刻结果确定', () => {
    expect(starDrift(42, 3.5)).toEqual(starDrift(42, 3.5))
  })

  it('不同 seed 的游走路径不同', () => {
    expect(starDrift(1, 10)).not.toEqual(starDrift(2, 10))
  })

  it('路径不是绕星球的圆：到原点距离随时间变化', () => {
    const norms: number[] = []
    for (let t = 0; t < 200; t += 5) norms.push(Math.hypot(...starDrift(7, t)))
    expect(Math.max(...norms) - Math.min(...norms)).toBeGreaterThan(0.01)
  })

  it('随时间缓慢移动而不是静止', () => {
    const a = starDrift(7, 10)
    const b = starDrift(7, 14)
    expect(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])).toBeGreaterThan(0.001)
  })
})

describe('orbitSpeed', () => {
  it('同一 seed 永远同一角速度，刷新后运动节奏不变', () => {
    expect(orbitSpeed(123456789)).toBe(orbitSpeed(123456789))
  })

  it('角速度落在缓慢区间内且为正（同向公转，不会倒着走）', () => {
    for (const seed of SEEDS) {
      const s = orbitSpeed(seed)
      expect(s).toBeGreaterThanOrEqual(ORBIT_SPEED_MIN)
      expect(s).toBeLessThanOrEqual(ORBIT_SPEED_MAX)
      expect(s).toBeGreaterThan(0)
    }
  })

  it('不同 seed 的速度连续分散：星与星节奏各异，不会齐步走成环', () => {
    const speeds = new Set(SEEDS.map((seed) => orbitSpeed(seed).toFixed(4)))
    expect(speeds.size).toBeGreaterThan(100)
    expect(orbitSpeed(1)).not.toBe(orbitSpeed(2))
  })

  it('公转只改角度不改半径：任意时刻到星球中心的距离恒等于轨道半径', () => {
    for (const seed of SEEDS.slice(0, 50)) {
      const o = scatterOrbit(seed)
      const speed = orbitSpeed(seed)
      for (const t of [0, 13.7, 61, 200]) {
        const angle = o.phase + t * speed
        const cp = Math.cos(angle)
        const sp = Math.sin(angle)
        let v: [number, number, number] = [o.radius * cp, 0, -o.radius * sp]
        const cz = Math.cos(o.tiltZ)
        const sz = Math.sin(o.tiltZ)
        v = [v[0] * cz - v[1] * sz, v[0] * sz + v[1] * cz, v[2]]
        const cx = Math.cos(o.tiltX)
        const sx = Math.sin(o.tiltX)
        v = [v[0], v[1] * cx - v[2] * sx, v[1] * sx + v[2] * cx]
        expect(Math.hypot(...v)).toBeCloseTo(o.radius, 10)
      }
    }
  })

  it('角度随时间连续推进：相邻时刻的位移小而平滑，不瞬移', () => {
    const seed = 7
    const o = scatterOrbit(seed)
    const speed = orbitSpeed(seed)
    const step = 1 / 60
    const a = o.phase + 10 * speed
    const b = o.phase + (10 + step) * speed
    expect(b - a).toBeCloseTo(speed * step, 12)
    expect(b - a).toBeLessThan(0.003)
  })
})