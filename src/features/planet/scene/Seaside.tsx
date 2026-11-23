import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { between, createRandom } from '@/utils/random'

import { SEA_LEVEL } from '../lib/terrain'
import { beamAngle, boatBob, boatRoll } from '../lib/seasideMotion'
import { fadeStep } from '../lib/unlockFade'
import { Instances } from './Instances'
import type { EnvRuntime } from './moodEnvironment'
import { findLighthouseSite, findPierSite } from './seasidePlacement'

/**
 * 海边解锁物：守望灯塔（离岸礁岛 + 红白塔 + 旋转光束）与栈桥小船。
 * 选址是独立的确定性纯函数，不消耗植被随机序列；
 * 所有动效读 env.time，calm 时自然停驻；解锁淡入 calm 时瞬落。
 */

const UP = new THREE.Vector3(0, 1, 0)
/** 锚在球面海平面而不是海底：无论选址处海多深，礁岛都恰好露出水面 */
const SEA_SURFACE = SEA_LEVEL * 1.004
const BEAM_LENGTH = 0.55
const BEAM_RADIUS = 0.05
const LAMP_BASE = new THREE.Color('#FFE9B0')
const TOWER_WHITE = '#F4F1E8'
const TOWER_RED = '#E0655A'
const WOOD_LIGHT = '#96755A'
const WOOD_DARK = '#7C5F45'
const ROCK_TINTS = ['#948CB4', '#7E7799', '#A9A2C2']

const TOWER_SEGMENTS: readonly { rBottom: number; rTop: number; height: number; red: boolean }[] = [
  { rBottom: 0.017, rTop: 0.0155, height: 0.024, red: false },
  { rBottom: 0.0155, rTop: 0.014, height: 0.014, red: true },
  { rBottom: 0.014, rTop: 0.0125, height: 0.024, red: false },
  { rBottom: 0.0125, rTop: 0.0115, height: 0.014, red: true },
  { rBottom: 0.0115, rTop: 0.0105, height: 0.016, red: false },
]
const TOWER_BASE = 0.02
const TOWER_TOP = TOWER_BASE + TOWER_SEGMENTS.reduce((sum, seg) => sum + seg.height, 0)
const GALLERY_Y = TOWER_TOP + 0.002
const LAMP_Y = GALLERY_Y + 0.002 + 0.007
const ROOF_Y = LAMP_Y + 0.007 + 0.006

interface SeasideProps {
  env: EnvRuntime
  calm: boolean
  /** 已解锁「守望灯塔」 */
  lighthouse: boolean
  /** 已解锁「栈桥小船」 */
  pier: boolean
}

export function Seaside({ env, calm, lighthouse, pier }: SeasideProps) {
  /* 选址只在真的解锁时才算：锁定状态下零开销、零渲染 */
  const lighthouseSite = useMemo(
    () => (lighthouse || pier ? findLighthouseSite() : null),
    [lighthouse, pier],
  )
  const pierSite = useMemo(
    () => (pier && lighthouseSite ? findPierSite(lighthouseSite.dir) : null),
    [pier, lighthouseSite],
  )

  if (!lighthouseSite) return null

  return (
    <group name="seaside">
      {lighthouse && <Lighthouse env={env} calm={calm} site={lighthouseSite} />}
      {pier && pierSite && <Pier env={env} calm={calm} site={pierSite} />}
    </group>
  )
}

interface LighthouseProps {
  env: EnvRuntime
  calm: boolean
  site: ReturnType<typeof findLighthouseSite>
}

