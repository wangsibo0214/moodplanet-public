import { useEffect, useMemo, useRef, useState } from 'react'
import { Sparkles, useCursor } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'

import { MOOD_MAP } from '@/features/mood/mood.config'
import { orbitSpeed, starDrift } from '@/features/planet/lib/starLayout'
import {
  decayTierPulse,
  smoothStarSize,
  starSizeScale,
  starSizeTier,
  starTierVisuals,
} from '@/features/planet/lib/starSize'
import { usePlanetStore } from '@/stores/usePlanetStore'
import type { MemoryStar } from '@/types/mood'
import { hashSeed } from '@/utils/id'

import type { EnvRuntime } from './moodEnvironment'
import { registerStarObject, unregisterStarObject } from './starPanelBridge'

/**
 * 记忆星。
 *
 * 每一颗都对应一条真实的 MoodRecord：颜色来自那条记录的情绪，
 * 点开就是那条记录本身。没有记录就不会有星——这里不存在纯装饰的星星。
 */

/**
 * 同时在场景里渲染的上限。
 * 记录很多时全部渲染会让轨道糊成一圈，超出的部分在「记忆星」页面照样能看。
 */
const MAX_RENDERED = 24
/** 刚保存的星有一段升空动画；超过这个时长的星直接就位，刷新时不重播 */
const FRESH_WINDOW = 3000
const APPEAR_DURATION = 0.9
/** 与伙伴长按同一口径：触摸/触控笔按住 450ms 开大小面板 */
const LONG_PRESS_MS = 450
/** 长按期间手指划出这个距离就取消，避免和拖动星球抢手势 */
const LONG_PRESS_MOVE_PX = 10
/** 右键按下到 contextmenu 的位移超过它视为右键拖星球，不弹面板也不拦截菜单 */
const RIGHT_DRAG_PX = 5
/** calm 下不排期漂移：位移恒为零 */
const ZERO_DRIFT: [number, number, number] = [0, 0, 0]

