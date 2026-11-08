import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { fbm3 } from '../lib/noise'
import type { EnvRuntime } from './moodEnvironment'

/**
 * 云层。
 *
 * 半径取 1.3：地表最高约 1.17、树梢约 1.22，所以云浮在林冠之上；
 * 伙伴头顶约 1.4，会略微高出云面，读起来像「它站在雾上面」，不是穿模。
 * 云壳不跟着星球自转，而是自己缓慢漂移，这样才看得出是天气在动而不是星球在转。
 */
const CLOUD_RADIUS = 1.3
const TEXTURE_WIDTH = 256
const TEXTURE_HEIGHT = 128
const CLOUD_FREQUENCY = 2.2
/** 阈值抬高一点，云才是成片的团块，而不是糊满整个球 */
const COVERAGE_BIAS = 0.16

function buildCloudTexture(): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = TEXTURE_WIDTH
  canvas.height = TEXTURE_HEIGHT
  const ctx = canvas.getContext('2d')

  if (ctx) {
    const image = ctx.createImageData(TEXTURE_WIDTH, TEXTURE_HEIGHT)
    const dir = new THREE.Vector3()

    for (let y = 0; y < TEXTURE_HEIGHT; y++) {
      const phi = ((y + 0.5) / TEXTURE_HEIGHT) * Math.PI
      const sinPhi = Math.sin(phi)
      const cosPhi = Math.cos(phi)
      for (let x = 0; x < TEXTURE_WIDTH; x++) {
        const theta = ((x + 0.5) / TEXTURE_WIDTH) * Math.PI * 2
        /* 按方向向量采样 3D 噪声：经度接缝与两极都不会裂开 */
        dir.set(sinPhi * Math.cos(theta), cosPhi, sinPhi * Math.sin(theta))
        const n = fbm3(
          dir.x * CLOUD_FREQUENCY,
          dir.y * CLOUD_FREQUENCY,
          dir.z * CLOUD_FREQUENCY,
          4,
        )
        let alpha = (n + COVERAGE_BIAS) * 1.4
        alpha = alpha < 0 ? 0 : alpha > 1 ? 1 : alpha
        /* smoothstep 让云边柔和，避免噪声阈值切出硬边 */
        alpha = alpha * alpha * (3 - 2 * alpha)

        const i = (y * TEXTURE_WIDTH + x) * 4
        image.data[i] = 255
        image.data[i + 1] = 255
        image.data[i + 2] = 255
        image.data[i + 3] = Math.round(alpha * 235)
      }
    }
    ctx.putImageData(image, 0, 0)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export function CloudLayer({ env, calm }: { env: EnvRuntime; calm: boolean }) {
  const texture = useMemo(() => buildCloudTexture(), [])
  const material = useRef<THREE.MeshStandardMaterial>(null)
  const group = useRef<THREE.Group>(null)

  useEffect(() => () => texture.dispose(), [texture])

  useFrame((_, dt) => {
    if (material.current) {
      material.current.opacity = env.values.cloudOpacity
      /* 云量为零时完全不参与渲染，省下整个球壳的透明排序与片元开销 */
      material.current.visible = env.values.cloudOpacity > 0.004
    }
    if (group.current && !calm) {
      group.current.rotation.y += Math.min(dt, 0.05) * env.values.cloudSpeed
    }
  })

  return (
    <group ref={group} rotation={[0, 0, 0.18]}>
      <mesh renderOrder={1}>
        <sphereGeometry args={[CLOUD_RADIUS, 48, 32]} />
        <meshStandardMaterial
          ref={material}
          map={texture}
          transparent
          opacity={0}
          depthWrite={false}
          roughness={1}
          metalness={0}
        />
      </mesh>
    </group>
  )
}
