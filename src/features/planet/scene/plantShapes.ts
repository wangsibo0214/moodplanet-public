/**
 * 植被部件的几何尺寸：Vegetation.tsx 按这份建几何，
 * vegetationPlacement.ts 按同一份算「物件在山体方向上的最大外廓」。
 * 两处共用是关键——避让用的尺寸若比实际画出来的小，物件就会埋进紫色山体里。
 */
import * as THREE from 'three'

export type PlantShapeKind =
  | 'trunk'
  | 'foliageLow'
  | 'foliageHigh'
  | 'grass'
  | 'stem'
  | 'flowerHead'
  | 'rock'
  | 'dew'
  | 'glowStem'
  | 'glowHead'
  | 'crystal'
  | 'mushroomStem'
  | 'mushroomCap'

export type Shape =
  | { kind: 'cylinder'; topRadius: number; bottomRadius: number; height: number; segments: number }
  | { kind: 'cone'; radius: number; height: number; segments: number }
  | { kind: 'sphere'; radius: number; widthSegments: number; heightSegments: number }
  | { kind: 'polyhedron'; solid: 'dodecahedron' | 'octahedron'; radius: number; detail: 0 }

export const PLANT_SHAPES: Record<PlantShapeKind, Shape> = {
  trunk: { kind: 'cylinder', topRadius: 0.0085, bottomRadius: 0.013, height: 0.05, segments: 5 },
  foliageLow: { kind: 'cone', radius: 0.048, height: 0.052, segments: 6 },
  foliageHigh: { kind: 'cone', radius: 0.033, height: 0.044, segments: 6 },
  grass: { kind: 'cone', radius: 0.011, height: 0.05, segments: 4 },
  stem: { kind: 'cylinder', topRadius: 0.0028, bottomRadius: 0.0035, height: 0.036, segments: 4 },
  flowerHead: { kind: 'sphere', radius: 0.0135, widthSegments: 8, heightSegments: 6 },
  /* 多面体按外接球半径算外廓：比真实包围盒略大，避让宁可留宽不留窄 */
  rock: { kind: 'polyhedron', solid: 'dodecahedron', radius: 0.042, detail: 0 },
  dew: { kind: 'sphere', radius: 0.0062, widthSegments: 6, heightSegments: 5 },
  glowStem: {
    kind: 'cylinder',
    topRadius: 0.0022,
    bottomRadius: 0.003,
    height: 0.028,
    segments: 4,
  },
  glowHead: { kind: 'sphere', radius: 0.0105, widthSegments: 8, heightSegments: 6 },
  crystal: { kind: 'polyhedron', solid: 'octahedron', radius: 0.021, detail: 0 },
  mushroomStem: {
    kind: 'cylinder',
    topRadius: 0.0035,
    bottomRadius: 0.0045,
    height: 0.024,
    segments: 5,
  },
  mushroomCap: { kind: 'sphere', radius: 0.011, widthSegments: 8, heightSegments: 5 },
}

/** 未缩放几何的竖直半高与水平最大半径。 */
export function shapeExtent(shape: Shape): { halfHeight: number; halfWidth: number } {
  switch (shape.kind) {
    case 'cylinder':
      return {
        halfHeight: shape.height / 2,
        halfWidth: Math.max(shape.topRadius, shape.bottomRadius),
      }
    case 'cone':
      return { halfHeight: shape.height / 2, halfWidth: shape.radius }
    default:
      return { halfHeight: shape.radius, halfWidth: shape.radius }
  }
}

/** 一类物件在最坏缩放下的外廓：部件基准尺寸 × 缩放系数 × 该类的缩放上限。 */
export function categoryExtent(
  parts: readonly { offset: number; scale: [number, number, number]; shape: PlantShapeKind }[],
  scaleMax: number,
): ObjectExtent {
  let top = 0
  let halfWidth = 0
  for (const part of parts) {
    const shape = shapeExtent(PLANT_SHAPES[part.shape])
    top = Math.max(top, part.offset + shape.halfHeight * part.scale[1])
    halfWidth = Math.max(halfWidth, shape.halfWidth * Math.max(part.scale[0], part.scale[2]))
  }
  return { top: top * scaleMax, halfWidth: halfWidth * scaleMax }
}

export interface ObjectExtent {
  /** 最高点离地多高 */
  top: number
  /** 水平最大半径 */
  halfWidth: number
}

/** 按尺寸表建几何：Vegetation.tsx 唯一的建模入口，改数字只会改一处。 */
export function createPlantGeometry(shape: Shape): THREE.BufferGeometry {
  switch (shape.kind) {
    case 'cylinder':
      return new THREE.CylinderGeometry(
        shape.topRadius,
        shape.bottomRadius,
        shape.height,
        shape.segments,
      )
    case 'cone':
      return new THREE.ConeGeometry(shape.radius, shape.height, shape.segments)
    case 'sphere':
      return new THREE.SphereGeometry(shape.radius, shape.widthSegments, shape.heightSegments)
    case 'polyhedron':
      return shape.solid === 'dodecahedron'
        ? new THREE.DodecahedronGeometry(shape.radius, shape.detail)
        : new THREE.OctahedronGeometry(shape.radius, shape.detail)
  }
}
