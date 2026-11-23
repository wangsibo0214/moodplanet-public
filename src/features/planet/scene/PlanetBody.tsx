import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { bakeShoreMask } from '../lib/shoreMask'
import { buildPlanetGeometry, SEA_LEVEL } from '../lib/terrain'
import { fadeStep } from '../lib/unlockFade'
import type { EnvRuntime } from './moodEnvironment'
import { createSeaMaterial, createSeaUniforms } from './waterMaterial'

interface PlanetBodyProps {
  /**
   * IcosahedronGeometry 的细分列数：每个原始面被切成 (detail+1)² 个三角形，
   * 总数 = 20 * (detail+1)²。13 → 3920 面，9 → 2000 面。
   */
  detail: number
  env: EnvRuntime
  calm: boolean
  /** 已解锁「粼粼海面」 */
  shimmerSea: boolean
}

export function PlanetBody({ detail, env, calm, shimmerSea }: PlanetBodyProps) {
  const geometry = useMemo(() => buildPlanetGeometry(detail), [detail])
  /* 海面细分跟着地形档位走：波浪要读得出低多边形 facets，又不能白给手机端加面数 */
  const seaWidth = detail >= 13 ? 64 : 48
  const shore = useMemo(() => {
    const width = detail >= 13 ? 256 : 128
    const height = width / 2
    const texture = new THREE.DataTexture(
      bakeShoreMask(width, height),
      width,
      height,
      THREE.RedFormat,
    )
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.wrapS = THREE.RepeatWrapping
    texture.needsUpdate = true
    return texture
  }, [detail])
  const uniforms = useMemo(() => createSeaUniforms(shore), [shore])
  const sea = useMemo(() => createSeaMaterial(uniforms), [uniforms])
  const shimmerFade = useRef(0)
  /* 逐帧写入的 GPU 资源用 ref 持有，与植被材质同一约定 */
  const liveSea = useRef(sea)
  const liveUniforms = useRef(uniforms)

  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(
    () => () => {
      shore.dispose()
      sea.dispose()
    },
    [shore, sea],
  )

  useFrame((_, dt) => {
    /* 平静时粗糙度压到接近镜面，雨后则更湿亮；两者读起来都是「水面很稳」 */
    liveSea.current.roughness = env.values.waterRoughness
    liveSea.current.opacity = env.values.waterOpacity
    liveSea.current.emissiveIntensity = env.values.waterEmissive
    liveUniforms.current.uTime.value = env.time
    liveUniforms.current.uGlow.value = env.values.glow
    shimmerFade.current = fadeStep(shimmerFade.current, shimmerSea ? 1 : 0, dt, calm)
    liveUniforms.current.uShimmer.value = shimmerFade.current
  })

  return (
    <group>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial vertexColors flatShading roughness={0.94} metalness={0} />
      </mesh>

      {/* 海平面薄壳：只盖住低洼处，让陆地自然露出来 */}
      <mesh material={sea}>
        <sphereGeometry args={[SEA_LEVEL * 1.004, seaWidth, Math.round(seaWidth * 0.75)]} />
      </mesh>
    </group>
  )
}