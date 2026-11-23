import * as THREE from 'three'

import { between, createRandom, oneOf } from '@/utils/random'

import { groundRadiusAt, isDryGround, type GroundField } from '../lib/groundField'
import {
  pickEvenly,
  sampleSurfacePoints,
  writeSurfaceMatrix,
  type SurfacePoint,
} from '../lib/terrain'
import { blocksCompanionView, COMPANION_HOME_DIR } from './companionPlacement'
import {
  findMountainSites,
  flattenPeaks,
  MOUNTAIN_COUNTS,
  mountainClearance,
  type PeakSpec,
} from './mountainPlacement'
import { categoryExtent, type ObjectExtent, type PlantShapeKind } from './plantShapes'

/**
 * 植被选址与实例展开：纯函数、确定性，不碰 DOM 也不开动画循环。
 * 与 mountainPlacement 同一套路——组件只负责把矩阵喂给 Instances，
 * 「长在哪、长多大」全部在这里判完，可以直接单测。
 */

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
    mushrooms: number
  }
> = {
  reduced: {
    candidates: 1500,
    trees: 26,
    grass: 80,
    flowers: 14,
    rocks: 9,
    dew: 16,
    glowFlowers: 12,
    crystals: 5,
    mushrooms: 8,
  },
  normal: {
    candidates: 3400,
    trees: 64,
    grass: 220,
    flowers: 40,
    rocks: 18,
    dew: 34,
    glowFlowers: 22,
    crystals: 9,
    mushrooms: 16,
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
  /** 用哪份几何尺寸（与 Vegetation.tsx 建几何同一份，避让才不会按想象中的尺寸留空） */
  shape: PlantShapeKind
  palette: readonly string[]
}

const TREE_PARTS: readonly PartSpec[] = [
  { offset: 0.025, scale: [1, 1, 1], shape: 'trunk', palette: TRUNK },
  /* 树冠刻意做得矮胖：细长的圆锥在星球轮廓边缘会像一圈尖刺 */
  { offset: 0.058, scale: [1, 1, 1], shape: 'foliageLow', palette: LEAF },
  { offset: 0.094, scale: [1, 1, 1], shape: 'foliageHigh', palette: LEAF },
]
const GRASS_PARTS: readonly PartSpec[] = [
  { offset: 0.022, scale: [0.75, 1, 1.5], shape: 'grass', palette: GRASS },
]
const FLOWER_PARTS: readonly PartSpec[] = [
  { offset: 0.018, scale: [1, 1, 1], shape: 'stem', palette: GRASS },
  { offset: 0.04, scale: [1, 0.78, 1], shape: 'flowerHead', palette: FLOWER },
]
const ROCK_PARTS: readonly PartSpec[] = [
  { offset: 0.02, scale: [1.25, 0.8, 1.05], shape: 'rock', palette: ROCK },
]
/** 伴石：主石脚边的小石块，成簇才读得出是「一片乱石」而不是孤零零一颗 */
const ROCK_BUDDY_PARTS: readonly PartSpec[] = [
  { offset: 0.012, scale: [0.62, 0.5, 0.62], shape: 'rock', palette: ROCK },
]
const GLOW_FLOWER_PARTS: readonly PartSpec[] = [
  { offset: 0.014, scale: [0.8, 1.1, 0.8], shape: 'glowStem', palette: GRASS },
  { offset: 0.032, scale: [1, 0.85, 1], shape: 'glowHead', palette: GLOW_FLOWER },
]
/** 晶石拉长，簇生在高原上才看得出是装饰而不是一块普通石头 */
const CRYSTAL_PARTS: readonly PartSpec[] = [
  { offset: 0.02, scale: [0.6, 1.9, 0.6], shape: 'crystal', palette: ['#BFE2FF'] },
  { offset: 0.014, scale: [0.45, 1.2, 0.45], shape: 'crystal', palette: ['#D8CEFF'] },
]
/** 水珠挂在草尖与花头上 */
const DEW_PARTS: readonly PartSpec[] = [
  { offset: 0.055, scale: [1, 1, 1], shape: 'dew', palette: ['#CFE9FF'] },
]
/** 蘑菇：冷光伞盖，和星屑花的暖光错开；高程带落在森林里 */
const MUSHROOM_CAP = ['#BFE2FF', '#D8CEFF', '#A6E9D2']
const MUSHROOM_PARTS: readonly PartSpec[] = [
  { offset: 0.012, scale: [0.55, 0.8, 0.55], shape: 'mushroomStem', palette: ['#E8E0F0'] },
  { offset: 0.026, scale: [1.15, 0.62, 1.15], shape: 'mushroomCap', palette: MUSHROOM_CAP },
]

interface Placement {
  matrices: THREE.Matrix4[]
  colors: THREE.Color[]
}

const NO_PLACEMENT: Placement[] = [{ matrices: [], colors: [] }]

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
  rockBuddy: Placement[]
  dew: Placement[]
  glowFlower: Placement[]
  crystal: Placement[]
  mushroom: Placement[]
}

