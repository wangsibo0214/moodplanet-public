import { softGate } from './gate'

/**
 * 暖光守候：难过时触角那盏灯更暖、更不肯暗下去，待机摇摆也安静下来。
 * warmGlow 只有 sad(0.72) 越过上沿；excited(0.4)、joy(0.34)、tired(0.3) 都不开门，
 * 所以疲惫时的打盹语义不受影响。
 */

const WARM_GLOW_MIN = 0.5
const WARM_GLOW_MAX = 0.65

/** 灯色向暖橙插值的系数，乘在门控值上 */
export const ANTENNA_WARM_MIX = 0.6

export function warmGlowGate(warmGlow: number): number {
  return softGate(warmGlow, WARM_GLOW_MIN, WARM_GLOW_MAX)
}

/**
 * 待机横向摇摆角度（bob.rotation.y）。
 * 门控为 0 时逐位等于原来的 `sin(t * 0.4) * 0.12 * (1 - rest)`。
 * 频率减半不能直接改 `sin(t * rate)` 里的 rate：t 累积到几百秒后，rate 的微小变化会把相位甩出去。
 * 所以换成两档正弦按门控交叉淡入淡出，渐变全程相位连续。
 */
export function swayAngle(time: number, warmth: number, rest: number): number {
  const lively = Math.sin(time * 0.4) * 0.12 * (1 - warmth)
  const quiet = Math.sin(time * 0.2) * 0.084 * warmth
  return (lively + quiet) * (1 - rest)
}

/** 触角灯亮度：难过时整体抬升一档，rest 再深也不会把灯完全关掉。 */
export function antennaIntensity(rest: number, breath: number, warmth: number): number {
  return 0.9 * (1 - rest * 0.7) + breath * 0.2 + warmth * 0.3
}
