import type { StarOrbit } from '@/types/mood'

const TAU = Math.PI * 2

/** 半径上限留给视锥：再大的话竖直方向的星会贴到画布边缘点不到 */
export const SCATTER_RADIUS_MIN = 1.42
export const SCATTER_RADIUS_MAX = 1.86
/** 与仓储 coerceOrbit 的夹取区间一致；留出极区空白，伙伴所在的星球顶部不放星 */
export const SCATTER_TILT_MAX = 0.9

/** 哈希盐值散列到 [0,1)：同一 seed 永远同一结果，删除别的星不会让这颗跳位 */
function unit(seed: number, salt: number): number {
  const x = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

/**
 * 散点布局：半径、经度、纬度各自独立取随机，星与星不共面也不共圆周。
 * 取代旧的窄球带+黄金角排布——那种排布星多了会围成一圈星环。
 */
export function scatterOrbit(seed: number): StarOrbit {
  return {
    radius: SCATTER_RADIUS_MIN + unit(seed, 1) * (SCATTER_RADIUS_MAX - SCATTER_RADIUS_MIN),
    phase: unit(seed, 2) * TAU,
    tiltX: (unit(seed, 3) * 2 - 1) * SCATTER_TILT_MAX,
    tiltZ: (unit(seed, 4) * 2 - 1) * SCATTER_TILT_MAX,
  }
}

/** 公转角速度区间（弧度/秒）：一圈约 52~157 秒，缓慢到不抢戏，又肉眼可见在动 */
export const ORBIT_SPEED_MIN = 0.04
export const ORBIT_SPEED_MAX = 0.12

/**
 * 每颗星自己的公转角速度：由记录哈希决定，刷新后不变，星与星各不相同。
 * 场景用 phase + env.time * speed 推进角度——env.time 是场景时钟，
 * 开面板、调大小都不影响它，运动不会跳；calm 时时钟冻结，星自然停住。
 */
export function orbitSpeed(seed: number): number {
  return ORBIT_SPEED_MIN + unit(seed, 9) * (ORBIT_SPEED_MAX - ORBIT_SPEED_MIN)
}

/** 漂移幅度（世界单位）：约几个像素的游走，保持轻盈不抢戏 */
export const DRIFT_AMPLITUDE = 0.05

/**
 * 每颗星自己的缓慢游走：三轴不同频率的正弦叠加，路径不是绕星球的圆。
 * calm 场景不调用，直接取零向量。
 */
export function starDrift(seed: number, t: number): [number, number, number] {
  const f1 = 0.11 + unit(seed, 5) * 0.07
  const f2 = 0.13 + unit(seed, 6) * 0.07
  const p1 = unit(seed, 7) * TAU
  const p2 = unit(seed, 8) * TAU
  return [
    Math.sin(t * f1 + p1) * DRIFT_AMPLITUDE,
    Math.sin(t * f2 + p2) * DRIFT_AMPLITUDE,
    Math.cos(t * f1 * 0.83 + p2) * DRIFT_AMPLITUDE,
  ]
}