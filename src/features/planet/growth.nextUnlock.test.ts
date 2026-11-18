import { describe, expect, it } from 'vitest'

import { evaluateUnlocks, nextUnlock } from '@/features/planet/growth.config'
import type { PlanetGrowth } from '@/types/mood'

const growth = (totalSaved: number, interactions: number): PlanetGrowth => ({
  totalSaved,
  interactions,
  unlocks: [],
})

const withUnlocks = (g: PlanetGrowth): PlanetGrowth => ({
  ...g,
  unlocks: evaluateUnlocks(g),
})

describe('nextUnlock 的 kinds 限定', () => {
  it('不限定与限定植物装饰在零进度时一致：下一项是星屑花', () => {
    expect(nextUnlock(growth(0, 0))?.def.id).toBe('glow-flower')
    expect(nextUnlock(growth(0, 0), ['plant', 'decor'])?.def.id).toBe('glow-flower')
  })

  it('跳过未解锁的伙伴动作，落到下一个装饰', () => {
    const g = withUnlocks(growth(3, 0))
    expect(nextUnlock(g)?.def.id).toBe('companion-twirl')
    const next = nextUnlock(g, ['plant', 'decor'])
    expect(next?.def.id).toBe('crystal-cluster')
    expect(next?.lack).toBe('再保存 3 条记录')
  })

  it('装饰长齐后限定返回 null，默认仍会报伙伴动作', () => {
    const g = withUnlocks(growth(10, 0))
    expect(nextUnlock(g)?.def.id).toBe('companion-twirl')
    expect(nextUnlock(g, ['plant', 'decor'])).toBeNull()
  })
})