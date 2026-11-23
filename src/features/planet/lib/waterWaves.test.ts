import { describe, expect, it } from 'vitest'

import {
  WAVE_AMPLITUDE,
  WAVE_TERMS,
  buildWaveGLSL,
  waveHeight,
} from '@/features/planet/lib/waterWaves'

const dirs = Array.from({ length: 200 }, (_, i) => {
  const theta = i * 0.37
  const phi = Math.acos(1 - (2 * (i + 0.5)) / 200)
  return {
    x: Math.sin(phi) * Math.cos(theta),
    y: Math.cos(phi),
    z: Math.sin(phi) * Math.sin(theta),
  }
})

describe('waterWaves', () => {
  it('浪高在任何方向任何时刻都不超出幅度预算', () => {
    for (const dir of dirs) {
      for (const t of [0, 1.3, 7.7, 100]) {
        expect(Math.abs(waveHeight(dir, t))).toBeLessThanOrEqual(WAVE_AMPLITUDE + 1e-9)
      }
    }
  })

  it('海面不是平面：方向之间确有高度差', () => {
    const heights = dirs.map((dir) => waveHeight(dir, 2.5))
    const spread = Math.max(...heights) - Math.min(...heights)
    expect(spread).toBeGreaterThan(WAVE_AMPLITUDE * 0.5)
  })

  it('同方向同时刻读数相同（确定性）', () => {
    expect(waveHeight(dirs[7], 4.2)).toBe(waveHeight(dirs[7], 4.2))
  })

  it('GLSL 与 CPU 共用同一份常量', () => {
    const glsl = buildWaveGLSL()
    for (const term of WAVE_TERMS) {
      expect(glsl).toContain(term.freq.toFixed(1))
    }
    expect(glsl).toContain(String(WAVE_AMPLITUDE))
    expect(glsl.match(/sin\(/g)).toHaveLength(WAVE_TERMS.length)
  })
})