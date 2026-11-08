import * as THREE from 'three'

import { sampleSurface, sampleSurfacePoints, type SurfacePoint } from '../lib/terrain'

const UP = new THREE.Vector3(0, 1, 0)
/** 默认机位：入场推拉只改距离不改方向，所以这个方向同时决定顶缘在哪、脸朝哪。 */
export const CAMERA_POS = new THREE.Vector3(0, 1.62, 5.55)
const VIEW_DIR = CAMERA_POS.clone().normalize()
/** 从默认机位看星球轮廓的最上缘：与视线垂直、朝上的方向。 */
const TOP_LIMB_DIR = UP.clone().addScaledVector(VIEW_DIR, -UP.dot(VIEW_DIR)).normalize()
/** 挂点从最上缘往北极收一点：脚落在看得见的顶面上，身子仍然贴着顶部轮廓。 */
const TOP_DIR = TOP_LIMB_DIR.clone().lerp(UP, 0.25).normalize()
/** 伙伴的固定挂点方向；植被会绕开它周围一小片，免得树冠挡脸。 */
export const COMPANION_HOME_DIR = TOP_DIR

const HOME_POS = TOP_DIR.clone().multiplyScalar(sampleSurface(TOP_DIR).radius)
const VIEW_HOME = HOME_POS.clone().sub(CAMERA_POS).normalize()
const HOME_DIST = HOME_POS.distanceTo(CAMERA_POS)
/** 视线走廊半角：落在这个锥里、又比伙伴近的植物，会从正面挡住伙伴。 */
const BLOCK_COS = Math.cos((3.5 * Math.PI) / 180)

/**
 * 判断一棵植物（含株高）在初始朝向下会不会正好挡在伙伴正脸前面。
 * 只比视线方向与距离，不涉及屏幕坐标，机位距离变化时结论不变。
 */
export function blocksCompanionView(
  dir: THREE.Vector3,
  radius: number,
  tipHeight: number,
): boolean {
  const tip = dir.clone().multiplyScalar(radius + tipHeight).sub(CAMERA_POS)
  if (tip.normalize().dot(VIEW_HOME) < BLOCK_COS) return false
  return dir.clone().multiplyScalar(radius).distanceTo(CAMERA_POS) < HOME_DIST
}

/**
 * 初始挂点固定在星球顶部正中：每次加载都挂在同一处，正脸朝向用户。
 * 顶部正中本身是陆地就直接站上去；万一那里是海，退到顶帽里离正中最近的一块陆地。
 */
export function findCompanionAnchor(): SurfacePoint {
  const home = sampleSurface(TOP_DIR)
  if (home.elevation >= 0.02) {
    return { dir: TOP_DIR.clone(), radius: home.radius, elevation: home.elevation }
  }
  const pool = sampleSurfacePoints(1200, 0.05, 1)
  let best: SurfacePoint | null = null
  let bestDot = Number.NEGATIVE_INFINITY
  for (const point of pool) {
    if (point.dir.y < 0.8) continue
    const dot = point.dir.dot(TOP_DIR)
    if (dot > bestDot) {
      bestDot = dot
      best = point
    }
  }
  if (best) return best
  return { dir: TOP_DIR.clone(), radius: home.radius, elevation: home.elevation }
}
