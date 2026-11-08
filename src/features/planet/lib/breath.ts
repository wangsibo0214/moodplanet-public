/**
 * 同频呼吸波形：焦虑时伙伴的待机节律。
 * 6s 一个周期，吸 2.4s / 呼 3.6s——呼气更长，是在邀请用户跟着慢下来。
 * 输出 [-1, 1]：-1 是呼尽、+1 是吸满；峰谷与跨周期衔接处速度为零，不会跳变。
 */

import { softGate, smooth01 } from './gate'

const PERIOD = 6
const INHALE_RATIO = 0.4
/* 门控区间：pulse 只有 anxious(0.18) 能越过上沿，excited(0.1) 不开门 */
const PULSE_MIN = 0.12
const PULSE_MAX = 0.17

/** 焦虑门控：0 关闭、1 完全开启，中间值随环境渐变自然过渡。 */
export function breathGate(pulse: number): number {
  return softGate(pulse, PULSE_MIN, PULSE_MAX)
}

/** time 为场景累计秒数（EnvRuntime.time）；calm 时它不推进，波形自然停驻。 */
export function breathWave(time: number): number {
  const phase = (time % PERIOD) / PERIOD
  const wave =
    phase < INHALE_RATIO
      ? smooth01(phase / INHALE_RATIO)
      : 1 - smooth01((phase - INHALE_RATIO) / (1 - INHALE_RATIO))
  return wave * 2 - 1
}