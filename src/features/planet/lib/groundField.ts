import * as THREE from 'three'

import { dirToEquirectUV } from './shoreMask'
import { buildPlanetGeometry, SEA_SURFACE } from './terrain'
import { WAVE_AMPLITUDE } from './waterWaves'

/**
 * 真实地表高度场：把渲染用的位移网格烘成等距柱状半径场。
 * 解析噪声采样的是「顶点方向上的理论高程」，而用户看到的是低多边形面片——
 * 面片内部可能比采样点低一大截，树按理论高程选址就会踩进海里。
 * 这里直接对网格三角形做射线求交，烘出的就是眼睛看到的那层地皮。
 * 纯数据、不碰 DOM，可单测；场景侧只读不写。
 */

export interface GroundField {
  width: number
  height: number
  radii: Float32Array
}

/** 浪尖能摸到的最高半径：干地判断要连浪一起算进去。 */
export const SEA_CREST = SEA_SURFACE + WAVE_AMPLITUDE

const EPS = 1e-4
const edge1 = new THREE.Vector3()
const edge2 = new THREE.Vector3()
const pvec = new THREE.Vector3()
const qvec = new THREE.Vector3()
const tvec = new THREE.Vector3()
const dir = new THREE.Vector3()
const va = new THREE.Vector3()
const vb = new THREE.Vector3()
const vc = new THREE.Vector3()
const edgePoint = new THREE.Vector3()
const NORTH = new THREE.Vector3(0, 1, 0)
const SOUTH = new THREE.Vector3(0, -1, 0)
/** 弦上采样点：normalize(lerp(a,b,t)) 正好落在三角形投影的边界弧上 */
const EDGE_T = [0.25, 0.5, 0.75]

/** 原点出发沿 dir 的射线与三角形求交，命中返回半径，否则 0。 */
function hitRadius(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3): number {
  edge1.subVectors(b, a)
  edge2.subVectors(c, a)
  pvec.crossVectors(d, edge2)
  const det = edge1.dot(pvec)
  if (Math.abs(det) < 1e-12) return 0
  const inv = 1 / det
  tvec.copy(a).negate()
  const u = tvec.dot(pvec) * inv
  if (u < -EPS || u > 1 + EPS) return 0
  qvec.crossVectors(tvec, edge1)
  const v = d.dot(qvec) * inv
  if (v < -EPS || u + v > 1 + EPS) return 0
  const t = edge2.dot(qvec) * inv
  return t > 0 ? t : 0
}

/**
 * 三角形在等距柱状图上的覆盖范围。
 * 顶点 uv 的包围盒并不包含整个面片：弦的方向沿大圆弧走，纬度会鼓到顶点之外，
 * 只按顶点取盒会漏掉一批格子（读数为 0，选址时整片地被当成海）。
 * 所以沿三条弦各采三个点一起取盒，再外扩一格；含极点的三角形单独补到极行。
 */
function coverage(
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
  width: number,
  height: number,
): { i0: number; i1: number; j0: number; j1: number; wrap: boolean } {
  const anchor = dirToEquirectUV(a).u
  let uMin = Infinity
  let uMax = -Infinity
  let vMin = Infinity
  let vMax = -Infinity

  const consider = (point: THREE.Vector3) => {
    const uv = dirToEquirectUV(point)
    /* 以第一个顶点为锚展开接缝：跨缝三角形才不会横跨整张图 */
    const u = uv.u + Math.round(anchor - uv.u)
    if (u < uMin) uMin = u
    if (u > uMax) uMax = u
    if (uv.v < vMin) vMin = uv.v
    if (uv.v > vMax) vMax = uv.v
  }

  consider(a)
  consider(b)
  consider(c)
  for (const [from, to] of [
    [a, b],
    [b, c],
    [c, a],
  ] as const) {
    for (const t of EDGE_T) {
      consider(edgePoint.copy(from).lerp(to, t).normalize())
    }
  }

  const padU = 1 / width
  const padV = 1 / height
  let i0 = Math.floor((uMin - padU) * width - 0.5)
  let i1 = Math.ceil((uMax + padU) * width - 0.5)
  let j0 = Math.max(0, Math.floor((vMin - padV) * height - 0.5))
  let j1 = Math.min(height - 1, Math.ceil((vMax + padV) * height - 0.5))

  /* 极点落在面片内部时，纬度极值不在边界上，直接补到极行并扫满整圈 */
  let wrap = i1 - i0 >= width
  if (hitRadius(a, b, c, NORTH) > 0) {
    j1 = height - 1
    wrap = true
  } else if (hitRadius(a, b, c, SOUTH) > 0) {
    j0 = 0
    wrap = true
  }
  if (wrap) {
    i0 = 0
    i1 = width - 1
  }

  return {
    /* i 可以越界：跨接缝的列靠取模绕回，夹到 0 会把接缝另一侧整条漏掉 */
    i0,
    i1,
    j0,
    j1,
    wrap,
  }
}