function Lighthouse({ env, calm, site }: LighthouseProps) {
  const assets = useMemo(() => {
    const random = createRandom(0x5ea51de)
    const rockGeometry = new THREE.DodecahedronGeometry(1, 0)
    const rockMaterial = new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      roughness: 0.94,
      metalness: 0,
      flatShading: true,
    })
    const rockSpecs = [
      { pos: [0, -0.006, 0], scale: [0.05, 0.034, 0.044] },
      { pos: [0.04, -0.012, 0.022], scale: [0.03, 0.022, 0.028] },
      { pos: [-0.036, -0.014, -0.026], scale: [0.026, 0.02, 0.024] },
    ] as const
    const rockMatrices: THREE.Matrix4[] = []
    const rockColors: THREE.Color[] = []
    const matrix = new THREE.Matrix4()
    const quat = new THREE.Quaternion()
    const pos = new THREE.Vector3()
    const scale = new THREE.Vector3()
    for (const spec of rockSpecs) {
      quat.setFromAxisAngle(UP, between(random, 0, Math.PI * 2))
      pos.set(spec.pos[0], spec.pos[1], spec.pos[2])
      scale.set(spec.scale[0], spec.scale[1], spec.scale[2])
      matrix.compose(pos, quat, scale)
      rockMatrices.push(matrix.clone())
      rockColors.push(new THREE.Color(ROCK_TINTS[Math.floor(random() * ROCK_TINTS.length)]))
    }

    const segments = TOWER_SEGMENTS.map(
      (seg) => new THREE.CylinderGeometry(seg.rTop, seg.rBottom, seg.height, 8),
    )
    const segmentYs = TOWER_SEGMENTS.map((seg, i) => {
      const base =
        TOWER_BASE + TOWER_SEGMENTS.slice(0, i).reduce((sum, prev) => sum + prev.height, 0)
      return base + seg.height / 2
    })

    return {
      rockGeometry,
      rockMaterial,
      rockMatrices,
      rockColors,
      segments,
      segmentYs,
      gallery: new THREE.CylinderGeometry(0.016, 0.016, 0.004, 8),
      lampRoom: new THREE.CylinderGeometry(0.009, 0.009, 0.014, 8),
      roof: new THREE.ConeGeometry(0.012, 0.012, 8),
      beam: new THREE.ConeGeometry(BEAM_RADIUS, BEAM_LENGTH, 12, 1, true),
      white: new THREE.MeshStandardMaterial({
        color: TOWER_WHITE,
        roughness: 0.8,
        metalness: 0,
        flatShading: true,
      }),
      red: new THREE.MeshStandardMaterial({
        color: TOWER_RED,
        roughness: 0.8,
        metalness: 0,
        flatShading: true,
      }),
      dark: new THREE.MeshStandardMaterial({
        color: '#5A5470',
        roughness: 0.9,
        metalness: 0,
        flatShading: true,
      }),
      lamp: new THREE.MeshStandardMaterial({
        color: '#FFF6DE',
        emissive: '#FFE9B0',
        emissiveIntensity: 1,
        roughness: 0.4,
        metalness: 0,
      }),
      beamMat: new THREE.MeshBasicMaterial({
        color: '#FFE9B0',
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    }
  }, [])

  const transform = useMemo(
    () => ({
      position: site.dir.clone().multiplyScalar(SEA_SURFACE),
      quaternion: new THREE.Quaternion().setFromUnitVectors(UP, site.dir),
    }),
    [site],
  )

  const groupRef = useRef<THREE.Group>(null)
  const beamRef = useRef<THREE.Group>(null)
  const lightRef = useRef<THREE.PointLight>(null)
  const fade = useRef(0)
  /* 逐帧写入的灯材质与 scratch 颜色用 ref 持有，与植被/转盘同一约定 */
  const lamp = useRef(assets.lamp)
  const beamMat = useRef(assets.beamMat)
  const lampColor = useRef(new THREE.Color())

  useEffect(
    () => () => {
      assets.rockGeometry.dispose()
      for (const geometry of assets.segments) geometry.dispose()
      assets.gallery.dispose()
      assets.lampRoom.dispose()
      assets.roof.dispose()
      assets.beam.dispose()
      assets.rockMaterial.dispose()
      assets.white.dispose()
      assets.red.dispose()
      assets.dark.dispose()
      assets.lamp.dispose()
      assets.beamMat.dispose()
    },
    [assets],
  )

  useFrame((_, dt) => {
    const f = (fade.current = fadeStep(fade.current, 1, dt, calm))
    const group = groupRef.current
    if (!group) return
    group.visible = f > 0.01
    if (!group.visible) return
    group.scale.setScalar(Math.max(0.0001, f))

    const glow = env.values.glow
    /* 灯色向当前心情色偏移：光束映出今天的心情 */
    lampColor.current.copy(LAMP_BASE).lerp(env.colors.tint, 0.55)
    lamp.current.emissive.copy(lampColor.current)
    lamp.current.emissiveIntensity = f * (1 + glow * 0.7)
    beamMat.current.color.copy(lampColor.current)
    beamMat.current.opacity = f * 0.11 * (0.7 + glow * 0.5)
    if (beamRef.current) beamRef.current.rotation.y = beamAngle(env.time)
    if (lightRef.current) {
      lightRef.current.color.copy(lampColor.current)
      lightRef.current.intensity = f * 0.5 * (0.6 + glow * 0.4)
    }
  })

  return (
    <group
      ref={groupRef}
      position={transform.position}
      quaternion={transform.quaternion}
      visible={false}
    >
      <Instances
        geometry={assets.rockGeometry}
        material={assets.rockMaterial}
        matrices={assets.rockMatrices}
        colors={assets.rockColors}
      />
      {assets.segments.map((geometry, i) => (
        <mesh
          key={i}
          geometry={geometry}
          material={TOWER_SEGMENTS[i].red ? assets.red : assets.white}
          position={[0, assets.segmentYs[i], 0]}
        />
      ))}
      <mesh geometry={assets.gallery} material={assets.dark} position={[0, GALLERY_Y, 0]} />
      <mesh geometry={assets.lampRoom} material={assets.lamp} position={[0, LAMP_Y, 0]} />
      <mesh geometry={assets.roof} material={assets.red} position={[0, ROOF_Y, 0]} />
      {/* 双向光束：锥尖在灯室、锥底朝外，加色混合才像光而不是实体 */}
      <group ref={beamRef} position={[0, LAMP_Y, 0]}>
        <mesh
          geometry={assets.beam}
          material={assets.beamMat}
          position={[BEAM_LENGTH / 2, 0, 0]}
          rotation={[0, 0, Math.PI / 2]}
        />
        <mesh
          geometry={assets.beam}
          material={assets.beamMat}
          position={[-BEAM_LENGTH / 2, 0, 0]}
          rotation={[0, 0, -Math.PI / 2]}
        />
      </group>
      <pointLight ref={lightRef} position={[0, LAMP_Y, 0]} intensity={0} distance={0.6} decay={1} />
    </group>
  )
}

