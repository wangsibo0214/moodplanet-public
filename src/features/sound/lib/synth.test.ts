import { describe, expect, it } from 'vitest'

import {
  SOUND_DURATIONS,
  SOUND_NAMES,
  SOUND_PEAKS,
  SOUND_SAMPLE_RATE,
  renderSound,
} from '@/features/sound/lib/synth'

describe('合成配方', () => {
  it('九种音效齐全，时长与采样数对得上', () => {
    expect(SOUND_NAMES).toHaveLength(9)
    for (const name of SOUND_NAMES) {
      const buf = renderSound(name)
      expect(buf.length).toBe(Math.round(SOUND_DURATIONS[name] * SOUND_SAMPLE_RATE))
    }
  })

  it('样本全部有限，峰值落在轻柔区间且与配方一致', () => {
    for (const name of SOUND_NAMES) {
      const buf = renderSound(name)
      let peak = 0
      for (const sample of buf) {
        expect(Number.isFinite(sample)).toBe(true)
        peak = Math.max(peak, Math.abs(sample))
      }
      expect(peak).toBeCloseTo(SOUND_PEAKS[name], 6)
      expect(peak).toBeLessThanOrEqual(0.35)
    }
  })

  it('首尾淡边：第一帧与最后一帧必须是 0，不会爆音', () => {
    for (const name of SOUND_NAMES) {
      const buf = renderSound(name)
      expect(buf[0]).toBe(0)
      expect(buf[buf.length - 1]).toBe(0)
    }
  })

  it('确定性：同一种音效两次渲染逐位一致（随机成分已钉种子）', () => {
    for (const name of SOUND_NAMES) {
      expect(renderSound(name)).toEqual(renderSound(name))
    }
  })

  it('中段确实有声音，不是静音缓冲', () => {
    for (const name of SOUND_NAMES) {
      const buf = renderSound(name)
      const middle = buf.subarray(Math.floor(buf.length * 0.2), Math.floor(buf.length * 0.6))
      let energy = 0
      for (const sample of middle) energy += sample * sample
      expect(energy).toBeGreaterThan(1e-4)
    }
  })

  it('自定义采样率也能渲染（manager 用 ctx 采样率重建时不越界）', () => {
    const buf = renderSound('bell', 44100)
    expect(buf.length).toBe(Math.round(SOUND_DURATIONS.bell * 44100))
    expect(buf[buf.length - 1]).toBe(0)
  })
})