export function bakeGroundField(detail: number, width = 384): GroundField {
  const height = width / 2
  const radii = new Float32Array(width * height)
  const geometry = buildPlanetGeometry(detail)
  const position = geometry.attributes.position as THREE.BufferAttribute

  for (let t = 0; t < position.count; t += 3) {
    va.fromBufferAttribute(position, t)
    vb.fromBufferAttribute(position, t + 1)
    vc.fromBufferAttribute(position, t + 2)
    const box = coverage(va, vb, vc, width, height)

    for (let j = box.j0; j <= box.j1; j++) {
      const phi = ((j + 0.5) / height - 0.5) * Math.PI
      const y = Math.sin(phi)
      const ring = Math.cos(phi)
      for (let i = box.i0; i <= box.i1; i++) {
        const u = (i + 0.5) / width
        const theta = (u - 0.5) * Math.PI * 2
        dir.set(Math.cos(theta) * ring, y, Math.sin(theta) * ring)
        const r = hitRadius(va, vb, vc, dir)
        if (r <= 0) continue
        const idx = j * width + (box.wrap ? i : ((i % width) + width) % width)
        /* 取最近的一次命中：与从原点打射线的求交结果一致，
           地形自遮挡时宁可把地读低一点，也不让树站在悬空的那层皮上 */
        if (radii[idx] === 0 || r < radii[idx]) radii[idx] = r
      }
    }
  }

  geometry.dispose()
  return { width, height, radii }
}

/** 双线性采样地表半径；u 方向环绕，极点夹取。 */
export function groundRadiusAt(field: GroundField, d: { x: number; y: number; z: number }): number {
  const { u, v } = dirToEquirectUV(d)
  const x = u * field.width - 0.5
  const y = Math.min(field.height - 1, Math.max(0, v * field.height - 0.5))
  const i0 = Math.floor(x)
  const j0 = Math.floor(y)
  const fx = x - i0
  const fy = y - j0
  const at = (i: number, j: number): number =>
    field.radii[Math.min(field.height - 1, j) * field.width + ((i % field.width) + field.width) % field.width]
  const r00 = at(i0, j0)
  const r10 = at(i0 + 1, j0)
  const r01 = at(i0, j0 + 1)
  const r11 = at(i0 + 1, j0 + 1)
  return (r00 * (1 - fx) + r10 * fx) * (1 - fy) + (r01 * (1 - fx) + r11 * fx) * fy
}

const probe = new THREE.Vector3()
const t1 = new THREE.Vector3()
const t2 = new THREE.Vector3()
const UP = new THREE.Vector3(0, 1, 0)

/** 脚下与八个切向邻居里最低的地表半径：株脚和株冠投影都不能泡在水里。 */
export function dryRadiusAt(field: GroundField, d: THREE.Vector3, step = 0.05): number {
  let min = groundRadiusAt(field, d)
  const ref = Math.abs(d.y) < 0.9 ? UP : new THREE.Vector3(1, 0, 0)
  t1.crossVectors(ref, d).normalize()
  t2.crossVectors(d, t1).normalize()
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    probe
      .copy(d)
      .addScaledVector(t1, Math.cos(a) * step)
      .addScaledVector(t2, Math.sin(a) * step)
      .normalize()
    const r = groundRadiusAt(field, probe)
    if (r < min) min = r
  }
  return min
}

/** 干地判断：连浪尖一起算，再留出 margin 的岸线缓冲。 */
export function isDryGround(field: GroundField, d: THREE.Vector3, margin: number): boolean {
  return dryRadiusAt(field, d) >= SEA_CREST + margin
}