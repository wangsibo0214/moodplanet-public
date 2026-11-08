import { useRef } from 'react'
import { Float, Sparkles } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import type { CapsuleStatus } from '@/types/capsule'

/**
 * 时光胶囊 3D 场景：半透明玻璃胶囊 + 内芯微光 + 星尘。
 * 三种状态只改光与透明度，开启时外壳轻抬、内芯浮出，动作幅度小，不抢文字的注意力。
 */

interface Look {
  core: string
  coreIntensity: number
  shellOpacity: number
  halo: number
}

const LOOKS: Record<CapsuleStatus | 'empty', Look> = {
  sealed: { core: '#8F8BE0', coreIntensity: 0.55, shellOpacity: 0.3, halo: 0.1 },
  ready: { core: '#FFD9A8', coreIntensity: 1.15, shellOpacity: 0.38, halo: 0.17 },
  opened: { core: '#FFE9C4', coreIntensity: 1.5, shellOpacity: 0.16, halo: 0.24 },
  empty: { core: '#7C79C9', coreIntensity: 0.3, shellOpacity: 0.18, halo: 0.06 },
}

interface CapsuleSceneProps {
  status: CapsuleStatus | null
  calm: boolean
}

export function CapsuleScene({ status, calm }: CapsuleSceneProps) {
  const spinRef = useRef<THREE.Group>(null)
  const shellRef = useRef<THREE.Mesh>(null)
  const shellMatRef = useRef<THREE.MeshPhysicalMaterial>(null)
  const coreRef = useRef<THREE.Mesh>(null)
  const coreMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const haloRef = useRef<THREE.Mesh>(null)
  const haloMatRef = useRef<THREE.MeshBasicMaterial>(null)
  const targetColor = useRef(new THREE.Color('#8F8BE0'))

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const shellMat = shellMatRef.current
    const coreMat = coreMatRef.current
    const haloMat = haloMatRef.current
    const shell = shellRef.current
    const core = coreRef.current
    const halo = haloRef.current
    const spin = spinRef.current
    if (!shellMat || !coreMat || !haloMat || !shell || !core || !halo || !spin) return

    if (!calm) spin.rotation.y += dt * 0.18

    const look = LOOKS[status ?? 'empty']
    const k = 1 - Math.exp(-3 * dt)
    shellMat.opacity += (look.shellOpacity - shellMat.opacity) * k
    haloMat.opacity += (look.halo - haloMat.opacity) * k
    coreMat.emissive.lerp(targetColor.current.set(look.core), k)

    /* 到期时呼吸式微光，开启后改成更慢的余温起伏；calm 下完全静止 */
    const t = state.clock.elapsedTime
    const breathe =
      status === 'ready' && !calm
        ? Math.sin(t * 2.1) * 0.22
        : status === 'opened' && !calm
          ? Math.sin(t * 1.3) * 0.12
          : 0
    coreMat.emissiveIntensity = look.coreIntensity + breathe

    /* 开启反馈：外壳轻抬并后仰，内芯带着光晕浮出 */
    const lift = status === 'opened' ? 1 : 0
    shell.position.y += (lift * 0.42 - shell.position.y) * k
    shell.rotation.x += (lift * -0.3 - shell.rotation.x) * k
    core.position.y += (lift * 0.52 - core.position.y) * k
    halo.position.y = core.position.y
  })

  return (
    <>
      <group ref={spinRef}>
        <Float
          speed={calm ? 0 : 1.3}
          rotationIntensity={0.22}
          floatIntensity={0.55}
          floatingRange={[-0.08, 0.12]}
        >
          <mesh ref={shellRef}>
            <capsuleGeometry args={[0.62, 1.02, 8, 28]} />
            <meshPhysicalMaterial
              ref={shellMatRef}
              color="#BFD3FF"
              transparent
              opacity={0.3}
              roughness={0.14}
              metalness={0}
              clearcoat={0.6}
              clearcoatRoughness={0.3}
              depthWrite={false}
            />
          </mesh>

          {/* 内壁画一层背面材质，玻璃才有厚度感 */}
          <mesh scale={0.97}>
            <capsuleGeometry args={[0.62, 1.02, 8, 28]} />
            <meshBasicMaterial
              color="#8FA8FF"
              transparent
              opacity={0.08}
              side={THREE.BackSide}
              depthWrite={false}
            />
          </mesh>

          <mesh ref={coreRef}>
            <sphereGeometry args={[0.26, 24, 18]} />
            <meshStandardMaterial
              ref={coreMatRef}
              color="#241F45"
              emissive="#8F8BE0"
              emissiveIntensity={0.55}
              roughness={0.4}
            />
          </mesh>

          <mesh ref={haloRef} scale={1.45}>
            <sphereGeometry args={[0.62, 24, 18]} />
            <meshBasicMaterial
              ref={haloMatRef}
              color="#CFE0FF"
              transparent
              opacity={0.1}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </Float>
      </group>

      <Sparkles
        count={70}
        scale={[4.2, 2.6, 3.2]}
        size={2.4}
        speed={calm ? 0 : 0.22}
        opacity={0.55}
        color="#CFE0FF"
      />

      <ambientLight intensity={0.75} color="#C9C4FF" />
      <pointLight position={[1.8, 1.4, 2.2]} intensity={7} distance={9} color="#FFE1B4" />
      <pointLight position={[-2.2, -1.1, 1.6]} intensity={3.2} distance={8} color="#6FB6F0" />
    </>
  )
}
