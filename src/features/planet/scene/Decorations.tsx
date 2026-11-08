import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { between, createRandom } from '@/utils/random'

import { Instances } from './Instances'
import type { EnvRuntime } from './moodEnvironment'

/**
 * 解锁的星球装饰。
 * 环带半径 1.26 是刻意选的：地表最高约 1.17、树冠约 1.22、记忆星轨道从 1.36 起，
 * 所以灯环贴在树冠之上，又不会和记忆星挤在同一圈里。
 */
const RING_RADIUS = 1.26
const LANTERN_COUNT = 14
const SPIN_SPEED = 0.09
const LANTERN_TINTS = ['#FFF6DE', '#FFE9C4', '#F3E8FF'] as const

interface RingAssets {
  geometry: THREE.IcosahedronGeometry
  material: THREE.MeshStandardMaterial
  matrices: THREE.Matrix4[]
  colors: THREE.Color[]
}

function buildRing(): RingAssets {
  const random = createRandom(0x1a27e1)
  const matrices: THREE.Matrix4[] = []
  const colors: THREE.Color[] = []
  const position = new THREE.Vector3()
  const quaternion = new THREE.Quaternion()
  const scale = new THREE.Vector3()
  const color = new THREE.Color()

  for (let i = 0; i < LANTERN_COUNT; i++) {
    const angle = (i / LANTERN_COUNT) * Math.PI * 2
    const radius = RING_RADIUS + between(random, -0.035, 0.035)
    position.set(Math.cos(angle) * radius, between(random, -0.09, 0.09), Math.sin(angle) * radius)
    scale.setScalar(between(random, 0.78, 1.24))
    matrices.push(new THREE.Matrix4().compose(position, quaternion, scale))
    colors.push(
      color.set(LANTERN_TINTS[Math.floor(random() * LANTERN_TINTS.length)]).clone(),
    )
  }

  return {
    geometry: new THREE.IcosahedronGeometry(0.023, 0),
    material: new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      emissive: '#FFC98A',
      emissiveIntensity: 0.9,
      roughness: 0.5,
      metalness: 0,
    }),
    matrices,
    colors,
  }
}

function LanternRing({ env }: { env: EnvRuntime }) {
  const assets = useMemo(() => buildRing(), [])
  const group = useRef<THREE.Group>(null)
  /* 逐帧要写 emissiveIntensity，用 ref 持有：three 资源是可变对象，不该被当成渲染期常量 */
  const material = useRef(assets.material)

  useEffect(
    () => () => {
      assets.geometry.dispose()
      assets.material.dispose()
    },
    [assets],
  )

  useFrame(() => {
    if (group.current) group.current.rotation.y = env.time * SPIN_SPEED
    /* 14 盏灯共用一份材质，所以整条环带同频呼吸；个体差异交给随机大小、高度与底色 */
    const breathe = 0.86 + Math.sin(env.time * 1.15) * 0.14
    material.current.emissiveIntensity = breathe * (0.75 + env.values.glow * 0.55)
  })

  return (
    <group ref={group} rotation={[0.3, 0, 0.14]}>
      <Instances
        geometry={assets.geometry}
        material={assets.material}
        matrices={assets.matrices}
        colors={assets.colors}
      />
    </group>
  )
}

export function Decorations({ env, lanternRing }: { env: EnvRuntime; lanternRing: boolean }) {
  if (!lanternRing) return null
  return (
    <group name="decorations">
      <LanternRing env={env} />
    </group>
  )
}
