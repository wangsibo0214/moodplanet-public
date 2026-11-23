/**
 * 海边解锁物的动效读数。time 一律取 EnvRuntime.time：
 * calm 时它不推进，光束、小船自然停驻，不另排期任何动作。
 */

/** 光束约 28 秒一圈：比灯环漂移慢，读起来是「扫」而不是「转」。 */
export const BEAM_SPEED = (Math.PI * 2) / 28

export function beamAngle(time: number): number {
  return time * BEAM_SPEED
}

/** 小船起伏：两个错峰正弦叠加，不像机器活塞。 */
export const BOB_AMPLITUDE = 0.0035

export function boatBob(time: number): number {
  return BOB_AMPLITUDE * (Math.sin(time * 0.9) * 0.7 + Math.sin(time * 1.7 + 1.3) * 0.3)
}

export const ROLL_AMPLITUDE = 0.07

export function boatRoll(time: number): number {
  return ROLL_AMPLITUDE * Math.sin(time * 0.8 + 0.6)
}