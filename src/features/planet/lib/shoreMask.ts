import * as THREE from 'three'

import { sampleSurface } from './terrain'

/**
 * 把陆海分布烘成等距柱状掩码：片元着色器按方向查掩码，
 * 泡沫亮带就能贴着真实海岸线走，而不是在海壳上另画一个圆。
 * 纯数据输出、不碰 DOM，可直接单测；场景侧再包成 DataTexture。
 */

export const SHORE_LOW = -0.06
export const SHORE_HIGH = 0.08

export function dirToEquirectUV(dir: { x: number; y: number; z: number }): {
  u: number
  v: number
} {
  const u = Math.atan2(dir.z, dir.x) / (Math.PI * 2) + 0.5
  const v = Math.asin(Math.max(-1, Math.min(1, dir.y))) / Math.PI + 0.5
  return { u, v }
}

/** 高程 → 掩码强度：深海 0、陆地 1，海岸线（高程 0）落在约 0.43 处。 */
export function shoreValue(elevation: number): number {
  const t = (elevation - SHORE_LOW) / (SHORE_HIGH - SHORE_LOW)
  return t < 0 ? 0 : t > 1 ? 1 : t
}

export function bakeShoreMask(width: number, height: number): Uint8Array {
  const data = new Uint8Array(width * height)
  const dir = new THREE.Vector3()
  const sample = { elevation: 0, radius: 0 }

  for (let j = 0; j < height; j++) {
    const phi = ((j + 0.5) / height - 0.5) * Math.PI
    const y = Math.sin(phi)
    const ring = Math.cos(phi)
    for (let i = 0; i < width; i++) {
      const theta = ((i + 0.5) / width - 0.5) * Math.PI * 2
      dir.set(Math.cos(theta) * ring, y, Math.sin(theta) * ring)
      sampleSurface(dir, sample)
      data[j * width + i] = Math.round(shoreValue(sample.elevation) * 255)
    }
  }

  return data
}