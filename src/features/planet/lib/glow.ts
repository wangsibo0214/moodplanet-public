import { smooth01 } from './gate'

/**
 * 星光充电的算术：一次「下蹲蓄力 → 点亮触角灯 → 回弹」的仪式。
 *
 * 三段全部按归一化 progress（0–1）定义，两端都回到 0，
 * 所以动作开始与结束都不会在现有公式上留下台阶。
 */

/** 蓄力段结束、灯光开始爬升的分界 */
const CHARGE_END = 0.32
/** 灯光峰值时刻 */
const PEAK_AT = 0.44
/** 末段强制归零的窗口，保证最后一帧落在 0 */
const TAPER = 0.1
/** 峰值之后的指数衰减率（按归一化时间） */
const DECAY = 7

/** 整个动作的时长（秒） */
export const GLOW_DURATION = 1.4

/** 触角灯的峰值强度 */
export const GLOW_PEAK_INTENSITY = 2.2

/** 灯球峰值放大倍率 */
export const GLOW_BULB_SCALE = 1.3

/** 蓄力时下蹲到的纵向比例 */
export const GLOW_SQUASH = 0.94

/**
 * 连点时允许从头重播的门槛：曲线还在这个值以下才重启。
 * 否则一帧之内亮度会从峰值被打回静息值，恰好是设计卡要避免的骤闪。
 * 峰值段最陡的一帧大约走 0.44，取 0.15 等于「爬升段还没起势」才允许重播。
 */
export const GLOW_RESTART_MAX = 0.15

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/**
 * 灯光曲线 0→1→0：蓄力段保持 0，随后爬到 1，从峰值时刻起指数衰减。
 * 衰减不是纯指数——末段再乘一个归零窗，否则动作结束时会有一个看得见的断口。
 */
export function glowShape(progress: number): number {
  const p = clamp01(progress)
  if (p <= CHARGE_END) return 0
  if (p <= PEAK_AT) return smooth01((p - CHARGE_END) / (PEAK_AT - CHARGE_END))
  return Math.exp(-DECAY * (p - PEAK_AT)) * smooth01((1 - p) / TAPER)
}

/** 蓄力量 0→1→0：前半段压下去，亮灯之后回弹 */
export function chargeAmount(progress: number): number {
  const p = clamp01(progress)
  if (p <= CHARGE_END) return smooth01(p / CHARGE_END)
  return 1 - smooth01((p - PEAK_AT) / (PEAK_AT - CHARGE_END))
}

/**
 * 灯的强度落在它此刻的静息值之上，而不是从 0 起跳。
 * 这样 A3 的暖光地板与这次脉冲天然接得上：起止都回到静息值，峰值仍精确是 2.2。
 */
export function glowIntensity(base: number, shape: number): number {
  return base + (GLOW_PEAK_INTENSITY - base) * shape
}

export function bulbScale(shape: number): number {
  return 1 + (GLOW_BULB_SCALE - 1) * shape
}

/** 下蹲：纵向压到 GLOW_SQUASH，横向按同样比例补一点体积；charge=0 时两个因子都是 1 */
export function chargeScales(charge: number): { y: number; xz: number } {
  const squeeze = (1 - GLOW_SQUASH) * clamp01(charge)
  return { y: 1 - squeeze, xz: 1 + squeeze * 0.5 }
}
