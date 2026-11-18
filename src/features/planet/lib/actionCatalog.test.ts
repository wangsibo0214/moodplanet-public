import { describe, expect, it } from 'vitest'

import { actionPool, UNLOCK_MAP } from '@/features/planet/growth.config'
import type { CompanionActionKind } from '@/types/mood'

import { ACTION_CATALOG } from './actionCatalog'

const ALL_KINDS: CompanionActionKind[] = [
  'hop',
  'sit',
  'sleep',
  'dance',
  'heart',
  'wave',
  'twirl',
  'glowPulse',
  'roll',
]

describe('ACTION_CATALOG', () => {
  it('九个动作各列一次，不多不少', () => {
    expect(ACTION_CATALOG.map((e) => e.kind).sort()).toEqual([...ALL_KINDS].sort())
  })

  it('自由五动作标 menu 且不带解锁 id', () => {
    const menu = ACTION_CATALOG.filter((e) => e.source === 'menu')
    expect(menu.map((e) => e.kind)).toEqual(['hop', 'sit', 'sleep', 'dance', 'heart'])
    expect(menu.every((e) => e.unlockId === undefined)).toBe(true)
  })

  it('彩蛋四条的解锁 id 与名字跟解锁表一致，且都有互动门槛', () => {
    const poke = ACTION_CATALOG.filter((e) => e.source === 'poke')
    expect(poke).toHaveLength(4)
    for (const entry of poke) {
      const def = UNLOCK_MAP[entry.unlockId ?? '']
      expect(def.kind).toBe('action')
      expect(def.name).toBe(entry.name)
      expect(def.interactions).toBeGreaterThan(0)
    }
  })

  it('彩蛋种类与 actionPool 全解锁时的池子（除打头 hop）一致', () => {
    const poke = ACTION_CATALOG.filter((e) => e.source === 'poke')
    const pool = actionPool(poke.map((e) => e.unlockId ?? ''))
    expect(pool).toEqual(['hop', ...poke.map((e) => e.kind)])
  })
})