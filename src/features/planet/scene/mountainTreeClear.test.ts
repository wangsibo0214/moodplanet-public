import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { bakeGroundField } from '@/features/planet/lib/groundField'
import { findMountainSites, MOUNTAIN_COUNTS } from '@/features/planet/scene/mountainPlacement'
import { buildLayout } from '@/features/planet/scene/vegetationPlacement'

const pos = new THREE.Vector3()
const quat = new THREE.Quaternion()
const scl = new THREE.Vector3()
const dirOf = (m: THREE.Matrix4) => {
  m.decompose(pos, quat, scl)
  return pos.clone().normalize()
}
/* 树冠最大水平半径，与选址避让同一推导 */
const CANOPY = 0.048 * 1.45

interface Peak {
  dir: THREE.Vector3
  base: number
}

function embedded(trees: THREE.Vector3[], peaks: Peak[]): number {
  let bad = 0
  for (const tree of trees) {
    for (const peak of peaks) {
      if (tree.dot(peak.dir) >= Math.cos(peak.base + CANOPY + 0.01) - 1e-9) {
        bad++
        break
      }
    }
  }
  return bad
}

describe('树不嵌进山体', () => {
  const ground = bakeGroundField(13)

  it('normal：每棵树都落在所有山峰（含侧峰）的 footprint 之外', () => {
    const layout = buildLayout('normal', ground, true, true, true)
    const peaks = findMountainSites(ground, MOUNTAIN_COUNTS.normal).flatMap((s) => [
      s,
      ...s.shoulders,
    ])
    const trees = layout.tree[0].matrices.map(dirOf)
    expect(trees.length).toBeGreaterThan(20)
    expect(embedded(trees, peaks)).toBe(0)
  })

  it('reduced 同样不嵌山', () => {
    const layout = buildLayout('reduced', ground, true, true, true)
    const peaks = findMountainSites(ground, MOUNTAIN_COUNTS.reduced).flatMap((s) => [
      s,
      ...s.shoulders,
    ])
    expect(embedded(layout.tree[0].matrices.map(dirOf), peaks)).toBe(0)
  })

  it('山体避让没有破坏石树分离：石头依旧远离每棵树', () => {
    const layout = buildLayout('normal', ground, true, true, true)
    const trees = layout.tree[0].matrices.map(dirOf)
    const clear = Math.cos(CANOPY + 0.042 * 1.25 * 1.9)
    expect(layout.rock[0].matrices.length).toBeGreaterThanOrEqual(12)
    for (const matrix of layout.rock[0].matrices) {
      const dir = dirOf(matrix)
      for (const tree of trees) expect(dir.dot(tree)).toBeLessThan(clear + 1e-9)
    }
  })
})