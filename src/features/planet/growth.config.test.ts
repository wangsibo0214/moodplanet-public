import { describe, expect, it } from 'vitest'

import { UNLOCKS, actionPool, evaluateUnlocks } from '@/features/planet/growth.config'

describe('actionPool', () => {
  it('未解锁动作时只会跳一下，与加挥手之前逐字一致', () => {
    expect(actionPool([])).toEqual(['hop'])
    expect(actionPool(['glow-flower', 'lantern-ring'])).toEqual(['hop'])
  })

  it('只解锁「转个圈」时仍是 hop 与 twirl 两种', () => {
    expect(actionPool(['companion-twirl'])).toEqual(['hop', 'twirl'])
  })

  it('解锁「挥挥手」后多一种可能，未拿到转圈也不会跳过它', () => {
    expect(actionPool(['companion-twirl', 'companion-wave'])).toEqual(['hop', 'twirl', 'wave'])
    expect(actionPool(['companion-wave'])).toEqual(['hop', 'wave'])
  })
})

describe('companion-wave 解锁', () => {
  it('第 12 次互动达标，之前的 11 次不算', () => {
    const owned = (interactions: number) =>
      evaluateUnlocks({ totalSaved: 0, interactions, unlocks: [] }).includes('companion-wave')
    expect(owned(11)).toBe(false)
    expect(owned(12)).toBe(true)
  })

  it('拿到的动作不会被收回去', () => {
    const growth = { totalSaved: 0, interactions: 0, unlocks: ['companion-wave'] }
    expect(evaluateUnlocks(growth)).toContain('companion-wave')
  })

  it('门槛与种类写在解锁表里，成长面板不用改就能显示', () => {
    const wave = UNLOCKS.find((item) => item.id === 'companion-wave')
    expect(wave?.kind).toBe('action')
    expect(wave?.interactions).toBe(12)
    expect(wave?.name).toBe('挥挥手')
  })
})

describe('companion-glow 解锁', () => {
  it('第 20 次互动达标，之前的 19 次不算', () => {
    const owned = (interactions: number) =>
      evaluateUnlocks({ totalSaved: 0, interactions, unlocks: [] }).includes('companion-glow')
    expect(owned(19)).toBe(false)
    expect(owned(20)).toBe(true)
  })

  it('拿到的充电不会被收回去', () => {
    const growth = { totalSaved: 0, interactions: 0, unlocks: ['companion-glow'] }
    expect(evaluateUnlocks(growth)).toContain('companion-glow')
  })

  it('门槛与种类写在解锁表里，成长面板不用改就能显示', () => {
    const glow = UNLOCKS.find((item) => item.id === 'companion-glow')
    expect(glow?.kind).toBe('action')
    expect(glow?.interactions).toBe(20)
    expect(glow?.name).toBe('星光充电')
  })
})

describe('动作池追加 glowPulse', () => {
  it('按解锁顺序排在挥手之后', () => {
    expect(actionPool(['companion-twirl', 'companion-wave', 'companion-glow'])).toEqual([
      'hop',
      'twirl',
      'wave',
      'glowPulse',
    ])
  })

  it('单独解锁充电也不会跳过前面的动作', () => {
    expect(actionPool(['companion-glow'])).toEqual(['hop', 'glowPulse'])
  })

  it('没解锁时仍然是只有 hop，前两个动作的池子不受影响', () => {
    expect(actionPool([])).toEqual(['hop'])
    expect(actionPool(['companion-wave'])).toEqual(['hop', 'wave'])
  })
})

describe('companion-roll 解锁', () => {
  it('第 30 次互动达标，之前的 29 次不算', () => {
    const owned = (interactions: number) =>
      evaluateUnlocks({ totalSaved: 0, interactions, unlocks: [] }).includes('companion-roll')
    expect(owned(29)).toBe(false)
    expect(owned(30)).toBe(true)
  })

  it('拿到的打滚不会被收回去', () => {
    const growth = { totalSaved: 0, interactions: 0, unlocks: ['companion-roll'] }
    expect(evaluateUnlocks(growth)).toContain('companion-roll')
  })

  it('门槛与种类写在解锁表里，成长面板不用改就能显示', () => {
    const roll = UNLOCKS.find((item) => item.id === 'companion-roll')
    expect(roll?.kind).toBe('action')
    expect(roll?.interactions).toBe(30)
    expect(roll?.name).toBe('打个滚')
  })
})

describe('动作池追加 roll', () => {
  it('按解锁顺序排在充电之后，池子共五种', () => {
    expect(
      actionPool(['companion-twirl', 'companion-wave', 'companion-glow', 'companion-roll']),
    ).toEqual(['hop', 'twirl', 'wave', 'glowPulse', 'roll'])
  })

  it('单独解锁打滚也不会跳过前面的动作', () => {
    expect(actionPool(['companion-roll'])).toEqual(['hop', 'roll'])
  })

  it('没拿到打滚时池子还是四个，充电之前的抽中概率不被稀释', () => {
    expect(actionPool(['companion-twirl', 'companion-wave', 'companion-glow'])).toEqual([
      'hop',
      'twirl',
      'wave',
      'glowPulse',
    ])
  })
})
