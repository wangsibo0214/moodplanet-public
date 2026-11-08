import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import type { EnvRuntime } from './moodEnvironment'

const SPRITE_SCALE = 3.25

/**
 * 环形大气辉光：中间镂空，只在星球轮廓外圈发光。
 *
 * 贴图刻意做成纯白，颜色交给 material.color 每帧写入。
 * 之前是按心情重新生成一张带色贴图，那样每次换心情都要重画一次 canvas、
 * 重传一次纹理；改成白色底 + 颜色乘算之后，渐变完全在 GPU 里做。
 */
function useGlowTexture(): THREE.Texture {
  const texture = useMemo(() => {
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (ctx) {
      const gradient = ctx.createRadialGradient(
        size / 2,
        size / 2,
        size * 0.1,
        size / 2,
        size / 2,
        size / 2,
      )
      gradient.addColorStop(0, 'rgba(255,255,255,0)')
      gradient.addColorStop(0.55, 'rgba(255,255,255,0)')
      gradient.addColorStop(0.66, 'rgba(255,255,255,0.34)')
      gradient.addColorStop(0.74, 'rgba(255,255,255,0.2)')
      gradient.addColorStop(0.88, 'rgba(255,255,255,0.05)')
      gradient.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, size, size)
    }
    const result = new THREE.CanvasTexture(canvas)
    result.colorSpace = THREE.SRGBColorSpace
    return result
  }, [])

  useEffect(() => () => texture.dispose(), [texture])
  return texture
}

export function AtmosphereGlow({ env }: { env: EnvRuntime }) {
  const texture = useGlowTexture()
  const material = useRef<THREE.SpriteMaterial>(null)

  useFrame(() => {
    if (!material.current) return
    material.current.color.copy(env.colors.tint)
    material.current.opacity = 0.55 + env.values.glow * 0.35
  })

  return (
    /* sprite 平面过星球球心，正面被深度测试挡掉，只剩轮廓外圈 */
    <sprite scale={[SPRITE_SCALE, SPRITE_SCALE, 1]} renderOrder={2}>
      <spriteMaterial
        ref={material}
        map={texture}
        transparent
        opacity={0.8}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
  )
}
