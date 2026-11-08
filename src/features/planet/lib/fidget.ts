import { between } from '@/utils/random'

import { softGate } from './gate'

/**
 * 雀跃微动作的算术与排期。
 *
 * 它是待机级的自发行为：不进 store、不算互动、不进点击动作池，
 * 只读 env 里已有的 starTwinkle，所以换心情时会跟着环境渐变自动淡出。
 */

/** 只有星光明显闪的心情开门：joy 0.22 / excited 0.75，其余 ≤0.1 */
const TWINKLE_MIN = 0.15
const TWINKLE_MAX = 0.2

/** joy 那一档的闪烁量就是规格给的满幅基准 */
const JOY_TWINKLE = 0.22

/**
 * 幅值倍率封顶在 1.0。
 * 卡片同时写了「幅度正比于 starTwinkle」和「±0.07rad、0.4 倍 hop」，
 * 而 excited 的 0.75 是 joy 的 3.4 倍——两者不可能都成立，这里保住后者的字面上界。
 */
const AMPLITUDE_CAP = 1.0

/** 单次时长（秒）：短到读得出是忍不住，长不到能数清两段 */
export const FIDGET_DURATION = 0.55

/**
 * 两次雀跃之间的间隔（秒）。
 * 设计卡的行為段写 7–12 秒、无障碍段写「每小时约 30 次上限」，两者差一个数量级
 * （7–12 秒等于每小时 300 次以上，读起来是抽搐不是「偶尔」）。
 * 这里取上限口径：120–240 秒一次，最坏正好 30 次/小时，平均 22 次。
 */
export const FIDGET_GAP_MIN = 120
export const FIDGET_GAP_MAX = 240

/** 刚进页面后的第一次雀跃大致在这个时间之后：既不必等两分钟，也不至于每次都是同一秒 */
export const FIDGET_FIRST_MIN = 4
export const FIDGET_FIRST_MAX = 9

/** 被正式动作或刚睡醒挡住时，隔这么久再试一次 */
export const FIDGET_RETRY_MIN = 1.2
export const FIDGET_RETRY_MAX = 2.4

/** 左右轻摇的基准幅值（弧度），还要再乘心情倍率 */
export const FIDGET_ROLL = 0.07

/** 半个小跳的峰值高度：现有 hop 峰值 0.09 的 0.4 倍 */
export const FIDGET_LIFT = 0.036

/** 被点醒后多久之内不插队 */
export const FIDGET_WAKE_MAX = 0.3

export function fidgetGate(starTwinkle: number): number {
  return softGate(starTwinkle, TWINKLE_MIN, TWINKLE_MAX)
}

/**
 * 心情倍率：以 joy 为满幅基准，并且再乘一次门控。
 * 门控项不可省——渐变途中 starTwinkle 刚过 0.15 时门才开了一条缝，
 * 若幅值不跟着淡出，心情正在消退的那一下还会蹦出一个整幅动作。
 */
export function fidgetAmplitude(starTwinkle: number): number {
  return Math.min(AMPLITUDE_CAP, starTwinkle / JOY_TWINKLE) * fidgetGate(starTwinkle)
}

/** 包络两端归零，所以起止不跳变；progress 归一化到 0–1 */
function envelope(progress: number): number {
  return Math.sin(clamp01(progress) * Math.PI)
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/** 左右轻摇两次：四个半波，两头被包络压小，中间最实 */
export function fidgetRollAngle(progress: number, amplitude: number): number {
  return envelope(progress) * Math.sin(progress * Math.PI * 4) * FIDGET_ROLL * amplitude
}

/** 半个小跳：一次起落，峰值高度按心情倍率缩放 */
export function fidgetLiftHeight(progress: number, amplitude: number): number {
  return envelope(progress) * FIDGET_LIFT * amplitude
}

export interface FidgetScheduleInput {
  /** env.time */
  time: number
  calm: boolean
  /** fidgetGate 的结果 */
  gate: number
  /** 有正式动作在身 */
  busy: boolean
  wake: number
  /** 上一次排期落定的时刻 */
  nextAt: number
  random: () => number
}

export interface FidgetSchedule {
  fire: boolean
  nextAt: number
}

/**
 * 排期规则单独抽出来：它决定「什么时候真的动一下」，是 A2 全部行为约束的落点，
 * 留在组件里就只能靠肉眼在浏览器里赌。
 * 到点但被挡住时短延后再试，不放行也不把长间隔烧掉。
 */
export function scheduleFidget(input: FidgetScheduleInput): FidgetSchedule {
  const { time, calm, gate, busy, wake, nextAt, random } = input
  if (calm || gate <= 0 || time < nextAt) return { fire: false, nextAt }
  if (busy || wake > FIDGET_WAKE_MAX) {
    return { fire: false, nextAt: time + between(random, FIDGET_RETRY_MIN, FIDGET_RETRY_MAX) }
  }
  return { fire: true, nextAt: time + between(random, FIDGET_GAP_MIN, FIDGET_GAP_MAX) }
}
