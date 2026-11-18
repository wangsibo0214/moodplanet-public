import { describe, expect, it } from 'vitest'

import { evaluateUnlocks } from '@/features/planet/growth.config'
import type { PlanetGrowth } from '@/types/mood'

import { menuActionLock } from './menuAccess'

const growth = (interactions: number, unlocks: string[] = []): PlanetGrowth => ({
  totalSaved: 0,
  interactions,
  unlocks,
})

describe('menuActionLock', () => {
  it('挥手在解锁前带锁，提示写明门槛', () => {
    expect(menuActionLock('wave', growth(0))).toEqual({ hint: '互动 12 次解锁' })
    expect(menuActionLock('wave', growth(11))).toEqual({ hint: '互动 12 次解锁' })
  })

  it('第 12 次互动重算解锁后挥手开闸', () => {
    const reached = growth(12)
    reached.unlocks = evaluateUnlocks(reached)
    expect(menuActionLock('wave', reached)).toBeNull()
  })

  it('信 unlocks 列表：存值已含挥手时即使计数被改小也不收回', () => {
    expect(menuActionLock('wave', growth(0, ['companion-wave']))).toBeNull()
  })

  it('其余五个菜单动作天生自由，零互动也不带锁', () => {
    for (const kind of ['hop', 'sit', 'sleep', 'dance', 'heart'] as const) {
      expect(menuActionLock(kind, growth(0))).toBeNull()
    }
  })
})