/** 岸线缓冲：树留得最宽，沙滩上不该有树；草花可以贴近浪线一点。 */
const DRY_MARGIN = {
  tree: 0.008,
  grass: 0.004,
  flower: 0.004,
  rock: 0.004,
  glowFlower: 0.005,
  crystal: 0.006,
  mushroom: 0.005,
} as const

/** 各类物件的缩放区间：实例展开与下面的最大外廓共用，改上限避让自动跟着变。 */
const SCALE_RANGE = {
  tree: [0.75, 1.45],
  grass: [0.7, 1.4],
  flower: [0.8, 1.35],
  rock: [0.85, 1.9],
  rockBuddy: [0.7, 1.3],
  dew: [0.55, 1.1],
  glowFlower: [0.75, 1.25],
  crystal: [0.7, 1.5],
  mushroom: [0.8, 1.4],
} as const

const CATEGORY_PARTS = {
  tree: TREE_PARTS,
  grass: GRASS_PARTS,
  flower: FLOWER_PARTS,
  rock: ROCK_PARTS,
  rockBuddy: ROCK_BUDDY_PARTS,
  dew: DEW_PARTS,
  glowFlower: GLOW_FLOWER_PARTS,
  crystal: CRYSTAL_PARTS,
  mushroom: MUSHROOM_PARTS,
} as const

export type VegetationCategory = keyof typeof SCALE_RANGE

/** 每类物件在最坏缩放下的外廓：部件尺寸来自 plantShapes，缩放上限来自 SCALE_RANGE。 */
export const CATEGORY_EXTENTS = Object.fromEntries(
  (Object.keys(SCALE_RANGE) as VegetationCategory[]).map((category) => [
    category,
    categoryExtent(CATEGORY_PARTS[category], SCALE_RANGE[category][1]),
  ]),
) as Record<VegetationCategory, ObjectExtent>

function widest(first: ObjectExtent, second: ObjectExtent): ObjectExtent {
  return {
    top: Math.max(first.top, second.top),
    halfWidth: Math.max(first.halfWidth, second.halfWidth),
  }
}

/**
 * 选址时各类物件实际执行的山体避让尺寸。
 * 伴石贴在主石脚边、水珠挂在草尖与花头上，都按宿主的尺寸让；
 * 花头比草尖高，水珠按两者中更高的算，免得植物露着、水珠埋进山。
 */
const ZONE_EXTENTS: Record<VegetationCategory, ObjectExtent> = {
  tree: CATEGORY_EXTENTS.tree,
  grass: widest(CATEGORY_EXTENTS.grass, CATEGORY_EXTENTS.dew),
  flower: widest(CATEGORY_EXTENTS.flower, CATEGORY_EXTENTS.dew),
  rock: CATEGORY_EXTENTS.rock,
  rockBuddy: CATEGORY_EXTENTS.rock,
  dew: CATEGORY_EXTENTS.grass,
  glowFlower: CATEGORY_EXTENTS.glowFlower,
  crystal: CATEGORY_EXTENTS.crystal,
  mushroom: CATEGORY_EXTENTS.mushroom,
}

/** 某类物件选址时实际执行的山体避让外廓（伴石/水珠按宿主算）。 */
export function mountainZoneExtent(category: VegetationCategory): ObjectExtent {
  return ZONE_EXTENTS[category]
}

/**
 * 某类物件相对某座峰必须让开的最小角距。
 * 树沿用上一卡验收过的保守规则（整只树冠落在山底半径之外）——
 * 换成统一解算会重排已验收的树位，而收益只有「更贴山脚」。
 */
export function mountainClearanceFor(peak: PeakSpec, category: VegetationCategory): number {
  const extent = ZONE_EXTENTS[category]
  if (category === 'tree') return peak.base + extent.halfWidth + 0.01
  return mountainClearance(peak, extent)
}

/** 树冠与石块的最大水平半径：与上面外廓同源，不再手写几何数字 */
const TREE_CANOPY_RADIUS = CATEGORY_EXTENTS.tree.halfWidth
const ROCK_RADIUS = CATEGORY_EXTENTS.rock.halfWidth
/**
 * 石心到树心的最小角距余弦：两者最大水平半径之和，单位球上弧度≈弦长，
 * 即使树和石头都抽到最大缩放也不会插到一起。
 */
const ROCK_TREE_CLEAR_DOT = Math.cos(TREE_CANOPY_RADIUS + ROCK_RADIUS)

/** 一片禁止落点的球冠：dir 是冠心，dot 是角距余弦上限，落点必须离冠心更远 */
interface AvoidZone {
  dir: THREE.Vector3
  dot: number
}

