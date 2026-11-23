import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import {
  bakeGroundField,
  dryRadiusAt,
  groundRadiusAt,
  isDryGround,
  SEA_CREST,
} from '@/features/planet/lib/groundField'
import { buildPlanetGeometry, sampleSurface, SEA_SURFACE } from '@/features/planet/lib/terrain'

function dirAt(i: number, n: number): THREE.Vector3 {
  const y = 1 - (i / (n - 1)) * 2
  const ring = Math.sqrt(Math.max(0, 1 - y * y))
  const a = i * 2.399963229728653
  return new THREE.Vector3(Math.cos(a) * ring, y, Math.sin(a) * ring)
}

describe('groundField', () => {
  const field = bakeGroundField(9, 192)

  it('同尺寸烘焙逐格一致（确定性）', () => {
    expect(bakeGroundField(9, 96).radii).toEqual(bakeGroundField(9, 96).radii)
  })

  it('烘出的就是渲染网格那层地皮：与射线求交 oracle 吻合', () => {
    const mesh = new THREE.Mesh(buildPlanetGeometry(9))
    ;(mesh.material as THREE.MeshBasicMaterial).side = THREE.DoubleSide
    const ray = new THREE.Raycaster()
    ray.far = 10
    for (let i = 0; i < 40; i++) {
      const dir = dirAt(i * 7 + 3, 300)
      ray.set(new THREE.Vector3(0, 0, 0), dir)
      const hit = ray.intersectObject(mesh)[0]
      expect(hit, `方向 ${i} 应命中网格`).toBeTruthy()
      /* 双线性会把面片棱线磨平一点，容差取一个面片起伏的量级 */
      expect(Math.abs(groundRadiusAt(field, dir) - hit.distance)).toBeLessThan(0.006)
    }
    mesh.geometry.dispose()
    ;(mesh.material as THREE.Material).dispose()
  })

  it('深海低于海平面、高原高于海壳', () => {
    let checkedSea = 0
    let checkedLand = 0
    for (let i = 0; i < 300; i++) {
      const dir = dirAt(i, 300)
      const e = sampleSurface(dir).elevation
      if (e < -0.15) {
        expect(groundRadiusAt(field, dir)).toBeLessThan(SEA_SURFACE)
        checkedSea++
      } else if (e > 0.3) {
        expect(groundRadiusAt(field, dir)).toBeGreaterThan(SEA_CREST)
        checkedLand++
      }
    }
    expect(checkedSea).toBeGreaterThan(10)
    expect(checkedLand).toBeGreaterThan(10)
  })

  it('八邻干地半径不高于脚下半径', () => {
    for (let i = 0; i < 60; i++) {
      const dir = dirAt(i * 5 + 1, 300)
      expect(dryRadiusAt(field, dir)).toBeLessThanOrEqual(groundRadiusAt(field, dir) + 1e-9)
    }
  })

  it('干地判断：深海不过、高原过', () => {
    const sea = dirAt(0, 300)
    let seaDir = sea
    for (let i = 0; i < 300; i++) {
      const d = dirAt(i, 300)
      if (sampleSurface(d).elevation < -0.2) {
        seaDir = d
        break
      }
    }
    let landDir = sea
    for (let i = 0; i < 300; i++) {
      const d = dirAt(i, 300)
      if (sampleSurface(d).elevation > 0.4) {
        landDir = d
        break
      }
    }
    expect(isDryGround(field, seaDir, 0.004)).toBe(false)
    expect(isDryGround(field, landDir, 0.008)).toBe(true)
  })

  it('接缝两侧读数连续：u≈0 与 u≈1 是同一块地', () => {
    const a = new THREE.Vector3(-1, 0.2, 0.0001).normalize()
    const b = new THREE.Vector3(-1, 0.2, -0.0001).normalize()
    expect(Math.abs(groundRadiusAt(field, a) - groundRadiusAt(field, b))).toBeLessThan(0.004)
  })
})