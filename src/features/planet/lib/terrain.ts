import * as THREE from 'three'

import { fbm3 } from './noise'

export const PLANET_RADIUS = 1
export const SEA_LEVEL = PLANET_RADIUS
/** 海壳半径：与 PlanetBody 的海面球同一约定，选址的「干地」判断以它为基准。 */
export const SEA_SURFACE = SEA_LEVEL * 1.004

/** 地形最大起伏（相对半径）。这个量级下轮廓有明显立体感，又不会破坏「圆润可爱」。 */
export const TERRAIN_AMPLITUDE = 0.095

/** 大陆噪声频率：越小大陆块越大。 */
const CONTINENT_FREQ = 1.3
/** 正向偏移，让陆地略多于海洋。 */
const LAND_BIAS = 0.07

/* 生物群系色。three 在 ColorManagement 开启时会把 sRGB 转成线性工作空间，
   顶点色需要线性值，所以统一用 THREE.Color 从 hex 构造。
   海床按深度渐变：近岸青绿、深海蓝，透过半透明海面读得出浅滩。 */
const COLOR_DEEP_SEABED = new THREE.Color('#2F6E96')
const COLOR_SHALLOW_SEABED = new THREE.Color('#6FC7BE')
const COLOR_SAND = new THREE.Color('#F0DCA8')
const COLOR_GRASS = new THREE.Color('#7CC47F')
const COLOR_FOREST = new THREE.Color('#3F8C58')
const COLOR_ROCK = new THREE.Color('#8F86B8')
const COLOR_SNOW = new THREE.Color('#EDF1FB')

export interface SurfacePoint {
  /** 单位方向 */
  dir: THREE.Vector3
  /** 该方向上的地表半径 */
  radius: number
  /** 归一化高程，0 为海平面 */
  elevation: number
}

const UP = new THREE.Vector3(0, 1, 0)

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value
}

/** 采样某个方向上的高程与地表半径。星球上所有物件的定位都以它为准。 */
export function sampleSurface(
  dir: THREE.Vector3,
  target: { elevation: number; radius: number } = { elevation: 0, radius: 0 },
): { elevation: number; radius: number } {
  const n = fbm3(
    dir.x * CONTINENT_FREQ,
    dir.y * CONTINENT_FREQ,
    dir.z * CONTINENT_FREQ,
    5,
  )
  target.elevation = n + LAND_BIAS
  target.radius = PLANET_RADIUS + target.elevation * TERRAIN_AMPLITUDE
  return target
}

/** 按高程取生物群系颜色，并叠一层高频色斑当作地表纹理。 */
export function biomeColor(
  elevation: number,
  dir: THREE.Vector3,
  target: THREE.Color,
): THREE.Color {
  if (elevation < -0.02) {
    target.copy(COLOR_DEEP_SEABED).lerp(COLOR_SHALLOW_SEABED, clamp01((elevation + 0.4) / 0.38))
  } else if (elevation < 0.05) {
    target.copy(COLOR_SHALLOW_SEABED).lerp(COLOR_SAND, clamp01((elevation + 0.02) / 0.07))
  } else if (elevation < 0.15) {
    target.copy(COLOR_SAND).lerp(COLOR_GRASS, clamp01((elevation - 0.05) / 0.1))
  } else if (elevation < 0.34) {
    target.copy(COLOR_GRASS).lerp(COLOR_FOREST, clamp01((elevation - 0.15) / 0.19))
  } else if (elevation < 0.47) {
    target.copy(COLOR_FOREST).lerp(COLOR_ROCK, clamp01((elevation - 0.34) / 0.13))
  } else if (elevation < 0.58) {
    target.copy(COLOR_ROCK)
  } else {
    target.copy(COLOR_ROCK).lerp(COLOR_SNOW, clamp01((elevation - 0.58) / 0.12))
  }

  /* 高频色斑：让同一片群系内部有明暗变化，避免大面积纯色带 */
  const mottle = 0.93 + fbm3(dir.x * 9, dir.y * 9, dir.z * 9, 2) * 0.14
  return target.multiplyScalar(mottle)
}

/**
 * 生成位移后的星球几何体。
 * IcosahedronGeometry 是非索引几何体，共享边上的重复顶点方向一致，
 * 因此按方向位移不会产生裂缝；computeVertexNormals 在非索引几何体上得到面法线，即低多边形平面着色。
 */
export function buildPlanetGeometry(detail: number): THREE.IcosahedronGeometry {
  const geometry = new THREE.IcosahedronGeometry(PLANET_RADIUS, detail)
  const position = geometry.attributes.position as THREE.BufferAttribute
  const count = position.count
  const colors = new Float32Array(count * 3)

  const dir = new THREE.Vector3()
  const sample = { elevation: 0, radius: 0 }
  const color = new THREE.Color()

  for (let i = 0; i < count; i++) {
    dir.fromBufferAttribute(position, i).normalize()
    sampleSurface(dir, sample)
    position.setXYZ(i, dir.x * sample.radius, dir.y * sample.radius, dir.z * sample.radius)

    biomeColor(sample.elevation, dir, color)
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

/** 斐波那契球面均匀取点，筛出落在指定高程带内的地表点。 */
export function sampleSurfacePoints(
  candidates: number,
  minElevation: number,
  maxElevation: number,
): SurfacePoint[] {
  const points: SurfacePoint[] = []
  const golden = Math.PI * (3 - Math.sqrt(5))
  const dir = new THREE.Vector3()
  const sample = { elevation: 0, radius: 0 }

  for (let i = 0; i < candidates; i++) {
    const y = 1 - (i / Math.max(1, candidates - 1)) * 2
    const ringRadius = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = golden * i

    dir.set(Math.cos(theta) * ringRadius, y, Math.sin(theta) * ringRadius)
    sampleSurface(dir, sample)

    if (sample.elevation >= minElevation && sample.elevation <= maxElevation) {
      points.push({ dir: dir.clone(), radius: sample.radius, elevation: sample.elevation })
    }
  }

  return points
}

/** 从点集中均匀抽取 count 个，避免随机抽样造成的聚集与空洞。 */
export function pickEvenly<T>(items: readonly T[], count: number): T[] {
  if (items.length <= count) return items.slice()
  const step = items.length / count
  return Array.from({ length: count }, (_, i) => items[Math.floor(i * step)])
}

const alignQuat = new THREE.Quaternion()
const spinQuat = new THREE.Quaternion()
const surfacePos = new THREE.Vector3()

/**
 * 生成「贴在地表、+Y 朝外」的实例矩阵。
 * localOffsetY 沿法线方向抬高（例如树冠在树干之上），spin 是绕法线的自转抖动。
 */
export function writeSurfaceMatrix(
  matrix: THREE.Matrix4,
  point: SurfacePoint,
  localOffsetY: number,
  scale: THREE.Vector3,
  spin: number,
): THREE.Matrix4 {
  alignQuat.setFromUnitVectors(UP, point.dir)
  spinQuat.setFromAxisAngle(UP, spin)
  alignQuat.multiply(spinQuat)
  surfacePos.copy(point.dir).multiplyScalar(point.radius + localOffsetY)
  return matrix.compose(surfacePos, alignQuat, scale)
}