export function buildLayout(
  quality: VegetationQuality,
  ground: GroundField,
  glowFlower: boolean,
  crystal: boolean,
  glowMushroom: boolean,
): Layout {
  const counts = COUNTS[quality]
  const random = createRandom(0x5eed1e5)
  const land = sampleSurfacePoints(counts.candidates, 0.05, 0.66)

  /**
   * 先筛后抽：干地、伙伴空地、视线遮挡都在抽取之前判完。
   * 反过来（先抽 64 个再筛）会把大半名额浪费在注定被剔除的点上，
   * 树只剩十几棵、石头只剩十颗，星球看着就秃了。
   * 筛选不消耗随机数，所以解锁物追加在后面时既有植被依旧逐位不动。
   */
  const select = (
    min: number,
    max: number,
    margin: number,
    viewBlock: number,
    count: number,
    avoid: readonly AvoidZone[] = [],
  ): SurfacePoint[] =>
    pickEvenly(
      land.filter(
        (point) =>
          point.elevation >= min &&
          point.elevation <= max &&
          awayFromCompanionHome(point) &&
          !blocksCompanionView(point.dir, point.radius, viewBlock) &&
          isDryGround(ground, point.dir, margin) &&
          avoid.every((zone) => point.dir.dot(zone.dir) < zone.dot),
      ),
      count,
      /* 株脚贴到烘出的地皮上：解析半径在面片内部会偏高，树会浮在土面上方 */
    ).map((point) => ({ ...point, radius: groundRadiusAt(ground, point.dir) }))

  /* 侧峰也算一座峰：每一类物件都按自己的外廓在山脚外让开。
     只让树避让是不够的——石头/晶石/草/花的高程带同样压在紫色山体上，
     实测 normal 下有 12/18 的石头陷在山里、6 颗整颗看不见。 */
  const peaks = flattenPeaks(findMountainSites(ground, MOUNTAIN_COUNTS[quality]))
  const mountainZones = (category: VegetationCategory): AvoidZone[] =>
    peaks.map((peak) => ({ dir: peak.dir, dot: Math.cos(mountainClearanceFor(peak, category)) }))

  const treePoints = select(
    0.14,
    0.46,
    DRY_MARGIN.tree,
    0.2,
    counts.trees,
    mountainZones('tree'),
  )
  const grassPoints = select(
    0.09,
    0.34,
    DRY_MARGIN.grass,
    0.08,
    counts.grass,
    mountainZones('grass'),
  )
  const flowerPoints = select(
    0.1,
    0.28,
    DRY_MARGIN.flower,
    0.07,
    counts.flowers,
    mountainZones('flower'),
  )
  /* 石头避开树冠 + 山体：树先选、石后筛，筛选不耗随机数 */
  const rockPoints = select(
    0.33,
    0.64,
    DRY_MARGIN.rock,
    0.05,
    counts.rocks,
    [
      ...treePoints.map((point) => ({ dir: point.dir, dot: ROCK_TREE_CLEAR_DOT })),
      ...mountainZones('rock'),
    ],
  )

  return {
    tree: scatter(treePoints, random, TREE_PARTS, SCALE_RANGE.tree),
    grass: scatter(grassPoints, random, GRASS_PARTS, SCALE_RANGE.grass),
    flower: scatter(flowerPoints, random, FLOWER_PARTS, SCALE_RANGE.flower),
    rock: scatter(rockPoints, random, ROCK_PARTS, SCALE_RANGE.rock),
    /* 水珠挂在已经存在的草与花上，不另外采点，保证「就是这些植物上的水珠」 */
    dew: scatter(
      pickEvenly([...grassPoints, ...flowerPoints], counts.dew),
      random,
      DEW_PARTS,
      SCALE_RANGE.dew,
    ),
    /* 解锁物排在基础植被之后抽取：随机数消耗顺序不变，
       刚长出新植物时已有的树和草不会跳位置。 */
    glowFlower: glowFlower
      ? scatter(
          select(
            0.08,
            0.3,
            DRY_MARGIN.glowFlower,
            0.06,
            counts.glowFlowers,
            mountainZones('glowFlower'),
          ),
          random,
          GLOW_FLOWER_PARTS,
          SCALE_RANGE.glowFlower,
        )
      : NO_PLACEMENT,
    crystal: crystal
      ? scatter(
          select(
            0.34,
            0.6,
            DRY_MARGIN.crystal,
            0.1,
            counts.crystals,
            mountainZones('crystal'),
          ),
          random,
          CRYSTAL_PARTS,
          SCALE_RANGE.crystal,
        )
      : NO_PLACEMENT,
    /* 蘑菇排在所有既有抽取之后：随机数消耗顺序不变，解锁前后既有植被逐位不动 */
    mushroom: glowMushroom
      ? scatter(
          select(
            0.15,
            0.34,
            DRY_MARGIN.mushroom,
            0.05,
            counts.mushrooms,
            mountainZones('mushroom'),
          ),
          random,
          MUSHROOM_PARTS,
          SCALE_RANGE.mushroom,
        )
      : NO_PLACEMENT,
    /* 伴石排在最后抽取：不改动前面任何一批的随机数消耗顺序；
       它落在主石同一点上，因此跟着主石的山体避让一起生效 */
    rockBuddy: scatter(
      pickEvenly(rockPoints, Math.max(1, Math.round(rockPoints.length * 0.7))),
      random,
      ROCK_BUDDY_PARTS,
      SCALE_RANGE.rockBuddy,
    ),
  }
}