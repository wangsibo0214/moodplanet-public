import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { between, createRandom, oneOf } from '@/utils/random'

import {
  pickEvenly,
  sampleSurfacePoints,
  writeSurfaceMatrix,
  type SurfacePoint,
} from '../lib/terrain'
import { blocksCompanionView, COMPANION_HOME_DIR } from './companionPlacement'
import { Instances } from './Instances'
import type { EnvRuntime } from './moodEnvironment'
import { createPlantMaterial, createPlantUniforms, type PlantUniforms } from './plantMaterial'

export type VegetationQuality = 'reduced' | 'normal'

/** 面数预算：normal ≈ 4.6k 三角面，reduced ≈ 1.1k。解锁物只在真的解锁时才生成。 */
const COUNTS: Record<
  VegetationQuality,
  {
    candidates: number
    trees: number
    grass: number
    flowers: number
    rocks: number
    dew: number
    glowFlowers: number
    crystals: number
  }
> = {
  reduced: {
    candidates: 1500,
    trees: 26,
    grass: 80,
    flowers: 14,
    rocks: 6,
    dew: 16,
    glowFlowers: 12,
    crystals: 5,
  },
  normal: {
    candidates: 3400,
    trees: 64,
    grass: 220,
    flowers: 40,
    rocks: 13,
    dew: 34,
    glowFlowers: 22,
    crystals: 9,
  },
}

const TRUNK = ['#8A6A4E', '#7C5F45', '#96755A']
const LEAF = ['#4F9E67', '#5FB277', '#3E8C58', '#6BBB7E']
const GRASS = ['#6FBF7E', '#57A46B', '#8CCB8C', '#4E9E67']
const FLOWER = ['#FFD170', '#FFA3BE', '#BFB0FB', '#FFF0C2', '#7BD9BC']
const ROCK = ['#948CB4', '#7E7799', '#A9A2C2']
/** 星屑花：偏冷的白与淡紫，和地表暖绿拉开一层，才读得出是「新长出来的」 */
const GLOW_FLOWER = ['#FFF3D6', '#E8DEFF', '#D6F3FF']

interface PartSpec {
  /** 沿地表法线抬高的基准值，实际抬高 = offset * s */
  offset: number
  /** 缩放基准，实际缩放 = 分量 * s */
  scale: [number, number, number]
  palette: readonly string[]
}

const TREE_PARTS: readonly PartSpec[] = [
  { offset: 0.025, scale: [1, 1, 1], palette: TRUNK },
  /* 树冠刻意做得矮胖：细长的圆锥在星球轮廓边缘会像一圈尖刺 */
  { offset: 0.058, scale: [1, 1, 1], palette: LEAF },
  { offset: 0.094, scale: [1, 1, 1], palette: LEAF },
]
const GRASS_PARTS: readonly PartSpec[] = [
  { offset: 0.022, scale: [0.75, 1, 1.5], palette: GRASS },
]
const FLOWER_PARTS: readonly PartSpec[] = [
  { offset: 0.018, scale: [1, 1, 1], palette: GRASS },
  { offset: 0.04, scale: [1, 0.78, 1], palette: FLOWER },
]
const ROCK_PARTS: readonly PartSpec[] = [
  { offset: 0.014, scale: [1.15, 0.72, 0.95], palette: ROCK },
]
const GLOW_FLOWER_PARTS: readonly PartSpec[] = [
  { offset: 0.014, scale: [0.8, 1.1, 0.8], palette: GRASS },
  { offset: 0.032, scale: [1, 0.85, 1], palette: GLOW_FLOWER },
]
/** 晶石拉长，簇生在高原上才看得出是装饰而不是一块普通石头 */
const CRYSTAL_PARTS: readonly PartSpec[] = [
  { offset: 0.02, scale: [0.6, 1.9, 0.6], palette: ['#BFE2FF'] },
  { offset: 0.014, scale: [0.45, 1.2, 0.45], palette: ['#D8CEFF'] },
]
/** 水珠挂在草尖与花头上 */
const DEW_PARTS: readonly PartSpec[] = [
  { offset: 0.055, scale: [1, 1, 1], palette: ['#CFE9FF'] },
]

