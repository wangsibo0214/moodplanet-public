import { describe, expect, it } from 'vitest'

import { bakeGroundField, isDryGround } from '@/features/planet/lib/groundField'
import { sampleSurface } from '@/features/planet/lib/terrain'
import { blocksCompanionView, COMPANION_HOME_DIR } from '@/features/planet/scene/companionPlacement'
import {
  findMountainSites,
  MOUNTAIN_BASE_RATIO,
  MOUNTAIN_HEIGHT_RANGE,
  MOUNTAIN_MIN_ELEVATION,
  MOUNTAIN_SEP_COS,
  MOUNTAIN_SNOW_MIN,
  MOUNTAIN_TIP_HEIGHT,
} from '@/features/planet/scene/mountainPlacement'

const HOME_CLEAR_COS = Math.cos((16 * Math.PI) / 180)

describe('山脉选址', () => {
  const ground = bakeGroundField(13)
  const sites = findMountainSites(ground, 9)

  it('要几座给几座，且两次调用逐位一致', () => {
    expect(sites).toHaveLength(9)
    const again = findMountainSites(ground, 9)
    expect(again.map((s) => s.dir.toArray())).toEqual(sites.map((s) => s.dir.toArray()))
    expect(again.map((s) => s.height)).toEqual(sites.map((s) => s.height))
  })

  it('只站在高原干地上', () => {
    for (const site of sites) {
      expect(sampleSurface(site.dir).elevation).toBeGreaterThanOrEqual(MOUNTAIN_MIN_ELEVATION)
      expect(isDryGround(ground, site.dir, 0.01)).toBe(true)
    }
  })

  it('峰与峰保持角距：读得出山脉而不是满球碎石', () => {
    for (let i = 0; i < sites.length; i++) {
      for (let j = i + 1; j < sites.length; j++) {
        expect(sites[i].dir.dot(sites[j].dir)).toBeLessThan(MOUNTAIN_SEP_COS)
      }
    }
  })

  it('不进伙伴家门口留白，也不挡正脸（含峰顶高度）', () => {
    for (const site of sites) {
      expect(site.dir.dot(COMPANION_HOME_DIR)).toBeLessThan(HOME_CLEAR_COS)
      expect(blocksCompanionView(site.dir, site.groundRadius, MOUNTAIN_TIP_HEIGHT)).toBe(false)
    }
  })

  it('峰高在预算内，雪顶只给够高的峰', () => {
    for (const site of sites) {
      expect(site.height).toBeGreaterThanOrEqual(MOUNTAIN_HEIGHT_RANGE[0])
      expect(site.height).toBeLessThanOrEqual(MOUNTAIN_HEIGHT_RANGE[1])
      expect(site.snow).toBe(site.height >= MOUNTAIN_SNOW_MIN)
      expect(site.base).toBeCloseTo(site.height * MOUNTAIN_BASE_RATIO, 12)
      /* 底宽大于峰高：轮廓边缘读作山体而不是尖刺 */
      expect(site.base).toBeGreaterThan(site.height)
    }
  })

  it('侧峰比主峰矮、站在干地上、贴着主峰', () => {
    let shoulders = 0
    for (const site of sites) {
      for (const sh of site.shoulders) {
        shoulders++
        expect(sh.height).toBeLessThan(site.height)
        expect(isDryGround(ground, sh.dir, 0.004)).toBe(true)
        expect(sh.dir.dot(site.dir)).toBeGreaterThan(Math.cos(0.2))
      }
    }
    expect(shoulders).toBeGreaterThan(0)
  })

  it('低档位少给山，但仍然是确定性的干地选址', () => {
    const reduced = findMountainSites(ground, 5)
    expect(reduced).toHaveLength(5)
    for (const site of reduced) expect(isDryGround(ground, site.dir, 0.01)).toBe(true)
  })
})