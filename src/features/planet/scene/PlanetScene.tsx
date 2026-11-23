import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

import type { ReactNode } from 'react'

import { usePlanetStore } from '@/stores/usePlanetStore'

import { bakeGroundField } from '../lib/groundField'
import { AtmosphereGlow } from './AtmosphereGlow'
import { CloudLayer } from './CloudLayer'
import { Companion } from './Companion'
import { Decorations } from './Decorations'
import { EnvironmentLights } from './EnvironmentLights'
import { MemoryStars } from './MemoryStars'
import { Mountains } from './Mountains'
import { PlanetBody } from './PlanetBody'
import { Seaside } from './Seaside'
import { SpaceParticles } from './SpaceParticles'
import { StarPanelTracker } from './StarPanelTracker'
import { Vegetation } from './Vegetation'
import type { VegetationQuality } from './vegetationPlacement'
import {
  advanceEnvironment,
  createEnvironment,
  retargetEnvironment,
  type EnvRuntime,
} from './moodEnvironment'

/**
 * 入场推拉：从 5.78 推到 4.6，两端都在 OrbitControls 的 [2.2, 6] 之内，避免被夹断。
 * 4.6 这个距离下星球轮廓约占画面高度 64%，四周留出宇宙和记忆星轨道的空间。
 */
const INTRO_FROM = 5.78
const INTRO_TO = 4.6
const INTRO_DURATION = 1.4
/** 开场轻摆：绕 Y 摆到 20° 再摆回正面停住。给「这是 3D、可以转」的暗示，又不会把伙伴转到背面去。 */
const SWAY_AMPLITUDE = 0.35
const SWAY_DURATION = 6
/** 拖拽灵敏度：约 520px 位移转满一圈，桌面一次横穿画布就能超过 360°。 */
const DRAG_RAD_PER_PX = (Math.PI * 2) / 520
const WORLD_UP = new THREE.Vector3(0, 1, 0)

interface SpinGroupProps {
  /** 开场转盘是否允许运行：用户未接管、也未开减少动效 */
  running: boolean
  onTakeOver: () => void
  children: ReactNode
}

/**
 * 无限制旋转：拖拽位移换算成绕相机上/右轴的四元数增量，预乘到星球组。
 * 四元数累积没有极角概念，任意方向都能一直转下去，
 * 不会像 OrbitControls 的球坐标那样在南北两极被夹断、越过极点还会反向。
 */