interface Placement {
  matrices: THREE.Matrix4[]
  colors: THREE.Color[]
}

const NO_PLACEMENT: Placement[] = [{ matrices: [], colors: [] }]

function inBand(min: number, max: number) {
  return (point: SurfacePoint) => point.elevation >= min && point.elevation <= max
}

/** 伙伴家门口留一块空地：只剔除落在那一小片里的已选点，其余植被位置完全不变。 */
const HOME_CLEAR_DOT = Math.cos((12 * Math.PI) / 180)

function awayFromCompanionHome(point: SurfacePoint): boolean {
  return point.dir.dot(COMPANION_HOME_DIR) < HOME_CLEAR_DOT
}

/** 把一批地表点展开成「每个部件一份实例矩阵 + 实例色」。 */
function scatter(
  points: readonly SurfacePoint[],
  random: () => number,
  parts: readonly PartSpec[],
  scaleRange: readonly [number, number],
): Placement[] {
  const result: Placement[] = parts.map(() => ({ matrices: [], colors: [] }))
  const color = new THREE.Color()
  const scale = new THREE.Vector3()

  for (const point of points) {
    const s = between(random, scaleRange[0], scaleRange[1])
    const spin = between(random, 0, Math.PI * 2)
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      color.set(oneOf(random, part.palette))
      scale.set(part.scale[0] * s, part.scale[1] * s, part.scale[2] * s)
      const matrix = new THREE.Matrix4()
      writeSurfaceMatrix(matrix, point, part.offset * s, scale, spin)
      result[i].matrices.push(matrix)
      result[i].colors.push(color.clone())
    }
  }

  return result
}

interface Layout {
  tree: Placement[]
  grass: Placement[]
  flower: Placement[]
  rock: Placement[]
  dew: Placement[]
  glowFlower: Placement[]
  crystal: Placement[]
}

function buildLayout(quality: VegetationQuality, glowFlower: boolean, crystal: boolean): Layout {
  const counts = COUNTS[quality]
  const random = createRandom(0x5eed1e5)
  const land = sampleSurfacePoints(counts.candidates, 0.05, 0.66)

  const treePoints = pickEvenly(land.filter(inBand(0.1, 0.46)), counts.trees).filter(
    (point) => awayFromCompanionHome(point) && !blocksCompanionView(point.dir, point.radius, 0.2),
  )
  const grassPoints = pickEvenly(land.filter(inBand(0.065, 0.34)), counts.grass).filter(
    (point) => awayFromCompanionHome(point) && !blocksCompanionView(point.dir, point.radius, 0.08),
  )
  const flowerPoints = pickEvenly(land.filter(inBand(0.075, 0.28)), counts.flowers).filter(
    (point) => awayFromCompanionHome(point) && !blocksCompanionView(point.dir, point.radius, 0.07),
  )
  const rockPoints = pickEvenly(land.filter(inBand(0.33, 0.64)), counts.rocks).filter(
    (point) => awayFromCompanionHome(point) && !blocksCompanionView(point.dir, point.radius, 0.05),
  )

  return {
    tree: scatter(treePoints, random, TREE_PARTS, [0.75, 1.45]),
    grass: scatter(grassPoints, random, GRASS_PARTS, [0.7, 1.4]),
    flower: scatter(flowerPoints, random, FLOWER_PARTS, [0.8, 1.35]),
    rock: scatter(rockPoints, random, ROCK_PARTS, [0.6, 1.5]),
    /* 水珠挂在已经存在的草与花上，不另外采点，保证「就是这些植物上的水珠」 */
    dew: scatter(
      pickEvenly([...grassPoints, ...flowerPoints], counts.dew),
      random,
      DEW_PARTS,
      [0.55, 1.1],
    ),
    /* 解锁物排在基础植被之后抽取：随机数消耗顺序不变，
       刚长出新植物时已有的树和草不会跳位置。 */
    glowFlower: glowFlower
      ? scatter(
          pickEvenly(land.filter(inBand(0.08, 0.3)), counts.glowFlowers).filter(
            (point) =>
              awayFromCompanionHome(point) && !blocksCompanionView(point.dir, point.radius, 0.06),
          ),
          random,
          GLOW_FLOWER_PARTS,
          [0.75, 1.25],
        )
      : NO_PLACEMENT,
    crystal: crystal
      ? scatter(
          pickEvenly(land.filter(inBand(0.34, 0.6)), counts.crystals).filter(
            (point) =>
              awayFromCompanionHome(point) && !blocksCompanionView(point.dir, point.radius, 0.1),
          ),
          random,
          CRYSTAL_PARTS,
          [0.7, 1.5],
        )
      : NO_PLACEMENT,
  }
}

