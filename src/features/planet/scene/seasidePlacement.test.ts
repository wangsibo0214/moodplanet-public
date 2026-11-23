import { describe, expect, it } from 'vitest'

import { blocksCompanionView, CAMERA_POS, COMPANION_HOME_DIR } from './companionPlacement'
import {
  LH_MAX_Y,
  LH_MIN_VISIBILITY,
  LH_SEA_MAX,
  LIGHTHOUSE_TIP_HEIGHT,
  PIER_BAND,
  PIER_LH_SEP_COS,
  PIER_MAX_Y,
  PIER_MIN_VISIBILITY,
  findLighthouseSite,
  findPierSite,
  seaNeighbors,
} from './seasidePlacement'

const VIEW_DIR = CAMERA_POS.clone().normalize()
const HOME_CLEAR_COS = Math.cos((14 * Math.PI) / 180)

describe('灯塔岛选址', () => {
  const site = findLighthouseSite()

  it('站在海里：高程低于礁石露出线', () => {
    expect(site.elevation).toBeLessThanOrEqual(LH_SEA_MAX)
  })

  it('在可见前半球、伙伴视线下方', () => {
    expect(site.dir.dot(VIEW_DIR)).toBeGreaterThanOrEqual(LH_MIN_VISIBILITY)
    expect(site.dir.y).toBeLessThanOrEqual(LH_MAX_Y)
  })

  it('不进伙伴家门口留白，也不挡正脸（含塔尖高度）', () => {
    expect(site.dir.dot(COMPANION_HOME_DIR)).toBeLessThan(HOME_CLEAR_COS)
    expect(blocksCompanionView(site.dir, site.radius, LIGHTHOUSE_TIP_HEIGHT)).toBe(false)
  })

  it('两次调用逐位一致（确定性）', () => {
    const again = findLighthouseSite()
    expect(site.dir.distanceTo(again.dir)).toBe(0)
    expect(site.radius).toBe(again.radius)
  })
})

describe('栈桥选址', () => {
  const lighthouse = findLighthouseSite()
  const pier = findPierSite(lighthouse.dir)

  it('站在海岸沙带', () => {
    expect(pier.point.elevation).toBeGreaterThanOrEqual(PIER_BAND[0])
    expect(pier.point.elevation).toBeLessThanOrEqual(PIER_BAND[1])
  })

  it('八邻里至少两邻是海，桥头朝海且与地表相切', () => {
    expect(seaNeighbors(pier.point.dir).count).toBeGreaterThanOrEqual(2)
    expect(pier.forward.dot(pier.point.dir)).toBeCloseTo(0, 6)
    expect(pier.forward.length()).toBeCloseTo(1, 6)
  })

  it('与灯塔保持至少 28° 角距', () => {
    expect(pier.point.dir.dot(lighthouse.dir)).toBeLessThan(PIER_LH_SEP_COS)
  })

  it('可见、视线下方、不挡伙伴、不进家门口留白', () => {
    expect(pier.point.dir.dot(VIEW_DIR)).toBeGreaterThanOrEqual(PIER_MIN_VISIBILITY)
    expect(pier.point.dir.y).toBeLessThanOrEqual(PIER_MAX_Y)
    expect(blocksCompanionView(pier.point.dir, pier.point.radius, 0.05)).toBe(false)
    expect(pier.point.dir.dot(COMPANION_HOME_DIR)).toBeLessThan(HOME_CLEAR_COS)
  })

  it('两次调用逐位一致（确定性）', () => {
    const again = findPierSite(lighthouse.dir)
    expect(pier.point.dir.distanceTo(again.point.dir)).toBe(0)
    expect(pier.forward.distanceTo(again.forward)).toBe(0)
  })
})