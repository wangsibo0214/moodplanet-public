import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import {
  SHORE_HIGH,
  SHORE_LOW,
  bakeShoreMask,
  dirToEquirectUV,
  shoreValue,
} from '@/features/planet/lib/shoreMask'
import { sampleSurface } from '@/features/planet/lib/terrain'

function findDir(predicate: (elevation: number) => boolean): THREE.Vector3 {
  const dir = new THREE.Vector3()
  const sample = { elevation: 0, radius: 0 }
  for (let i = 0; i < 4000; i++) {
    const y = 1 - (i / 3999) * 2
    const ring = Math.sqrt(Math.max(0, 1 - y * y))
    const a = i * 2.399963229728653
    dir.set(Math.cos(a) * ring, y, Math.sin(a) * ring)
    sampleSurface(dir, sample)
    if (predicate(sample.elevation)) return dir.clone()
  }
  throw new Error('测试地形里找不到满足条件的方向')
}

describe('shoreMask', () => {
  it('深海掩码低、陆地掩码高', () => {
    const width = 64
    const height = 32
    const mask = bakeShoreMask(width, height)
    const at = (dir: THREE.Vector3): number => {
      const { u, v } = dirToEquirectUV(dir)
      const i = Math.min(width - 1, Math.floor(u * width))
      const j = Math.min(height - 1, Math.floor(v * height))
      return mask[j * width + i]
    }
    expect(at(findDir((e) => e < -0.1))).toBeLessThan(60)
    expect(at(findDir((e) => e > 0.2))).toBeGreaterThan(200)
  })

  it('海岸线（高程≈0）落在泡沫带能拾取的中段', () => {
    const shore = findDir((e) => Math.abs(e) < 0.004)
    const value = shoreValue(sampleSurface(shore).elevation)
    expect(value).toBeGreaterThan(0.38)
    expect(value).toBeLessThan(0.66)
  })

  it('shoreValue 两端夹取', () => {
    expect(shoreValue(SHORE_LOW - 1)).toBe(0)
    expect(shoreValue(SHORE_HIGH + 1)).toBe(1)
  })

  it('UV 往返能还原方向', () => {
    const dir = new THREE.Vector3(0.3, -0.5, 0.81).normalize()
    const { u, v } = dirToEquirectUV(dir)
    const phi = (v - 0.5) * Math.PI
    const theta = (u - 0.5) * Math.PI * 2
    const back = new THREE.Vector3(
      Math.cos(theta) * Math.cos(phi),
      Math.sin(phi),
      Math.sin(theta) * Math.cos(phi),
    )
    expect(back.distanceTo(dir)).toBeLessThan(1e-9)
  })

  it('同尺寸烘焙逐格一致（确定性）', () => {
    expect(bakeShoreMask(48, 24)).toEqual(bakeShoreMask(48, 24))
  })

  it('输出尺寸是宽×高', () => {
    expect(bakeShoreMask(48, 24)).toHaveLength(48 * 24)
  })
})