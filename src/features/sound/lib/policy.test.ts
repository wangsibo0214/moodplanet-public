import { describe, expect, it } from 'vitest'

import { COOLDOWN_MS, MAX_VOICES, canPlay, resolveVoice } from '@/features/sound/lib/policy'
import type { SoundName } from '@/features/sound/lib/synth'

describe('同音冷却', () => {
  it('没播过就放行', () => {
    expect(canPlay(undefined, 1000, 'click')).toBe(true)
  })

  it('间隔不足拒绝，恰好到点放行', () => {
    const gap = COOLDOWN_MS.bubble
    expect(canPlay(1000, 1000 + gap - 1, 'bubble')).toBe(false)
    expect(canPlay(1000, 1000 + gap, 'bubble')).toBe(true)
  })

  it('每种音效各自计时，互不牵连', () => {
    expect(canPlay(1000, 1010, 'click')).toBe(false)
    expect(canPlay(undefined, 1010, 'pop')).toBe(true)
  })
})

describe('声部上限', () => {
  const voice = (name: SoundName, startedAt: number) => ({ name, startedAt })

  it('没满就直接放行', () => {
    const voices = [voice('click', 0), voice('pop', 1)]
    expect(resolveVoice(voices, 'bell')).toEqual({ kind: 'ok' })
  })

  it('满了挤掉优先级不高于来者里最老的一声', () => {
    const voices = [
      voice('bell', 0),
      voice('click', 5),
      voice('pop', 9),
      voice('click', 12),
    ]
    /* bell 与 chime 同级（3），也在可挤范围内：最老的是 0 号 bell */
    expect(resolveVoice(voices, 'chime')).toEqual({ kind: 'steal', index: 0 })
  })

  it('来者优先级低时只挤更低级的，不动同级提醒音', () => {
    const voices = [voice('bell', 0), voice('click', 5), voice('pop', 9), voice('click', 12)]
    expect(resolveVoice(voices, 'bubble')).toEqual({ kind: 'steal', index: 1 })
  })

  it('同级之间也挤最老的', () => {
    const voices = [voice('pop', 3), voice('pop', 1), voice('pop', 8), voice('pop', 5)]
    expect(resolveVoice(voices, 'pop')).toEqual({ kind: 'steal', index: 1 })
  })

  it('在播的全是更高优先级时放弃来者，不打断提醒音', () => {
    const voices = [voice('bell', 0), voice('success', 1), voice('chime', 2), voice('sparkle', 3)]
    expect(resolveVoice(voices, 'click')).toEqual({ kind: 'drop' })
    expect(resolveVoice(voices, 'whoosh')).toEqual({ kind: 'drop' })
  })

  it('上限就是 4：第 5 声必须经过取舍', () => {
    const voices = Array.from({ length: MAX_VOICES }, (_, i) => voice('click', i))
    expect(resolveVoice(voices, 'click').kind).toBe('steal')
    expect(resolveVoice(voices.slice(0, MAX_VOICES - 1), 'click').kind).toBe('ok')
  })
})
