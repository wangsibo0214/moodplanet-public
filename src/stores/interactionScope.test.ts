import { beforeEach, describe, expect, it } from 'vitest'

import { usePlanetStore } from '@/stores/usePlanetStore'

const growth = (interactions: number, unlocks: string[] = []) => ({
  totalSaved: 0,
  interactions,
  unlocks,
})

beforeEach(() => {
  usePlanetStore.setState({
    growth: growth(0),
    selectedRecordId: null,
    sizedStarId: null,
    companionMenuOpen: false,
    companionLine: null,
    companionAction: null,
  })
})

describe('互动计数口径：只算伙伴互动', () => {
  it('打开星详情不加互动计数，也不推进解锁', () => {
    usePlanetStore.getState().openStar('record-1')
    const state = usePlanetStore.getState()
    expect(state.selectedRecordId).toBe('record-1')
    expect(state.growth.interactions).toBe(0)
    expect(state.growth.unlocks).toEqual([])
  })

  it('历史计数不回溯：存值 736 开星详情后原样保留', () => {
    usePlanetStore.setState({
      growth: growth(736, ['companion-twirl', 'companion-wave', 'companion-glow', 'companion-roll']),
    })
    usePlanetStore.getState().openStar('record-1')
    expect(usePlanetStore.getState().growth.interactions).toBe(736)
  })

  it('关闭星详情不碰计数', () => {
    usePlanetStore.setState({ growth: growth(5) })
    usePlanetStore.getState().openStar(null)
    expect(usePlanetStore.getState().growth.interactions).toBe(5)
  })

  it('戳伙伴加 1 且解锁进度照常走', () => {
    usePlanetStore.setState({ growth: growth(11) })
    usePlanetStore.getState().pokeCompanion()
    const next = usePlanetStore.getState().growth
    expect(next.interactions).toBe(12)
    expect(next.unlocks).toContain('companion-wave')
  })

  it('菜单动作加 1', () => {
    usePlanetStore.getState().performCompanionAction('hop')
    expect(usePlanetStore.getState().growth.interactions).toBe(1)
  })
})