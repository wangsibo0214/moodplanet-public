/**
 * 软门控：把某个环境数值落在 [min, max] 的区间折算成 0→1。
 * 行为读取 env.values 现成的键，因此换心情时随环境渐变自动淡入淡出，
 * 伙伴不需要新增任何 store 订阅。
 */

/** 平滑阶跃：两端速度为零，中间单调上升，区间外夹到 0 或 1。 */
export function smooth01(x: number): number {
  const t = Math.min(1, Math.max(0, x))
  return t * t * (3 - 2 * t)
}

export function softGate(value: number, min: number, max: number): number {
  return smooth01((value - min) / (max - min))
}
