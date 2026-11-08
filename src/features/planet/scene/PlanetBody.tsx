import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { buildPlanetGeometry, SEA_LEVEL } from '../lib/terrain'
import type { EnvRuntime } from './moodEnvironment'

interface PlanetBodyProps {
  /**
   * IcosahedronGeometry 的细分列数：每个原始面被切成 (detail+1)² 个三角形，
   * 总数 = 20 * (detail+1)²。13 → 3920 面，9 → 2000 面。
   */
  detail: number
  env: EnvRuntime
}

export function PlanetBody({ detail, env }: PlanetBodyProps) {
  const geometry = useMemo(() => buildPlanetGeometry(detail), [detail])
  const sea = useRef<THREE.MeshStandardMaterial>(null)

  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame(() => {
    if (!sea.current) return
    /* 平静时粗糙度压到接近镜面，雨后则更湿亮；两者读起来都是「水面很稳」 */
    sea.current.roughness = env.values.waterRoughness
    sea.current.opacity = env.values.waterOpacity
    sea.current.emissiveIntensity = env.values.waterEmissive
  })

  return (
    <group>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial vertexColors flatShading roughness={0.94} metalness={0} />
      </mesh>

      {/* 海平面薄壳：只盖住低洼处，让陆地自然露出来 */}
      <mesh>
        <sphereGeometry args={[SEA_LEVEL * 1.004, 48, 32]} />
        <meshStandardMaterial
          ref={sea}
          color="#4E9BDD"
          emissive="#123A5E"
          emissiveIntensity={0.45}
          roughness={0.16}
          metalness={0.05}
          transparent
          opacity={0.78}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
