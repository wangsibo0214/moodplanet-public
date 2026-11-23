/**
 * 解锁淡入进度：解锁是一瞬间的事，出现不该是一瞬间的事。
 * 与萤光浮尘的淡入同形（damp 语义）；calm 时直接落到目标，不排期任何过渡动画。
 */

const MAX_STEP = 0.05

export function fadeStep(
  current: number,
  target: number,
  dt: number,
  calm: boolean,
  lambda = 2.2,
): number {
  if (calm) return target
  const step = Math.min(dt, MAX_STEP)
  const k = 1 - Math.exp(-lambda * step)
  return current + (target - current) * k
}