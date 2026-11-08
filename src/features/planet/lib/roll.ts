import { smooth01 } from './gate'

/**
 * 打个滚的算术：一次「离地前翻 → 落地压平 → 回弹」的撒娇。
 *
 * 三段都按已经过秒数（0–ROLL_DURATION）定义，两端都回到「什么都没发生」：
 * 角度落在 360°、离地落在 0、压平落在 1，所以动作起止都不在现有公式上留台阶。
 */

/** 整个动作的时长（秒） */
export const ROLL_DURATION = 1.15

/** 前翻段时长：翻完就已经落地，剩下的秒数留给压平与回弹 */
export const ROLL_FLIP = 0.9

/** 落地后压平保持的时长（秒） */
export const ROLL_FLAT = 0.15

/** 从压平回到原样的时长（秒）；三段相加正好是 ROLL_DURATION */
export const ROLL_REBOUND = ROLL_DURATION - ROLL_FLIP - ROLL_FLAT

/**
 * 旋转轴心的抬高量。
 * 身体各件是以 bob 原点（贴地）为基准摆的，轴心留在原点会翻进地里；
 * 抬到身体中心才翻得开，代价是包裹组要再做一次反向平移把它挪回去。
 */
export const ROLL_PIVOT_Y = 0.11

/** 离地弧线峰值（世界坐标 +Y），与现有 hop 同一条 sin 弧 */
export const ROLL_ARC_PEAK = 0.14

/** 一圈 */
export const ROLL_TURNS = Math.PI * 2

/** 落地压平到的纵向比例 */
export const ROLL_SQUASH = 0.88

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** 前翻段内的归一化进度：翻完之后这一段永远交回 1，角度停在整圈上 */
function flipProgress(elapsed: number): number {
  return clamp(elapsed, 0, ROLL_FLIP) / ROLL_FLIP
}

/**
 * 翻滚角度（弧度）。easeInOutQuad 让起止角速度都是 0，
 * 收尾落在整圈上，与不转是同一个姿态。
 */
export function rollSpinAngle(elapsed: number): number {
  return easeInOutQuad(flipProgress(elapsed)) * ROLL_TURNS
}

/** 离地高度：与 hop 同一条 sin 弧，两端严格为 0 */
export function rollLift(elapsed: number): number {
  return Math.sin(flipProgress(elapsed) * Math.PI) * ROLL_ARC_PEAK
}

/**
 * 落地压平：前翻段内是 1，压平段是 ROLL_SQUASH，回弹段平滑回到 1。
 * 横向按现有下蹲的口径补一半体积，压下去才不像被切掉一层。
 */
export function rollSquash(elapsed: number): { y: number; xz: number } {
  const hold = ROLL_FLIP + ROLL_FLAT
  let y = 1
  if (elapsed >= ROLL_FLIP && elapsed < hold) {
    y = ROLL_SQUASH
  } else if (elapsed >= hold) {
    const back = smooth01(clamp(elapsed - hold, 0, ROLL_REBOUND) / ROLL_REBOUND)
    y = ROLL_SQUASH + (1 - ROLL_SQUASH) * back
  }
  return { y, xz: 1 + (1 - y) * 0.5 }
}
