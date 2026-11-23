import * as THREE from 'three'

import { sampleSurface, sampleSurfacePoints, type SurfacePoint } from '../lib/terrain'
import { blocksCompanionView, CAMERA_POS, COMPANION_HOME_DIR } from './companionPlacement'

/**
 * 海边解锁物的选址：纯函数、确定性（斐波那契球面枚举 + 固定评分），
 * 不消耗植被的随机数序列，解锁前后既有树一棵都不跳位。
 * 构图约束与植被同源：可见前半球、伙伴头顶留白、不进正脸视线走廊。
 */

const VIEW_DIR = CAMERA_POS.clone().normalize()
const UP = new THREE.Vector3(0, 1, 0)

export const LH_MIN_VISIBILITY = 0.5
export const LH_MAX_Y = 0.55
export const LH_SEA_MAX = -0.045
export const LIGHTHOUSE_TIP_HEIGHT = 0.16
const HOME_CLEAR_COS = Math.cos((14 * Math.PI) / 180)

export const PIER_MIN_VISIBILITY = 0.45
export const PIER_MAX_Y = 0.5
export const PIER_BAND: readonly [number, number] = [0.05, 0.14]
export const PIER_LH_SEP_COS = Math.cos((28 * Math.PI) / 180)
const SEA_NEIGHBOR_STEP = 0.09
const SEA_NEIGHBOR_MIN = -0.01

function visibleEnough(dir: THREE.Vector3, min: number): boolean {
  return dir.dot(VIEW_DIR) >= min
}

function awayFromHome(dir: THREE.Vector3): boolean {
  return dir.dot(COMPANION_HOME_DIR) < HOME_CLEAR_COS
}

/** 灯塔岛：站在海里（高程足够低，礁石才露得出水面），正面可见、伙伴下方。 */
export function findLighthouseSite(): SurfacePoint {
  const pool = sampleSurfacePoints(2400, -0.6, LH_SEA_MAX)
  const score = (point: SurfacePoint): number =>
    point.dir.dot(VIEW_DIR) - Math.abs(point.dir.y - 0.25) * 0.6

  let best: SurfacePoint | null = null
  let bestScore = Number.NEGATIVE_INFINITY
  for (const point of pool) {
    if (point.dir.y > LH_MAX_Y) continue
    if (!visibleEnough(point.dir, LH_MIN_VISIBILITY)) continue
    if (!awayFromHome(point.dir)) continue
    if (blocksCompanionView(point.dir, point.radius, LIGHTHOUSE_TIP_HEIGHT)) continue
    const value = score(point)
    if (value > bestScore) {
      bestScore = value
      best = point
    }
  }
  if (best) return best

  /* 退路：正脸半球若全被排除，放宽纬度与留白，只保留「不挡伙伴正脸」。
     地形是固定噪声，主路径必然命中；退路只为函数完备。 */
  for (const point of pool) {
    if (blocksCompanionView(point.dir, point.radius, LIGHTHOUSE_TIP_HEIGHT)) continue
    const value = score(point)
    if (value > bestScore) {
      bestScore = value
      best = point
    }
  }
  return best ?? pool[0]
}

function tangentBasis(dir: THREE.Vector3): [THREE.Vector3, THREE.Vector3] {
  const ref = Math.abs(dir.y) < 0.9 ? UP : new THREE.Vector3(1, 0, 0)
  const t1 = new THREE.Vector3().crossVectors(ref, dir).normalize()
  const t2 = new THREE.Vector3().crossVectors(dir, t1).normalize()
  return [t1, t2]
}

/** 八个切向邻居里海的数量与最深海方向：栈桥要伸得进水里才成立。 */
export function seaNeighbors(dir: THREE.Vector3): { count: number; deepest: THREE.Vector3 } {
  const [t1, t2] = tangentBasis(dir)
  const probe = new THREE.Vector3()
  const sample = { elevation: 0, radius: 0 }
  let count = 0
  let deepestElevation = Number.POSITIVE_INFINITY
  const deepest = new THREE.Vector3()

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    probe
      .copy(dir)
      .addScaledVector(t1, Math.cos(a) * SEA_NEIGHBOR_STEP)
      .addScaledVector(t2, Math.sin(a) * SEA_NEIGHBOR_STEP)
      .normalize()
    sampleSurface(probe, sample)
    if (sample.elevation < SEA_NEIGHBOR_MIN) {
      count++
      if (sample.elevation < deepestElevation) {
        deepestElevation = sample.elevation
        deepest.copy(probe)
      }
    }
  }

  return { count, deepest }
}

export interface PierSite {
  point: SurfacePoint
  /** 单位切向量，指向最深的邻居海：栈桥的延伸方向。 */
  forward: THREE.Vector3
}

function selectPier(
  pool: readonly SurfacePoint[],
  lighthouseDir: THREE.Vector3,
  minNeighbors: number,
): PierSite | null {
  let best: PierSite | null = null
  let bestScore = Number.NEGATIVE_INFINITY

  for (const point of pool) {
    if (point.dir.y > PIER_MAX_Y) continue
    if (!visibleEnough(point.dir, PIER_MIN_VISIBILITY)) continue
    if (!awayFromHome(point.dir)) continue
    if (point.dir.dot(lighthouseDir) >= PIER_LH_SEP_COS) continue
    if (blocksCompanionView(point.dir, point.radius, 0.05)) continue
    const { count, deepest } = seaNeighbors(point.dir)
    if (count < minNeighbors) continue
    const score =
      count * 0.2 + point.dir.dot(VIEW_DIR) * 0.5 - Math.abs(point.dir.y - 0.15) * 0.3
    if (score > bestScore) {
      const forward = deepest
        .clone()
        .addScaledVector(point.dir, -deepest.dot(point.dir))
        .normalize()
      bestScore = score
      best = { point, forward }
    }
  }

  return best
}

/** 栈桥：海岸沙带上、与灯塔保持角距、桥头朝海。 */
export function findPierSite(lighthouseDir: THREE.Vector3): PierSite {
  const pool = sampleSurfacePoints(2400, PIER_BAND[0], PIER_BAND[1])
  return (
    selectPier(pool, lighthouseDir, 2) ??
    selectPier(pool, lighthouseDir, 1) ??
    selectPier(pool, lighthouseDir, 0) ?? {
      point: pool[0],
      forward: tangentBasis(pool[0].dir)[0],
    }
  )
}