const PLANK_XS = [0.012, 0.035, 0.058, 0.081, 0.104, 0.127] as const
const POSTS = [
  { x: 0.02, z: 0.007 },
  { x: 0.06, z: -0.007 },
  { x: 0.1, z: 0.007 },
  { x: 0.127, z: -0.007 },
] as const
const BOAT_X = 0.152
const BOAT_Z = 0.026

interface PierProps {
  env: EnvRuntime
  calm: boolean
  site: ReturnType<typeof findPierSite>
}

function Pier({ env, calm, site }: PierProps) {
  const assets = useMemo(
    () => ({
      plank: new THREE.BoxGeometry(0.024, 0.0035, 0.02),
      post: new THREE.CylinderGeometry(0.0022, 0.0022, 1, 5),
      hull: new THREE.BoxGeometry(0.034, 0.011, 0.015),
      gunwale: new THREE.BoxGeometry(0.036, 0.003, 0.017),
      stripe: new THREE.BoxGeometry(0.0345, 0.002, 0.0155),
      woodLight: new THREE.MeshStandardMaterial({
        color: WOOD_LIGHT,
        roughness: 0.9,
        metalness: 0,
        flatShading: true,
      }),
      woodDark: new THREE.MeshStandardMaterial({
        color: WOOD_DARK,
        roughness: 0.9,
        metalness: 0,
        flatShading: true,
      }),
      paint: new THREE.MeshStandardMaterial({
        color: TOWER_RED,
        roughness: 0.7,
        metalness: 0,
        flatShading: true,
      }),
    }),
    [],
  )

  const transform = useMemo(() => {
    const align = new THREE.Quaternion().setFromUnitVectors(UP, site.point.dir)
    /* 把局部 +x 转到「朝最深海」的切向：栈桥真的伸进水里 */
    const local = site.forward.clone().applyQuaternion(align.clone().invert())
    const spin = new THREE.Quaternion().setFromAxisAngle(UP, Math.atan2(-local.z, local.x))
    return {
      position: site.point.dir.clone().multiplyScalar(site.point.radius),
      quaternion: align.multiply(spin),
      deckY: SEA_LEVEL + 0.009 - site.point.radius,
      boatBaseY: SEA_LEVEL + 0.005 - site.point.radius,
    }
  }, [site])

  const groupRef = useRef<THREE.Group>(null)
  const boatRef = useRef<THREE.Group>(null)
  const fade = useRef(0)

  useEffect(
    () => () => {
      assets.plank.dispose()
      assets.post.dispose()
      assets.hull.dispose()
      assets.gunwale.dispose()
      assets.stripe.dispose()
      assets.woodLight.dispose()
      assets.woodDark.dispose()
      assets.paint.dispose()
    },
    [assets],
  )

  useFrame((_, dt) => {
    const f = (fade.current = fadeStep(fade.current, 1, dt, calm))
    const group = groupRef.current
    if (!group) return
    group.visible = f > 0.01
    if (!group.visible) return
    group.scale.setScalar(Math.max(0.0001, f))
    if (boatRef.current) {
      boatRef.current.position.y = transform.boatBaseY + boatBob(env.time)
      boatRef.current.rotation.x = boatRoll(env.time)
    }
  })

  return (
    <group
      ref={groupRef}
      position={transform.position}
      quaternion={transform.quaternion}
      visible={false}
    >
      {PLANK_XS.map((x, i) => (
        <mesh
          key={i}
          geometry={assets.plank}
          material={i % 2 === 0 ? assets.woodLight : assets.woodDark}
          position={[x, transform.deckY, 0]}
        />
      ))}
      {POSTS.map((post, i) => {
        /* 桩长随 x 增加：球面在远处下沉，桩要跟着够到水面以下 */
        const length = 0.015 + (post.x * post.x) / 2
        return (
          <mesh
            key={i}
            geometry={assets.post}
            material={assets.woodDark}
            position={[post.x, transform.deckY - length / 2, post.z]}
            scale={[1, length, 1]}
          />
        )
      })}
      <group ref={boatRef} position={[BOAT_X, transform.boatBaseY, BOAT_Z]}>
        <mesh geometry={assets.hull} material={assets.woodLight} />
        <mesh geometry={assets.gunwale} material={assets.woodDark} position={[0, 0.0065, 0]} />
        <mesh geometry={assets.stripe} material={assets.paint} position={[0, 0.002, 0]} />
      </group>
    </group>
  )
}