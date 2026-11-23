import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

import { createRandom, oneOf } from '@/utils/random'

import type { GroundField } from '../lib/groundField'
import { writeSurfaceMatrix, type SurfacePoint } from '../lib/terrain'
import { Instances } from './Instances'
import {
  findMountainSites,
  MOUNTAIN_COUNTS,
  MOUNTAIN_PROFILE,
  MOUNTAIN_SKIRT,
  type PeakSpec,
} from './mountainPlacement'
import type { VegetationQuality } from './vegetationPlacement'

/**
 * 低多边形山脉：主峰 + 两座侧峰成簇，高锋顶戴雪。
 * 几何只有一份带裙边的山体，靠实例矩阵缩放复用；不逐帧写任何东西，
 * 阴影因此是静态的，拖拽旋转时不会重算投影。
 */

/* 山体比地表岩石群系更冷更灰：同一片紫色里才分得出「山」和「地」 */
const ROCK_TINTS = ['#6A6784', '#5E5B78', '#7B7894'] as const
const SNOW_TINTS = ['#EDF1FB', '#E2E9F8'] as const
const SIDES = 6

/**
 * 带裙边的低多边形山体：y=0 贴地表，y<0 的裙边埋进土里。
 * 球面在底宽 r 处下沉约 r²/2，平底圆锥的远侧底缘会浮空；
 * 裙边一路插到地表以下，可见的交线就始终贴着球面，山脚不悬空。
 * 中段两圈折环让坡面有转折，读作山脊而不是一枚光滑圆锥。
 */
function createMountainGeometry(): THREE.BufferGeometry {
  /* 峰顶单点成扇形，其下三圈环（含裙边）与避让用的剖面同一份数据 */
  const rings = [...MOUNTAIN_PROFILE.slice(1), MOUNTAIN_SKIRT]
  const positions: number[] = []
  const ringVerts = rings.map((ring, ri) =>
    Array.from({ length: SIDES }, (_, i) => {
      const a = ((i + (ri % 2) * 0.5) / SIDES) * Math.PI * 2
      return new THREE.Vector3(Math.cos(a) * ring.r, ring.y, Math.sin(a) * ring.r)
    }),
  )
  const apex = new THREE.Vector3(0, 1, 0)
  /* 交换 b/c：环向递增是顺时针俯视，反绕才能让法线朝外 */
  const push = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
    positions.push(a.x, a.y, a.z, c.x, c.y, c.z, b.x, b.y, b.z)
  }

  for (let i = 0; i < SIDES; i++) {
    const j = (i + 1) % SIDES
    push(apex, ringVerts[0][i], ringVerts[0][j])
    for (let r = 0; r < rings.length - 1; r++) {
      push(ringVerts[r][i], ringVerts[r + 1][i], ringVerts[r + 1][j])
      push(ringVerts[r][i], ringVerts[r + 1][j], ringVerts[r][j])
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  return geometry
}

interface Layout {
  bodies: { matrices: THREE.Matrix4[]; colors: THREE.Color[] }
  caps: { matrices: THREE.Matrix4[]; colors: THREE.Color[] }
}

function buildLayout(ground: GroundField, quality: VegetationQuality): Layout {
  const sites = findMountainSites(ground, MOUNTAIN_COUNTS[quality])
  const random = createRandom(0x51a7e5)
  const bodies: Layout['bodies'] = { matrices: [], colors: [] }
  const caps: Layout['caps'] = { matrices: [], colors: [] }
  const matrix = new THREE.Matrix4()
  const scale = new THREE.Vector3()
  const point: SurfacePoint = { dir: new THREE.Vector3(), radius: 0, elevation: 0 }

  const pushPeak = (peak: PeakSpec): void => {
    point.dir.copy(peak.dir)
    point.radius = peak.groundRadius
    scale.set(peak.base, peak.height, peak.base)
    /* 几何 y=0 就贴地表，裙边自己埋进土里，不需要再沉 */
    writeSurfaceMatrix(matrix, point, 0, scale, peak.spin)
    bodies.matrices.push(matrix.clone())
    bodies.colors.push(new THREE.Color(oneOf(random, ROCK_TINTS)))
  }

  for (const site of sites) {
    pushPeak(site)
    for (const shoulder of site.shoulders) pushPeak(shoulder)
    if (!site.snow) continue
    /* 雪顶复用同一份山体：裙边埋进主峰里，雪线以下不会露缝 */
    point.dir.copy(site.dir)
    point.radius = site.groundRadius
    scale.set(site.base * 0.4, site.height * 0.42, site.base * 0.4)
    writeSurfaceMatrix(matrix, point, site.height * 0.6, scale, site.spin)
    caps.matrices.push(matrix.clone())
    caps.colors.push(new THREE.Color(oneOf(random, SNOW_TINTS)))
  }

  return { bodies, caps }
}

export function Mountains({ ground, quality }: { ground: GroundField; quality: VegetationQuality }) {
  const layout = useMemo(() => buildLayout(ground, quality), [ground, quality])
  const assets = useMemo(
    () => ({
      /* 一份带裙边的山体几何，实例矩阵负责全部尺寸差异；雪顶复用同一份 */
      massif: createMountainGeometry(),
      rock: new THREE.MeshStandardMaterial({
        color: '#FFFFFF',
        roughness: 0.95,
        metalness: 0,
        flatShading: true,
      }),
      snow: new THREE.MeshStandardMaterial({
        color: '#FFFFFF',
        emissive: '#B9C6E8',
        emissiveIntensity: 0.08,
        roughness: 0.7,
        metalness: 0,
        flatShading: true,
      }),
    }),
    [],
  )

  useEffect(
    () => () => {
      assets.massif.dispose()
      assets.rock.dispose()
      assets.snow.dispose()
    },
    [assets],
  )

  return (
    <group name="mountains">
      <Instances
        geometry={assets.massif}
        material={assets.rock}
        matrices={layout.bodies.matrices}
        colors={layout.bodies.colors}
        castShadow
      />
      <Instances
        geometry={assets.massif}
        material={assets.snow}
        matrices={layout.caps.matrices}
        colors={layout.caps.colors}
        castShadow
      />
    </group>
  )
}