import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { bakeGroundField, dryRadiusAt, SEA_CREST } from '@/features/planet/lib/groundField'
import { sampleSurface } from '@/features/planet/lib/terrain'
import { buildLayout } from '@/features/planet/scene/vegetationPlacement'

const pos = new THREE.Vector3()
const quat = new THREE.Quaternion()
const scl = new THREE.Vector3()

function dirOf(matrix: THREE.Matrix4): THREE.Vector3 {
  matrix.decompose(pos, quat, scl)
  return pos.clone().normalize()
}

function scaleOf(matrix: THREE.Matrix4): THREE.Vector3 {
  matrix.decompose(pos, quat, scl)
  return scl.clone()
}

describe('植被选址：树不再长进水里', () => {
  const ground = bakeGroundField(13)
  const layout = buildLayout('normal', ground, true, true, true)

  it('每棵树的脚下与八邻都高于浪尖加岸线缓冲', () => {
    expect(layout.tree[0].matrices.length).toBeGreaterThan(20)
    for (const matrix of layout.tree[0].matrices) {
      const dir = dirOf(matrix)
      expect(dryRadiusAt(ground, dir)).toBeGreaterThanOrEqual(SEA_CREST + 0.008 - 1e-6)
      /* 解析高程也留在沙滩带之外：岸线读得出是一条沙带而不是一排树 */
      expect(sampleSurface(dir).elevation).toBeGreaterThanOrEqual(0.14)
    }
  })

  it('草与花同样不泡脚', () => {
    for (const matrix of layout.grass[0].matrices) {
      expect(dryRadiusAt(ground, dirOf(matrix))).toBeGreaterThanOrEqual(SEA_CREST + 0.004 - 1e-6)
    }
    for (const matrix of layout.flower[1].matrices) {
      expect(dryRadiusAt(ground, dirOf(matrix))).toBeGreaterThanOrEqual(SEA_CREST + 0.004 - 1e-6)
    }
  })

  it('解锁物也不泡脚', () => {
    for (const matrix of layout.glowFlower[1].matrices) {
      expect(dryRadiusAt(ground, dirOf(matrix))).toBeGreaterThanOrEqual(SEA_CREST + 0.005 - 1e-6)
    }
    for (const matrix of layout.crystal[0].matrices) {
      expect(dryRadiusAt(ground, dirOf(matrix))).toBeGreaterThanOrEqual(SEA_CREST + 0.006 - 1e-6)
    }
    for (const matrix of layout.mushroom[1].matrices) {
      expect(dryRadiusAt(ground, dirOf(matrix))).toBeGreaterThanOrEqual(SEA_CREST + 0.005 - 1e-6)
    }
  })

  it('石块比旧版明显更大：最小的一颗也超过旧版的中位数', () => {
    expect(layout.rock[0].matrices.length).toBeGreaterThanOrEqual(12)
    for (const matrix of layout.rock[0].matrices) {
      const s = scaleOf(matrix)
      /* 旧版世界尺寸上限 0.026*1.15*1.5≈0.045；新版最小一颗也要到 0.044 以上 */
      expect(Math.max(s.x, s.y, s.z)).toBeGreaterThan(0.044)
    }
    expect(layout.rockBuddy[0].matrices.length).toBeGreaterThan(0)
  })

  it('解锁前后既有植被逐位不动：随机数消耗顺序没被新批次打乱', () => {
    const locked = buildLayout('normal', ground, false, false, false)
    for (const key of ['tree', 'grass', 'flower', 'rock'] as const) {
      expect(locked[key][0].matrices.map((m) => m.toArray())).toEqual(
        layout[key][0].matrices.map((m) => m.toArray()),
      )
    }
    expect(locked.glowFlower[0].matrices).toHaveLength(0)
    expect(locked.crystal[0].matrices).toHaveLength(0)
    expect(locked.mushroom[0].matrices).toHaveLength(0)
  })

  it('两次构建逐位一致（确定性）', () => {
    const again = buildLayout('normal', ground, true, true, true)
    expect(again.tree[0].matrices.map((m) => m.toArray())).toEqual(
      layout.tree[0].matrices.map((m) => m.toArray()),
    )
  })

  it('低档位植被更少但同样干地', () => {
    const reduced = buildLayout('reduced', ground, true, true, true)
    expect(reduced.tree[0].matrices.length).toBeLessThan(layout.tree[0].matrices.length)
    for (const matrix of reduced.tree[0].matrices) {
      expect(dryRadiusAt(ground, dirOf(matrix))).toBeGreaterThanOrEqual(SEA_CREST + 0.008 - 1e-6)
    }
  })
})

describe('石头与树分开长', () => {
  const ground = bakeGroundField(13)
  const layout = buildLayout('normal', ground, true, true, true)
  /* 树冠最大水平半径（0.048×1.45）+ 石块最大水平半径（0.042×1.25×1.9），
     与选址里的避让常量同一推导：即使都抽到最大缩放也不该插到一起 */
  const clearDot = Math.cos(0.048 * 1.45 + 0.042 * 1.25 * 1.9)

  it('任意石心到任意树心的角距都大于树冠+石块半径之和', () => {
    const treeDirs = layout.tree[0].matrices.map(dirOf)
    expect(layout.rock[0].matrices.length).toBeGreaterThanOrEqual(12)
    for (const matrix of layout.rock[0].matrices) {
      const dir = dirOf(matrix)
      for (const treeDir of treeDirs) {
        expect(dir.dot(treeDir)).toBeLessThan(clearDot + 1e-9)
      }
    }
  })

  it('伴石也远离树冠', () => {
    const treeDirs = layout.tree[0].matrices.map(dirOf)
    expect(layout.rockBuddy[0].matrices.length).toBeGreaterThan(0)
    for (const matrix of layout.rockBuddy[0].matrices) {
      const dir = dirOf(matrix)
      for (const treeDir of treeDirs) {
        expect(dir.dot(treeDir)).toBeLessThan(clearDot + 1e-9)
      }
    }
  })

  it('低档位同样分离，石头不被筛秃', () => {
    const reduced = buildLayout('reduced', ground, true, true, true)
    const treeDirs = reduced.tree[0].matrices.map(dirOf)
    expect(reduced.rock[0].matrices.length).toBeGreaterThanOrEqual(9)
    for (const matrix of reduced.rock[0].matrices) {
      const dir = dirOf(matrix)
      for (const treeDir of treeDirs) {
        expect(dir.dot(treeDir)).toBeLessThan(clearDot + 1e-9)
      }
    }
  })
})