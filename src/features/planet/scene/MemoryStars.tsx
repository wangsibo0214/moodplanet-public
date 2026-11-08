import { useRef, useState } from 'react'
import { useCursor } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'

import { MOOD_MAP } from '@/features/mood/mood.config'
import { usePlanetStore } from '@/stores/usePlanetStore'
import type { MemoryStar } from '@/types/mood'

import type { EnvRuntime } from './moodEnvironment'

/**
 * 记忆星。
 *
 * 每一颗都对应一条真实的 MoodRecord：颜色来自那条记录的情绪，
 * 点开就是那条记录本身。没有记录就不会有星——这里不存在纯装饰的星星。
 */

const ORBIT_SPEED = 0.06
/**
 * 同时在场景里渲染的上限。
 * 记录很多时全部渲染会让轨道糊成一圈，超出的部分在「记忆星」页面照样能看。
 */
const MAX_RENDERED = 24
/** 刚保存的星有一段升空动画；超过这个时长的星直接就位，刷新时不重播 */
const FRESH_WINDOW = 3000
const APPEAR_DURATION = 0.9

function easeOutBack(t: number): number {
  const c1 = 1.15
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

interface StarNodeProps {
  star: MemoryStar
  env: EnvRuntime
  calm: boolean
}

function StarNode({ star, env, calm }: StarNodeProps) {
  const spinRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Group>(null)
  const coreRef = useRef<THREE.Mesh>(null)
  const coreMaterial = useRef<THREE.MeshStandardMaterial>(null)
  const haloMaterial = useRef<THREE.MeshBasicMaterial>(null)
  const ringMaterial = useRef<THREE.MeshBasicMaterial>(null)

  const openStar = usePlanetStore((state) => state.openStar)
  const selected = usePlanetStore((state) => state.selectedRecordId === star.recordId)
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)

  const hex = MOOD_MAP[star.mood].hex
  /* 只有刚写下的那颗星才播升空动画：用挂载时刻判断，刷新后不会整片重播 */
  const [fresh] = useState(() => {
    const created = Date.parse(star.createdAt)
    return Number.isFinite(created) && Date.now() - created < FRESH_WINDOW
  })
  const appear = useRef(fresh ? 0 : 1)

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    if (appear.current < 1) {
      appear.current = calm ? 1 : Math.min(1, appear.current + dt / APPEAR_DURATION)
    }
    const rise = easeOutBack(appear.current)
    const lit = hovered || selected

    if (spinRef.current) {
      spinRef.current.rotation.y = star.orbit.phase + env.time * ORBIT_SPEED
    }
    if (bodyRef.current) {
      /* 从地表附近升到自己的轨道半径上 */
      bodyRef.current.position.x = star.orbit.radius * (0.72 + 0.28 * rise)
      const breathe = calm ? 1 : 1 + Math.sin(env.time * 1.4 + star.orbit.phase) * 0.05
      bodyRef.current.scale.setScalar(rise * breathe * (lit ? 1.2 : 1))
    }
    if (coreRef.current && !calm) {
      coreRef.current.rotation.y = env.time * 0.5
      coreRef.current.rotation.x = env.time * 0.28
    }
    if (coreMaterial.current) {
      /* 星的亮度跟着整体光晕走：开心的夜里更亮，疲惫时柔下来 */
      const twinkle = calm
        ? 0
        : Math.sin(env.time * 1.5 + star.orbit.phase * 2) * 0.18 * (0.4 + env.values.starTwinkle)
      coreMaterial.current.emissiveIntensity =
        (0.85 + env.values.glow * 0.5 + twinkle) * (lit ? 1.55 : 1) * rise
    }
    if (haloMaterial.current) {
      haloMaterial.current.opacity =
        (0.13 + env.values.starBrightness * 0.13) * (lit ? 1.7 : 1) * rise
    }
    if (ringMaterial.current) {
      ringMaterial.current.opacity = (lit ? 0.7 : 0.32) * rise
    }
  })

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    /* delta 是按下到抬起的指针位移，拖拽转星球时不应触发 */
    if (event.delta > 5) return
    event.stopPropagation()
    openStar(star.recordId)
  }

  return (
    <group rotation={[star.orbit.tiltX, 0, star.orbit.tiltZ]}>
      <group ref={spinRef}>
        <group
          ref={bodyRef}
          position={[star.orbit.radius, 0, 0]}
          onClick={handleClick}
          onPointerOver={(event) => {
            event.stopPropagation()
            setHovered(true)
          }}
          onPointerOut={() => setHovered(false)}
        >
          {/* 光晕：加色混合的软球，让星在深色宇宙里有体积感 */}
          <mesh>
            <sphereGeometry args={[0.058, 12, 9]} />
            <meshBasicMaterial
              ref={haloMaterial}
              color={hex}
              transparent
              opacity={0.18}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>

          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.078, 0.004, 6, 28]} />
            <meshBasicMaterial
              ref={ringMaterial}
              color={hex}
              transparent
              opacity={0.32}
              depthWrite={false}
            />
          </mesh>

          <mesh ref={coreRef}>
            <octahedronGeometry args={[0.03, 0]} />
            <meshStandardMaterial
              ref={coreMaterial}
              color="#FFFFFF"
              emissive={hex}
              emissiveIntensity={1}
              roughness={0.3}
            />
          </mesh>
        </group>
      </group>
    </group>
  )
}

export function MemoryStars({ env, calm }: { env: EnvRuntime; calm: boolean }) {
  const stars = usePlanetStore((state) => state.stars)
  if (stars.length === 0) return null

  const visible = stars.length > MAX_RENDERED ? stars.slice(-MAX_RENDERED) : stars

  return (
    <group name="memory-stars">
      {visible.map((star) => (
        <StarNode key={star.id} star={star} env={env} calm={calm} />
      ))}
    </group>
  )
}
