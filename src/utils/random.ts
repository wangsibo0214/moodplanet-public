/**
 * 固定种子的伪随机数生成器（mulberry32）。
 * 星球上的树、花、星点分布必须在每次渲染时完全一致，
 * 否则刷新页面后地形装饰会漂移，看起来像 bug。
 */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 在 [min, max) 内取一个确定性随机值。 */
export function between(random: () => number, min: number, max: number): number {
  return min + random() * (max - min)
}

/** 从数组中确定性取一项。 */
export function oneOf<T>(random: () => number, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)]
}