function SpinGroup({ running, onTakeOver, children }: SpinGroupProps) {
  const groupRef = useRef<THREE.Group>(null)
  const gl = useThree((state) => state.gl)
  const camera = useThree((state) => state.camera)
  const swayT = useRef(0)
  const swayAngle = useRef(0)
  const swayDone = useRef(false)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  /* 指针数量变化后第一帧只重新锚定，不把捏合/抬起的位移算成旋转 */
  const resync = useRef(false)
  const right = useRef(new THREE.Vector3())
  const up = useRef(new THREE.Vector3())
  const back = useRef(new THREE.Vector3())
  const axis = useRef(new THREE.Vector3())
  const step = useRef(new THREE.Quaternion())

  useEffect(() => {
    const element = gl.domElement

    const down = (event: PointerEvent) => {
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
      resync.current = true
    }
    const move = (event: PointerEvent) => {
      const point = pointers.current.get(event.pointerId)
      if (!point) return
      if (pointers.current.size !== 1) {
        resync.current = true
        return
      }
      if (resync.current) {
        resync.current = false
        point.x = event.clientX
        point.y = event.clientY
        return
      }
      const dx = event.clientX - point.x
      const dy = event.clientY - point.y
      point.x = event.clientX
      point.y = event.clientY
      const group = groupRef.current
      if (!group || (dx === 0 && dy === 0)) return
      onTakeOver()
      /* 相机不滚转，它的右/上轴就是屏幕的右/上，绕它们转即「地表跟着手指走」 */
      camera.matrixWorld.extractBasis(right.current, up.current, back.current)
      axis.current
        .set(0, 0, 0)
        .addScaledVector(up.current, dx)
        .addScaledVector(right.current, dy)
        .normalize()
      group.quaternion.premultiply(
        step.current.setFromAxisAngle(axis.current, Math.hypot(dx, dy) * DRAG_RAD_PER_PX),
      )
    }
    const lift = (event: PointerEvent) => {
      pointers.current.delete(event.pointerId)
      resync.current = true
    }

    element.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', lift)
    window.addEventListener('pointercancel', lift)
    return () => {
      element.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', lift)
      window.removeEventListener('pointercancel', lift)
    }
  }, [gl, camera, onTakeOver])

  useFrame((_, dt) => {
    const group = groupRef.current
    if (!group || !running || swayDone.current) return
    /* 切回标签页后的第一帧 dt 可能是整段停顿时长，不夹住的话轻摆会直接跳到终点 */
    swayT.current = Math.min(SWAY_DURATION, swayT.current + Math.min(dt, 0.05))
    /* sin² 包络：起止速度都为零，摆出去再摆回 0，停表时朝向与开场完全一致 */
    const angle =
      (SWAY_AMPLITUDE / 2) * (1 - Math.cos((swayT.current / SWAY_DURATION) * Math.PI * 2))
    const delta = angle - swayAngle.current
    swayAngle.current = angle
    if (delta !== 0) {
      group.quaternion.premultiply(step.current.setFromAxisAngle(WORLD_UP, delta))
    }
    if (swayT.current >= SWAY_DURATION) swayDone.current = true
  })

  return (
    <group ref={groupRef} name="planet-spin">
      {children}
    </group>
  )
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/** 入场动画：相机推近 + 星球由小放大。calm 时首帧直接落到终态。 */
function IntroRig({ calm, children }: { calm: boolean; children: ReactNode }) {
  const groupRef = useRef<THREE.Group>(null)
  const camera = useThree((state) => state.camera)
  const progress = useRef(0)

  useFrame((_, dt) => {
    if (progress.current >= 1) return
    progress.current = calm ? 1 : Math.min(1, progress.current + dt / INTRO_DURATION)
    const eased = easeOutCubic(progress.current)
    camera.position.setLength(THREE.MathUtils.lerp(INTRO_FROM, INTRO_TO, eased))
    groupRef.current?.scale.setScalar(THREE.MathUtils.lerp(0.86, 1, eased))
  })

  return <group ref={groupRef}>{children}</group>
}

/**
 * 场景时钟。必须排在所有兄弟节点之前：
 * R3F 的 useFrame 按挂载顺序执行，先推进环境数值，后面的组件这一帧才能读到新值。
 */
function EnvironmentClock({ env, calm }: { env: EnvRuntime; calm: boolean }) {
  useFrame((_, dt) => advanceEnvironment(env, dt, calm))
  return null
}

export interface PlanetSceneProps {
  /** 关闭持续性动画 */
  calm: boolean
  quality: VegetationQuality
  /** 星球细分层级 */
  detail: number
}

export function PlanetScene({ calm, quality, detail }: PlanetSceneProps) {
  const mood = usePlanetStore((state) => state.environment.mood)
  const glowFlower = usePlanetStore((state) => state.growth.unlocks.includes('glow-flower'))
  const crystal = usePlanetStore((state) => state.growth.unlocks.includes('crystal-cluster'))
  const lanternRing = usePlanetStore((state) => state.growth.unlocks.includes('lantern-ring'))
  const fireflies = usePlanetStore((state) => state.growth.unlocks.includes('fireflies'))
  const glowMushroom = usePlanetStore((state) => state.growth.unlocks.includes('glow-mushroom'))
  const lighthouse = usePlanetStore((state) => state.growth.unlocks.includes('lighthouse'))
  const pierBoat = usePlanetStore((state) => state.growth.unlocks.includes('pier-boat'))
  const shimmerSea = usePlanetStore((state) => state.growth.unlocks.includes('shimmer-sea'))

  /* 运行时只建一次；换心情只改目标值，由 advance 逐帧过渡，不重建场景 */
  const [env] = useState(() => createEnvironment(mood))
  useEffect(() => {
    retargetEnvironment(env, mood)
  }, [env, mood])

  /* 地表高度场只烘一次，植被与山脉共用：选址读的是渲染网格那层地皮 */
  const ground = useMemo(() => bakeGroundField(detail), [detail])

  /* 用户一旦上手拖动或缩放就永久停掉开场转盘，不做「松手后恢复」这种抢控制权的行为 */
  const [userTookOver, setUserTookOver] = useState(false)
  const takeOver = useCallback(() => setUserTookOver(true), [])

  return (
    <>
      <EnvironmentClock env={env} calm={calm} />
      <EnvironmentLights env={env} />

      <IntroRig calm={calm}>
        <SpinGroup running={!calm && !userTookOver} onTakeOver={takeOver}>
          <PlanetBody detail={detail} env={env} calm={calm} shimmerSea={shimmerSea} />
          <Mountains ground={ground} quality={quality} />
          <Vegetation
            quality={quality}
            ground={ground}
            env={env}
            glowFlower={glowFlower}
            crystal={crystal}
            glowMushroom={glowMushroom}
          />
          <Decorations env={env} lanternRing={lanternRing} />
          <Seaside env={env} calm={calm} lighthouse={lighthouse} pier={pierBoat} />
          <Companion calm={calm} env={env} />
        </SpinGroup>

        {/* 云层、记忆星、辉光不跟星球一起转：它们属于环境，跟着转会让人以为是在拖天空 */}
        <CloudLayer env={env} calm={calm} />
        <MemoryStars env={env} calm={calm} />
        {/* 挂在记忆星之后：同一帧里先更新星的位置，再投影写弹窗，不另开动画循环 */}
        <StarPanelTracker />
        <AtmosphereGlow env={env} />
      </IntroRig>

      <SpaceParticles env={env} calm={calm} fireflies={fireflies} />

      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom
        /* 旋转完全交给 SpinGroup 的四元数累积；这里只保留带夹取和阻尼的缩放 */
        enableRotate={false}
        minDistance={2.2}
        maxDistance={6}
        zoomSpeed={0.6}
        enableDamping
        dampingFactor={0.08}
      />
    </>
  )
}