function easeOutBack(t: number): number {
  const c1 = 1.15
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

interface StarNodeProps {
  star: MemoryStar
  env: EnvRuntime
  calm: boolean
}

function StarNode({ star, env, calm }: StarNodeProps) {
  const orbitRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Group>(null)
  const coreRef = useRef<THREE.Mesh>(null)
  const coreMaterial = useRef<THREE.MeshStandardMaterial>(null)
  const haloMaterial = useRef<THREE.MeshBasicMaterial>(null)
  const ringMaterial = useRef<THREE.MeshBasicMaterial>(null)

  const openStar = usePlanetStore((state) => state.openStar)
  const openStarSize = usePlanetStore((state) => state.openStarSize)
  const selected = usePlanetStore((state) => state.selectedRecordId === star.recordId)
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)

  const rightStart = useRef<{ x: number; y: number } | null>(null)
  const pressStart = useRef({ x: 0, y: 0 })
  const press = useRef({ timer: 0, active: false, fired: false })

  /* 显示大小平滑逼近存盘大小；等级脉冲每颗星各自一份，互不影响 */
  const displaySize = useRef(star.size)
  const lastTier = useRef(starSizeTier(star.size))
  const pulse = useRef(0)

  const hex = MOOD_MAP[star.mood].hex
  const visuals = starTierVisuals(star.size)
  const seed = useMemo(() => hashSeed(star.recordId), [star.recordId])
  const speed = useMemo(() => orbitSpeed(seed), [seed])
  /* 只有刚写下的那颗星才播升空动画：用挂载时刻判断，刷新后不会整片重播 */
  const [fresh] = useState(() => {
    const created = Date.parse(star.createdAt)
    return Number.isFinite(created) && Date.now() - created < FRESH_WINDOW
  })
  const appear = useRef(fresh ? 0 : 1)

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    if (appear.current < 1) {
      appear.current = calm ? 1 : Math.min(1, appear.current + dt / APPEAR_DURATION)
    }
    const rise = easeOutBack(appear.current)
    const lit = hovered || selected

    /* 拖滑块时大小平滑过渡；calm 直接到位，不排期任何动作 */
    displaySize.current = calm ? star.size : smoothStarSize(displaySize.current, star.size, dt)

    /* 用户把大小拖过等级边界时给一下柔和光晕反馈；初始挂载不触发，刷新不闪 */
    const tier = starSizeTier(star.size)
    if (tier !== lastTier.current) {
      lastTier.current = tier
      if (!calm) pulse.current = 1
    }
    pulse.current = decayTierPulse(pulse.current, dt)

    /* 每颗星沿自己的倾斜轨道独立公转：角度只跟场景时钟走，
       开面板、调大小、组件重渲染都不会让它跳位；calm 时时钟冻结即停 */
    if (orbitRef.current) {
      orbitRef.current.rotation.y = star.orbit.phase + env.time * speed
    }

    if (bodyRef.current) {
      /* 从地表附近升到自己的散点半径上；叠加每颗星独立的缓慢游走，让轨道边缘不那么圆 */
      const drift = calm ? ZERO_DRIFT : starDrift(seed, env.time)
      bodyRef.current.position.set(
        star.orbit.radius * (0.72 + 0.28 * rise) + drift[0],
        drift[1],
        drift[2],
      )
      const breathe = calm ? 1 : 1 + Math.sin(env.time * 1.4 + star.orbit.phase) * 0.05
      bodyRef.current.scale.setScalar(
        rise * breathe * (lit ? 1.2 : 1) * starSizeScale(displaySize.current),
      )
    }
    if (coreRef.current && !calm) {
      coreRef.current.rotation.y = env.time * 0.5
      coreRef.current.rotation.x = env.time * 0.28
    }
    if (coreMaterial.current) {
      /* 星的亮度跟着整体光晕走：开心的夜里更亮，疲惫时柔下来；等级只调强度不改颜色 */
      const twinkle = calm
        ? 0
        : Math.sin(env.time * 1.5 + star.orbit.phase * 2) * 0.18 * (0.4 + env.values.starTwinkle)
      coreMaterial.current.emissiveIntensity =
        (0.85 + env.values.glow * 0.5 + twinkle) *
        (lit ? 1.55 : 1) *
        rise *
        visuals.emissive *
        (1 + pulse.current * 0.2)
    }
    if (haloMaterial.current) {
      haloMaterial.current.opacity =
        (0.13 + env.values.starBrightness * 0.13) *
        (lit ? 1.7 : 1) *
        rise *
        visuals.halo *
        (1 + pulse.current * 0.45)
    }
    if (ringMaterial.current) {
      ringMaterial.current.opacity = (lit ? 0.7 : 0.32) * rise * visuals.ring
    }
  })

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    /* delta 是按下到抬起的指针位移，拖拽转星球时不应触发 */
    if (event.delta > 5) return
    /* 长按已经开过大小面板：抬手时浏览器补发的 click 不能再开详情 */
    if (press.current.fired) {
      press.current.fired = false
      return
    }
    event.stopPropagation()
    openStar(star.recordId)
  }

  /* 右键：按下时记位置，contextmenu 时比对位移——右键拖动同样会转星球，拖完不该弹面板 */
  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    const native = event.nativeEvent
    if (native.button === 2) {
      rightStart.current = { x: native.clientX, y: native.clientY }
      return
    }
    /* 长按只对触摸/触控笔生效：鼠标左键按住不动不是「长按」，交给点击与拖拽 */
    if (native.pointerType === 'mouse') return
    pressStart.current = { x: native.clientX, y: native.clientY }
    press.current.fired = false
    if (press.current.timer !== 0) window.clearTimeout(press.current.timer)
    press.current.active = true
    press.current.timer = window.setTimeout(() => {
      press.current.timer = 0
      press.current.active = false
      press.current.fired = true
      openStarSize(star.id)
    }, LONG_PRESS_MS)
  }

  const handleContextMenu = (event: ThreeEvent<MouseEvent>) => {
    const native = event.nativeEvent
    const start = rightStart.current
    rightStart.current = null
    /* 位移超阈值视为右键拖动（在转星球），放行浏览器默认行为，不弹面板也不拦截 */
    if (!start || Math.hypot(native.clientX - start.x, native.clientY - start.y) > RIGHT_DRAG_PX)
      return
    event.stopPropagation()
    /* 只在命中记忆星时压掉浏览器右键菜单；点在星球或空白处照旧 */
    native.preventDefault()
    openStarSize(star.id)
  }

  /* 供弹窗 tracker 查表投影：挂载注册、卸载摘除 */
  useEffect(() => {
    const object = bodyRef.current
    if (!object) return
    registerStarObject(star.recordId, object)
    return () => unregisterStarObject(star.recordId, object)
  }, [star.recordId])

  /* 长按期间手指划走、抬起或系统取消，都要撤掉定时器；卸载时一并清理 */
  useEffect(() => {
    const cancel = () => {
      if (press.current.timer !== 0) {
        window.clearTimeout(press.current.timer)
        press.current.timer = 0
      }
      press.current.active = false
    }
    const onMove = (event: PointerEvent) => {
      if (!press.current.active) return
      const start = pressStart.current
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > LONG_PRESS_MOVE_PX)
        cancel()
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', cancel)
    window.addEventListener('pointercancel', cancel)
    return () => {
      cancel()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', cancel)
      window.removeEventListener('pointercancel', cancel)
    }
  }, [])

  return (
    <group rotation={[star.orbit.tiltX, 0, star.orbit.tiltZ]}>
      <group ref={orbitRef} rotation={[0, star.orbit.phase, 0]}>
        <group
          ref={bodyRef}
          position={[star.orbit.radius, 0, 0]}
          onClick={handleClick}
          onPointerDown={handlePointerDown}
          onContextMenu={handleContextMenu}
          onPointerOver={(event) => {
            event.stopPropagation()
            setHovered(true)
          }}
          onPointerOut={() => setHovered(false)}
        >
          {/* 光晕：加色混合的软球，让星在深色宇宙里有体积感 */}
          <mesh>
            <sphereGeometry args={[0.058, 12, 9]} />
            <meshBasicMaterial
              ref={haloMaterial}
              color={hex}
              transparent
              opacity={0.18}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>

          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.078, 0.004, 6, 28]} />
            <meshBasicMaterial
              ref={ringMaterial}
              color={hex}
              transparent
              opacity={0.32}
              depthWrite={false}
            />
          </mesh>

          <mesh ref={coreRef}>
            <octahedronGeometry args={[0.03, 0]} />
            <meshStandardMaterial
              ref={coreMaterial}
              color="#FFFFFF"
              emissive={hex}
              emissiveIntensity={1}
              roughness={0.3}
            />
          </mesh>

          {/* 珍藏档的细微星光：沿用情绪色、缓慢漂移；calm 不挂载。
              禁用 raycast，避免粒子扩大星的点击热区 */}
          {visuals.sparkles && !calm && (
            <Sparkles
              count={6}
              scale={0.22}
              size={0.8}
              speed={0.25}
              opacity={0.5}
              noise={0.4}
              color={hex}
              raycast={() => null}
            />
          )}
        </group>
      </group>
    </group>
  )
}

export function MemoryStars({ env, calm }: { env: EnvRuntime; calm: boolean }) {
  const stars = usePlanetStore((state) => state.stars)
  if (stars.length === 0) return null

  const visible = stars.length > MAX_RENDERED ? stars.slice(-MAX_RENDERED) : stars

  return (
    <group name="memory-stars">
      {visible.map((star) => (
        <StarNode key={star.id} star={star} env={env} calm={calm} />
      ))}
    </group>
  )
}
