import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import type { GroundField } from '../lib/groundField'
import { Instances } from './Instances'
import type { EnvRuntime } from './moodEnvironment'
import { createPlantMaterial, createPlantUniforms, createRockMaterial, type PlantUniforms } from './plantMaterial'
import { PLANT_SHAPES, createPlantGeometry, type PlantShapeKind } from './plantShapes'
import { buildLayout, type VegetationQuality } from './vegetationPlacement'

interface Assets {
  /** 按 PlantShapeKind 全量收齐：少建一个部件编译就报错，而不是运行时喂给 InstancedMesh undefined */
  geometries: Record<PlantShapeKind, THREE.BufferGeometry>
  plant: THREE.MeshStandardMaterial
  rock: THREE.MeshStandardMaterial
  bloom: THREE.MeshStandardMaterial
  dew: THREE.MeshStandardMaterial
  glow: THREE.MeshStandardMaterial
  crystal: THREE.MeshStandardMaterial
  mushroom: THREE.MeshStandardMaterial
}

function createAssets(uniforms: PlantUniforms): Assets {
  return {
    geometries: {
      trunk: createPlantGeometry(PLANT_SHAPES.trunk),
      foliageLow: createPlantGeometry(PLANT_SHAPES.foliageLow),
      foliageHigh: createPlantGeometry(PLANT_SHAPES.foliageHigh),
      grass: createPlantGeometry(PLANT_SHAPES.grass),
      stem: createPlantGeometry(PLANT_SHAPES.stem),
      flowerHead: createPlantGeometry(PLANT_SHAPES.flowerHead),
      rock: createPlantGeometry(PLANT_SHAPES.rock),
      dew: createPlantGeometry(PLANT_SHAPES.dew),
      glowStem: createPlantGeometry(PLANT_SHAPES.glowStem),
      glowHead: createPlantGeometry(PLANT_SHAPES.glowHead),
      crystal: createPlantGeometry(PLANT_SHAPES.crystal),
      mushroomStem: createPlantGeometry(PLANT_SHAPES.mushroomStem),
      mushroomCap: createPlantGeometry(PLANT_SHAPES.mushroomCap),
    },
    plant: createPlantMaterial(false, uniforms),
    /* 石头用静态材质：不随风摆、不随花开度胀缩 */
    rock: createRockMaterial(),
    bloom: createPlantMaterial(true, uniforms),
    /* 水珠：低粗糙度加一点自发光，才像挂着的水而不是灰点 */
    dew: new THREE.MeshStandardMaterial({
      color: '#CFE9FF',
      emissive: '#7FA8DC',
      emissiveIntensity: 0.35,
      roughness: 0.06,
      metalness: 0,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
    glow: new THREE.MeshStandardMaterial({
      color: '#FFF6DE',
      emissive: '#FFD9A0',
      emissiveIntensity: 0.85,
      roughness: 0.5,
      metalness: 0,
      flatShading: true,
    }),
    crystal: new THREE.MeshStandardMaterial({
      color: '#BFE2FF',
      emissive: '#6E8FE0',
      emissiveIntensity: 0.55,
      roughness: 0.14,
      metalness: 0,
      transparent: true,
      opacity: 0.62,
      flatShading: true,
      depthWrite: false,
    }),
    mushroom: new THREE.MeshStandardMaterial({
      color: '#DCEBFF',
      emissive: '#7FB8E0',
      emissiveIntensity: 0.7,
      roughness: 0.45,
      metalness: 0,
      flatShading: true,
    }),
  }
}

export interface VegetationProps {
  quality: VegetationQuality
  /** 渲染网格的真实地表高度场：选址的干地判断以它为准 */
  ground: GroundField
  /** 风、花开度、水珠都从这份运行时读；calm 时它的 time 不推进，风自然就停了 */
  env: EnvRuntime
  /** 已解锁「星屑花」 */
  glowFlower: boolean
  /** 已解锁「晶石簇」 */
  crystal: boolean
  /** 已解锁「发光蘑菇丛」 */
  glowMushroom: boolean
}

export function Vegetation({
  quality,
  ground,
  env,
  glowFlower,
  crystal,
  glowMushroom,
}: VegetationProps) {
  /* uniform 必须先于材质创建：两份材质共用同一组，每帧只写一次 */
  const uniforms = useMemo(() => createPlantUniforms(), [])
  const assets = useMemo<Assets>(() => createAssets(uniforms), [uniforms])
  /* 逐帧写入的对象用 ref 持有：它们是 GPU 资源，不是渲染期的不可变值 */
  const liveUniforms = useRef(uniforms)
  const bloom = useRef(assets.bloom)
  const dew = useRef(assets.dew)
  const layout = useMemo(
    () => buildLayout(quality, ground, glowFlower, crystal, glowMushroom),
    [quality, ground, glowFlower, crystal, glowMushroom],
  )

  useEffect(
    () => () => {
      for (const geometry of Object.values(assets.geometries)) geometry.dispose()
      assets.plant.dispose()
      assets.rock.dispose()
      assets.bloom.dispose()
      assets.dew.dispose()
      assets.glow.dispose()
      assets.crystal.dispose()
      assets.mushroom.dispose()
    },
    [assets],
  )

  useFrame(() => {
    liveUniforms.current.uTime.value = env.time
    liveUniforms.current.uWind.value = env.values.wind
    liveUniforms.current.uBloom.value = env.values.bloom
    /* 花开过一半才开始透光，避免基线状态下花头就在发亮 */
    bloom.current.emissiveIntensity = Math.max(0, env.values.bloom - 0.45) * 0.55
    dew.current.opacity = env.values.dew * 0.85
    /* 没有雨后水珠时整批实例直接不渲染，省掉透明片元的排序开销 */
    dew.current.visible = env.values.dew > 0.01
  })

  const { geometries } = assets

  return (
    <group>
      <Instances
        geometry={geometries.trunk}
        material={assets.plant}
        matrices={layout.tree[0].matrices}
        colors={layout.tree[0].colors}
        castShadow
      />
      <Instances
        geometry={geometries.foliageLow}
        material={assets.plant}
        matrices={layout.tree[1].matrices}
        colors={layout.tree[1].colors}
        castShadow
      />
      <Instances
        geometry={geometries.foliageHigh}
        material={assets.plant}
        matrices={layout.tree[2].matrices}
        colors={layout.tree[2].colors}
        castShadow
      />
      <Instances
        geometry={geometries.grass}
        material={assets.plant}
        matrices={layout.grass[0].matrices}
        colors={layout.grass[0].colors}
      />
      <Instances
        geometry={geometries.stem}
        material={assets.plant}
        matrices={layout.flower[0].matrices}
        colors={layout.flower[0].colors}
      />
      {/* 花头单独一份材质：只有它参与「开放度」缩放与暖光 */}
      <Instances
        geometry={geometries.flowerHead}
        material={assets.bloom}
        matrices={layout.flower[1].matrices}
        colors={layout.flower[1].colors}
      />
      <Instances
        geometry={geometries.rock}
        material={assets.rock}
        matrices={layout.rock[0].matrices}
        colors={layout.rock[0].colors}
        castShadow
      />
      <Instances
        geometry={geometries.rock}
        material={assets.rock}
        matrices={layout.rockBuddy[0].matrices}
        colors={layout.rockBuddy[0].colors}
        castShadow
      />

      {/* 雨后的水珠：难过时逐渐浮现，其余时候整批不渲染 */}
      <Instances
        geometry={geometries.dew}
        material={assets.dew}
        matrices={layout.dew[0].matrices}
        colors={layout.dew[0].colors}
      />

      {glowFlower && (
        <>
          <Instances
            geometry={geometries.glowStem}
            material={assets.plant}
            matrices={layout.glowFlower[0].matrices}
            colors={layout.glowFlower[0].colors}
          />
          <Instances
            geometry={geometries.glowHead}
            material={assets.glow}
            matrices={layout.glowFlower[1].matrices}
            colors={layout.glowFlower[1].colors}
          />
        </>
      )}

      {crystal && (
        <>
          <Instances
            geometry={geometries.crystal}
            material={assets.crystal}
            matrices={layout.crystal[0].matrices}
            colors={layout.crystal[0].colors}
          />
          <Instances
            geometry={geometries.crystal}
            material={assets.crystal}
            matrices={layout.crystal[1].matrices}
            colors={layout.crystal[1].colors}
          />
        </>
      )}

      {glowMushroom && (
        <>
          <Instances
            geometry={geometries.mushroomStem}
            material={assets.plant}
            matrices={layout.mushroom[0].matrices}
            colors={layout.mushroom[0].colors}
          />
          <Instances
            geometry={geometries.mushroomCap}
            material={assets.mushroom}
            matrices={layout.mushroom[1].matrices}
            colors={layout.mushroom[1].colors}
          />
        </>
      )}
    </group>
  )
}