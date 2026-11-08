import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { between, createRandom, oneOf } from '@/utils/random'

import type { EnvRuntime } from './moodEnvironment'

const STAR_COLORS = ['#FFFFFF', '#E3F2FF', '#D8CEFF', '#FFF0C2', '#BFE2FF'] as const
const DUST_COLORS = ['#D8CEFF', '#FFF0C2', '#A6E9D2', '#FFC2D4'] as const
const SPARKLE_COLORS = ['#FFF6DE', '#FFFFFF', '#FFE9B0'] as const
const FIREFLY_COLORS = ['#FFE9B0', '#FFF3D6'] as const

/** 三簇错峰闪烁的亮点：整片星野一起明暗会读成「屏幕在抖」，错开相位才像星星在眨。 */
const SPARKLE_PHASES = [0, 2.1, 4.2] as const
const SPARKLE_POINTS = 12

/** 软圆点贴图，让粒子是柔和的光点而不是方块。 */
function makeDotTexture(): THREE.Texture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.35, 'rgba(255,255,255,0.7)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function buildPointCloud(
  count: number,
  seed: number,
  minRadius: number,
  maxRadius: number,
  palette: readonly string[],
): THREE.BufferGeometry {
  const random = createRandom(seed)
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const color = new THREE.Color()

  for (let i = 0; i < count; i++) {
    /* 均匀球壳分布，避免极点聚集 */
    const u = between(random, -1, 1)
    const theta = between(random, 0, Math.PI * 2)
    const ring = Math.sqrt(Math.max(0, 1 - u * u))
    const r = between(random, minRadius, maxRadius)

    positions[i * 3] = Math.cos(theta) * ring * r
    positions[i * 3 + 1] = u * r
    positions[i * 3 + 2] = Math.sin(theta) * ring * r

    color.set(oneOf(random, palette))
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geometry
}

export interface SpaceParticlesProps {
  env: EnvRuntime
  calm: boolean
  /** 已解锁「萤光浮尘」 */
  fireflies: boolean
}

/**
 * 远处星野 + 星球周围的少量浮尘 + 闪烁亮点 + 解锁后的萤光。
 * 不用 drei 的 Stars / Sparkles：那两个用 Math.random 撒点（每次刷新都不一样），
 * 而且点尺寸按 size/distance 计算，靠近相机的粒子会炸成大光斑。
 * 这里改成固定种子 + 世界单位尺寸，透视衰减天然有上限。
 */
export function SpaceParticles({ env, calm, fireflies }: SpaceParticlesProps) {
  const texture = useMemo(() => makeDotTexture(), [])
  const stars = useMemo(() => buildPointCloud(620, 0x57a45, 38, 68, STAR_COLORS), [])
  const dust = useMemo(() => buildPointCloud(60, 0xd0571, 1.9, 3.2, DUST_COLORS), [])
  const sparkles = useMemo(
    () =>
      SPARKLE_PHASES.map((_, i) =>
        buildPointCloud(SPARKLE_POINTS, 0x5ba4c + i * 977, 2, 3.2, SPARKLE_COLORS),
      ),
    [],
  )
  const motes = useMemo(() => buildPointCloud(36, 0xf1e41, 1.45, 1.95, FIREFLY_COLORS), [])

  const dustRef = useRef<THREE.Group>(null)
  const moteRef = useRef<THREE.Group>(null)
  const starMaterial = useRef<THREE.PointsMaterial>(null)
  const sparkleMaterials = useRef<Array<THREE.PointsMaterial | null>>([])
  const moteMaterial = useRef<THREE.PointsMaterial>(null)
  /** 萤光的淡入进度：解锁是一瞬间的事，出现不该是一瞬间的事 */
  const moteFade = useRef(0)

  useEffect(
    () => () => {
      texture.dispose()
      stars.dispose()
      dust.dispose()
      motes.dispose()
      for (const geometry of sparkles) geometry.dispose()
    },
    [texture, stars, dust, motes, sparkles],
  )

  useFrame((_, dt) => {
    const step = Math.min(dt, 0.05)
    const v = env.values

    if (starMaterial.current) {
      /* 开心与兴奋时星野整体更亮更大，焦虑时压暗一档：云多、星少，不刺眼 */
      starMaterial.current.opacity = 0.4 + v.starBrightness * 0.55
      starMaterial.current.size = 0.26 + v.starBrightness * 0.1
    }

    const twinkle = v.starTwinkle
    for (let i = 0; i < SPARKLE_PHASES.length; i++) {
      const material = sparkleMaterials.current[i]
      if (!material) continue
      material.visible = twinkle > 0.01
      /* calm 时 env.time 不推进，正弦停在原地，闪烁自然静止 */
      material.opacity =
        twinkle * 0.9 * (0.5 + 0.5 * Math.sin(env.time * 1.85 + SPARKLE_PHASES[i]))
    }

    if (!calm && dustRef.current) {
      /* 浮尘转速跟着微风走：风大的心情里，星球周围也更热闹一点 */
      dustRef.current.rotation.y += step * (0.015 + v.wind * 0.03)
    }

    const target = fireflies ? 0.75 : 0
    moteFade.current = calm ? target : THREE.MathUtils.damp(moteFade.current, target, 2.2, step)
    if (moteMaterial.current) {
      moteMaterial.current.opacity = moteFade.current
      moteMaterial.current.visible = moteFade.current > 0.01
    }
    if (!calm && moteRef.current) {
      moteRef.current.rotation.y += step * 0.05
      moteRef.current.rotation.x = Math.sin(env.time * 0.22) * 0.08
    }
  })

  return (
    <group>
      <points geometry={stars} frustumCulled={false}>
        <pointsMaterial
          ref={starMaterial}
          map={texture}
          size={0.32}
          sizeAttenuation
          vertexColors
          transparent
          opacity={0.9}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {sparkles.map((geometry, index) => (
        <points key={SPARKLE_PHASES[index]} geometry={geometry} frustumCulled={false}>
          <pointsMaterial
            ref={(node) => {
              sparkleMaterials.current[index] = node
            }}
            map={texture}
            size={0.055}
            sizeAttenuation
            vertexColors
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </points>
      ))}

      <group ref={dustRef} rotation={[0.2, 0, 0.12]}>
        <points geometry={dust} frustumCulled={false}>
          <pointsMaterial
            map={texture}
            size={0.022}
            sizeAttenuation
            vertexColors
            transparent
            opacity={0.7}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </points>
      </group>

      <group ref={moteRef} rotation={[0.35, 0, -0.2]}>
        <points geometry={motes} frustumCulled={false}>
          <pointsMaterial
            ref={moteMaterial}
            map={texture}
            size={0.04}
            sizeAttenuation
            vertexColors
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </points>
      </group>
    </group>
  )
}
