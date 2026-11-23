import * as THREE from 'three'

import { between, createRandom } from '@/utils/random'

import { groundRadiusAt, isDryGround, type GroundField } from '../lib/groundField'
import { sampleSurface, sampleSurfacePoints } from '../lib/terrain'
import { blocksCompanionView, COMPANION_HOME_DIR } from './companionPlacement'

/**
 * 山脉选址：纯函数、确定性，不消耗植被的随机序列。
 * 只站在高原干地上，峰与峰保持角距才读得出「一条山脉」而不是满球碎石；
 * 全球分布（不做正面可见过滤）：轮廓边缘的山脊才是立体感的来源。
 */

export const MOUNTAIN_MIN_ELEVATION = 0.36
/** 山体簇数：植被选址要按同一份数避让山体，渲染与避让才不会对不上 */
export const MOUNTAIN_COUNTS: Record<'reduced' | 'normal', number> = { reduced: 5, normal: 9 }
export const MOUNTAIN_SEP_COS = Math.cos((26 * Math.PI) / 180)
export const MOUNTAIN_TIP_HEIGHT = 0.26
/** 底宽 / 峰高：大于 1 才是「山体」，小于 1 在轮廓边缘会读成一圈尖刺 */
export const MOUNTAIN_BASE_RATIO = 1.35
export const MOUNTAIN_HEIGHT_RANGE: readonly [number, number] = [0.14, 0.22]
export const MOUNTAIN_SNOW_MIN = 0.175
const HOME_CLEAR_COS = Math.cos((16 * Math.PI) / 180)
/** 侧峰离主峰轴心的距离：落在主峰山坡上，峰顶才从坡面里探出来连成一条脊 */
const SHOULDER_STEP = 0.16

export interface PeakSpec {
  dir: THREE.Vector3
  groundRadius: number
  height: number
  base: number
  spin: number
}

export interface MountainSpec extends PeakSpec {
  snow: boolean
  shoulders: PeakSpec[]
}

const UP = new THREE.Vector3(0, 1, 0)
const t1 = new THREE.Vector3()
const t2 = new THREE.Vector3()
const probe = new THREE.Vector3()
const sample = { elevation: 0, radius: 0 }

function tangentBasis(dir: THREE.Vector3): void {
  const ref = Math.abs(dir.y) < 0.9 ? UP : new THREE.Vector3(1, 0, 0)
  t1.crossVectors(ref, dir).normalize()
  t2.crossVectors(dir, t1).normalize()
}

export function findMountainSites(ground: GroundField, count: number): MountainSpec[] {
  const random = createRandom(0x5eed77)
  const pool = sampleSurfacePoints(2600, MOUNTAIN_MIN_ELEVATION, 0.9)
  const ranked = [...pool].sort((a, b) => b.elevation - a.elevation)
  const sites: MountainSpec[] = []

  for (const point of ranked) {
    if (sites.length >= count) break
    if (point.dir.dot(COMPANION_HOME_DIR) >= HOME_CLEAR_COS) continue
    if (blocksCompanionView(point.dir, point.radius, MOUNTAIN_TIP_HEIGHT)) continue
    if (!isDryGround(ground, point.dir, 0.01)) continue
    if (sites.some((s) => s.dir.dot(point.dir) >= MOUNTAIN_SEP_COS)) continue

    const height = between(random, MOUNTAIN_HEIGHT_RANGE[0], MOUNTAIN_HEIGHT_RANGE[1])
    const base = height * MOUNTAIN_BASE_RATIO
    const spin = between(random, 0, Math.PI * 2)
    const groundRadius = groundRadiusAt(ground, point.dir)
    const shoulders: PeakSpec[] = []
    tangentBasis(point.dir)
    for (let i = 0; i < 2; i++) {
      const a = spin + (i === 0 ? 0.6 : 2.7)
      probe
        .copy(point.dir)
        .addScaledVector(t1, Math.cos(a) * SHOULDER_STEP)
        .addScaledVector(t2, Math.sin(a) * SHOULDER_STEP)
        .normalize()
      if (!isDryGround(ground, probe, 0.004)) continue
      sampleSurface(probe, sample)
      const sh = height * between(random, 0.45, 0.62)
      shoulders.push({
        dir: probe.clone(),
        groundRadius: groundRadiusAt(ground, probe),
        height: sh,
        base: sh * MOUNTAIN_BASE_RATIO,
        spin: between(random, 0, Math.PI * 2),
      })
    }

    sites.push({
      dir: point.dir.clone(),
      groundRadius,
      height,
      base,
      spin,
      snow: height >= MOUNTAIN_SNOW_MIN,
      shoulders,
    })
  }

  return sites
}