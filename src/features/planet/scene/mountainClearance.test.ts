import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { bakeGroundField, type GroundField } from '../lib/groundField'
import {
  findMountainSites,
  flattenPeaks,
  MOUNTAIN_COUNTS,
  mountainClearance,
  mountainProfile,
  mountainRiseAboveGround,
} from './mountainPlacement'
import {
  buildLayout,
  mountainClearanceFor,
  mountainZoneExtent,
  type VegetationCategory,
  type VegetationQuality,
} from './vegetationPlacement'

/**
 * 山体避让的验收：11-22 实测「只让树避让山体」是不够的——
 * normal 下有 12/18 颗石头陷在山体里、6 颗整颗看不见，晶石 9 簇全在坡面上、
 * 草 220 根里 47 根埋在半山腰。这里逐类核对两件事：
 * 落点站在按自己外廓解算的避让角距之外，且一个名额都没被避让吃掉。
 */

const CATEGORIES: VegetationCategory[] = [
  'tree',
  'grass',
  'flower',
  'rock',
  'rockBuddy',
  'glowFlower',
  'crystal',
  'mushroom',
]

const TARGETS: Record<VegetationQuality, Record<VegetationCategory, number>> = {
  normal: {
    tree: 64,
    grass: 220,
    flower: 40,
    rock: 18,
    rockBuddy: 13,
    dew: 34,
    glowFlower: 22,
    crystal: 9,
    mushroom: 16,
  },
  reduced: {
    tree: 26,
    grass: 80,
    flower: 14,
    rock: 9,
    rockBuddy: 6,
    dew: 16,
    glowFlower: 12,
    crystal: 5,
    mushroom: 8,
  },
}

/** 部件数组按下标对齐同一个对象，取任一份的位置就是株心/石心 */
function centers(
  layout: ReturnType<typeof buildLayout>,
  category: VegetationCategory,
): THREE.Vector3[] {
  const parts = layout[category]
  return Array.from({ length: parts[0].matrices.length }, (_, i) =>
    new THREE.Vector3().setFromMatrixPosition(parts[0].matrices[i]).normalize(),
  )
}

const angleTo = (a: THREE.Vector3, b: THREE.Vector3) =>
  Math.acos(Math.min(1, Math.max(-1, a.dot(b))))

const toDeg = (radians: number) => ((radians * 180) / Math.PI).toFixed(2)

describe('山体避让逐类生效', () => {
  for (const quality of ['normal', 'reduced'] as VegetationQuality[]) {
    const ground: GroundField = bakeGroundField(13)
    const peaks = flattenPeaks(findMountainSites(ground, MOUNTAIN_COUNTS[quality]))
    const layout = buildLayout(quality, ground, true, true, true)

    it(`${quality}：${peaks.length} 座峰的坡面上没有物件`, () => {
      expect(peaks.length).toBeGreaterThan(0)
      for (const category of CATEGORIES) {
        for (const dir of centers(layout, category)) {
          for (const peak of peaks) {
            const required = mountainClearanceFor(peak, category)
            const actual = angleTo(dir, peak.dir)
            expect(
              actual >= required - 1e-6,
              `${category} 落在峰心 ${toDeg(actual)}°，应 ≥ ${toDeg(required)}°`,
            ).toBe(true)
          }
        }
      }
    })

    it(`${quality}：落点处山面不超过物件高度的一半`, () => {
      for (const category of CATEGORIES) {
        const extent = mountainZoneExtent(category)
        for (const dir of centers(layout, category)) {
          let rise = 0
          for (const peak of peaks) {
            rise = Math.max(rise, mountainRiseAboveGround(peak, angleTo(dir, peak.dir)))
          }
          expect(rise, `${category} 埋进山体`).toBeLessThan(extent.top / 2 + 1e-6)
        }
      }
    })

    it(`${quality}：避让没有吃掉任何一类的名额`, () => {
      for (const category of [...CATEGORIES, 'dew'] as VegetationCategory[]) {
        expect(layout[category][0].matrices.length, category).toBe(TARGETS[quality][category])
      }
    })

    it(`${quality}：水珠只挂在已让开山体的草与花上`, () => {
      const hosts = [...centers(layout, 'grass'), ...centers(layout, 'flower')]
      for (const dew of centers(layout, 'dew')) {
        expect(hosts.some((host) => angleTo(host, dew) < 1e-6)).toBe(true)
      }
    })
  }
})

describe('山体剖面解算', () => {
  it('峰顶最高、山脚以外不再有山体高度', () => {
    expect(mountainProfile(0)).toBe(1)
    expect(mountainProfile(0.42)).toBeCloseTo(0.55, 10)
    expect(mountainProfile(1)).toBe(0)
    expect(mountainProfile(1.4)).toBe(0)
  })

  it('越宽要让得越远；越高反而更经得起埋，让开的距离更近', () => {
    const peak = {
      dir: new THREE.Vector3(0, 1, 0),
      groundRadius: 1,
      height: 0.22,
      base: 0.22 * 1.35,
      spin: 0,
    }
    const small = { top: 0.05, halfWidth: 0.02 }
    const taller = { top: 0.15, halfWidth: 0.02 }
    const wider = { top: 0.05, halfWidth: 0.06 }
    expect(mountainClearance(peak, wider)).toBeGreaterThan(mountainClearance(peak, small))
    expect(mountainClearance(peak, taller)).toBeLessThan(mountainClearance(peak, small))
  })

  it('解出的角距外侧确实不再埋物件', () => {
    const peak = {
      dir: new THREE.Vector3(0, 1, 0),
      groundRadius: 1,
      height: 0.22,
      base: 0.22 * 1.35,
      spin: 0,
    }
    const extent = { top: 0.1018, halfWidth: 0.0998 }
    const d = mountainClearance(peak, extent)
    const innerRise = mountainRiseAboveGround(peak, d - extent.halfWidth)
    expect(innerRise).toBeLessThanOrEqual(extent.top / 2 + 1e-4)
    expect(d).toBeLessThanOrEqual(Math.PI / 2)
  })
})
