import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

interface InstancesProps {
  geometry: THREE.BufferGeometry
  material: THREE.Material
  matrices: readonly THREE.Matrix4[]
  colors: readonly THREE.Color[]
  castShadow?: boolean
  receiveShadow?: boolean
}

/**
 * instancedMesh 的薄封装。
 * args 必须是稳定引用的元组，否则 R3F 每次渲染都会重建整个 InstancedMesh。
 */
export function Instances({
  geometry,
  material,
  matrices,
  colors,
  castShadow = false,
  receiveShadow = false,
}: InstancesProps) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const count = matrices.length
  const args = useMemo<[THREE.BufferGeometry, THREE.Material, number]>(
    () => [geometry, material, count],
    [geometry, material, count],
  )

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    for (let i = 0; i < count; i++) {
      mesh.setMatrixAt(i, matrices[i])
      mesh.setColorAt(i, colors[i])
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [count, matrices, colors])

  if (count === 0) return null

  return (
    <instancedMesh
      ref={ref}
      args={args}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      frustumCulled={false}
    />
  )
}
