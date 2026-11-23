import { describe, expect, it } from 'vitest'

import {
  UNLOCKS,
  UNLOCK_MAP,
  actionPool,
  evaluateUnlocks,
  nextUnlock,
} from '@/features/planet/growth.config'
import type { PlanetGrowth } from '@/types/mood'

const NEW_IDS = ['glow-mushroom', 'lighthouse', 'pier-boat', 'shimmer-sea'] as const

const at = (totalSaved: number): string[] =>
  evaluateUnlocks({ totalSaved, interactions: 0, unlocks: [] })

const grown = (totalSaved: number): PlanetGrowth => {
  const base = { totalSaved, interactions: 0, unlocks: [] }
  return { ...base, unlocks: evaluateUnlocks(base) }
}

describe('海边成长目录', () => {
  it('四个新项目的种类与门槛写在解锁表里', () => {
    expect(UNLOCK_MAP['glow-mushroom']).toMatchObject({ kind: 'plant', saved: 12, name: '发光蘑菇丛' })
    expect(UNLOCK_MAP['lighthouse']).toMatchObject({ kind: 'decor', saved: 15, name: '守望灯塔' })
    expect(UNLOCK_MAP['pier-boat']).toMatchObject({ kind: 'decor', saved: 18, name: '栈桥小船' })
    expect(UNLOCK_MAP['shimmer-sea']).toMatchObject({ kind: 'decor', saved: 20, name: '粼粼海面' })
  })

  it('植物装饰行从 4 长到 8，动作仍是 4 个', () => {
    expect(UNLOCKS.filter((item) => item.kind !== 'action')).toHaveLength(8)
    expect(UNLOCKS.filter((item) => item.kind === 'action')).toHaveLength(4)
  })

  it('每一项都在门槛当次解锁，前一条不算', () => {
    expect(at(11)).not.toContain('glow-mushroom')
    expect(at(12)).toContain('glow-mushroom')
    expect(at(14)).not.toContain('lighthouse')
    expect(at(15)).toContain('lighthouse')
    expect(at(17)).not.toContain('pier-boat')
    expect(at(18)).toContain('pier-boat')
    expect(at(19)).not.toContain('shimmer-sea')
    expect(at(20)).toContain('shimmer-sea')
  })

  it('拿到的新装饰不会被收回去', () => {
    const owned = evaluateUnlocks({ totalSaved: 0, interactions: 0, unlocks: [...NEW_IDS] })
    for (const id of NEW_IDS) expect(owned).toContain(id)
  })

  it('新装饰不进伙伴动作池', () => {
    expect(actionPool([...NEW_IDS])).toEqual(['hop'])
  })

  it('「再走多远」提示沿新阶梯走，长齐后返回 null', () => {
    expect(nextUnlock(grown(10), ['plant', 'decor'])?.def.id).toBe('glow-mushroom')
    expect(nextUnlock(grown(10), ['plant', 'decor'])?.lack).toBe('再保存 2 条记录')
    expect(nextUnlock(grown(12), ['plant', 'decor'])?.def.id).toBe('lighthouse')
    expect(nextUnlock(grown(15), ['plant', 'decor'])?.def.id).toBe('pier-boat')
    expect(nextUnlock(grown(18), ['plant', 'decor'])?.def.id).toBe('shimmer-sea')
    expect(nextUnlock(grown(18), ['plant', 'decor'])?.lack).toBe('再保存 2 条记录')
    expect(nextUnlock(grown(20), ['plant', 'decor'])).toBeNull()
  })
})