interface Assets {
  geometries: Record<string, THREE.BufferGeometry>
  plant: THREE.MeshStandardMaterial
  bloom: THREE.MeshStandardMaterial
  dew: THREE.MeshStandardMaterial
  glow: THREE.MeshStandardMaterial
  crystal: THREE.MeshStandardMaterial
}

function createAssets(uniforms: PlantUniforms): Assets {
  return {
    geometries: {
      trunk: new THREE.CylinderGeometry(0.0085, 0.013, 0.05, 5),
      foliageLow: new THREE.ConeGeometry(0.048, 0.052, 6),
      foliageHigh: new THREE.ConeGeometry(0.033, 0.044, 6),
      grass: new THREE.ConeGeometry(0.011, 0.05, 4),
      stem: new THREE.CylinderGeometry(0.0028, 0.0035, 0.036, 4),
      flowerHead: new THREE.SphereGeometry(0.0135, 8, 6),
      rock: new THREE.DodecahedronGeometry(0.026, 0),
      dew: new THREE.SphereGeometry(0.0062, 6, 5),
      glowStem: new THREE.CylinderGeometry(0.0022, 0.003, 0.028, 4),
      glowHead: new THREE.SphereGeometry(0.0105, 8, 6),
      crystal: new THREE.OctahedronGeometry(0.021, 0),
    },
    plant: createPlantMaterial(false, uniforms),
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
  }
}

export interface VegetationProps {
  quality: VegetationQuality
  /** 风、花开度、水珠都从这份运行时读；calm 时它的 time 不推进，风自然就停了 */
  env: EnvRuntime
  /** 已解锁「星屑花」 */
  glowFlower: boolean
  /** 已解锁「晶石簇」 */
  crystal: boolean
}

export function Vegetation({ quality, env, glowFlower, crystal }: VegetationProps) {
  /* uniform 必须先于材质创建：两份材质共用同一组，每帧只写一次 */
  const uniforms = useMemo(() => createPlantUniforms(), [])
  const assets = useMemo<Assets>(() => createAssets(uniforms), [uniforms])
  /* 逐帧写入的对象用 ref 持有：它们是 GPU 资源，不是渲染期的不可变值 */
  const liveUniforms = useRef(uniforms)
  const bloom = useRef(assets.bloom)
  const dew = useRef(assets.dew)
  const layout = useMemo(
    () => buildLayout(quality, glowFlower, crystal),
    [quality, glowFlower, crystal],
  )

  useEffect(
    () => () => {
      for (const geometry of Object.values(assets.geometries)) geometry.dispose()
      assets.plant.dispose()
      assets.bloom.dispose()
      assets.dew.dispose()
      assets.glow.dispose()
      assets.crystal.dispose()
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
        material={assets.plant}
        matrices={layout.rock[0].matrices}
        colors={layout.rock[0].colors}
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
    </group>
  )
}
