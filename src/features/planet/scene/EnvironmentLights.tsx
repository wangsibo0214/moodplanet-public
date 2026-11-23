import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { pulseAmount, type EnvRuntime } from './moodEnvironment'

/**
 * 场景灯光。所有颜色与强度都从同一份 EnvRuntime 读，
 * 换心情时五盏灯同步渐变，不会出现「天空变暖了但补光还是冷的」这种割裂。
 */

/**
 * 补光与暖光用 decay=1 而不是 three 默认的平方反比。
 * 这个场景只有 4~5 个世界单位大，平方反比会把两三个单位外的灯衰减到几乎为零，
 * 写出来的强度值在画面上完全看不出差别。
 */
const FILL_DECAY = 1

/**
 * 美术基线倍率：环境光收一档、主光抬一档，明暗交界才读得出体积而不是平涂。
 * 乘在统一出口上，各心情之间的相对平衡保持不变。
 */
const AMBIENT_SCALE = 0.5
const HEMI_SCALE = 0.55
const SUN_SCALE = 1.6
const RIM_BASE = 1.3
const RIM_WHITE = new THREE.Color('#FFFFFF')

export function EnvironmentLights({ env }: { env: EnvRuntime }) {
  const ambient = useRef<THREE.AmbientLight>(null)
  const hemi = useRef<THREE.HemisphereLight>(null)
  const sun = useRef<THREE.DirectionalLight>(null)
  const fill = useRef<THREE.PointLight>(null)
  const warm = useRef<THREE.PointLight>(null)
  const rim = useRef<THREE.DirectionalLight>(null)
  const rimColor = useRef(new THREE.Color())

  /* R3F 只会赋值 shadow-camera-* ，不会重算投影矩阵，正交视锥必须手动更新一次 */
  useEffect(() => {
    const camera = sun.current?.shadow.camera
    if (!camera) return
    camera.near = 0.5
    camera.far = 20
    camera.left = -3
    camera.right = 3
    camera.top = 3
    camera.bottom = -3
    camera.updateProjectionMatrix()
  }, [])

  useFrame((state) => {
    const v = env.values
    /* 柔和动态光：只作用在环境光与补光上。
       太阳不参与，否则阴影会跟着明暗抖动，读起来像故障而不是呼吸。 */
    const pulse = pulseAmount(env)

    if (ambient.current) {
      ambient.current.color.copy(env.colors.ambient)
      ambient.current.intensity = v.ambientIntensity * pulse * AMBIENT_SCALE
    }
    if (hemi.current) {
      hemi.current.color.copy(env.colors.hemiSky)
      hemi.current.groundColor.copy(env.colors.hemiGround)
      hemi.current.intensity = v.hemiIntensity * pulse * HEMI_SCALE
    }
    if (sun.current) {
      sun.current.color.copy(env.colors.sun)
      sun.current.intensity = v.sunIntensity * SUN_SCALE
    }
    if (fill.current) {
      fill.current.color.copy(env.colors.fill)
      fill.current.intensity = v.fillIntensity * pulse
    }
    if (warm.current) {
      /* 难过与疲惫时逐渐浮起的那层暖光 */
      warm.current.intensity = v.warmGlow * 3.5 * pulse
    }
    if (rim.current) {
      /* 冷色轮廓光：从背后勾出星球与山脊的边缘，颜色跟着补光走才不割裂 */
      rimColor.current.copy(env.colors.fill).lerp(RIM_WHITE, 0.35)
      rim.current.color.copy(rimColor.current)
      rim.current.intensity = RIM_BASE + v.glow * 0.3
    }

    state.gl.toneMappingExposure = v.exposure
  })

  return (
    <>
      <ambientLight ref={ambient} intensity={0.85} color="#C9C4FF" />
      <hemisphereLight ref={hemi} args={['#BCB4FF', '#2A2350', 0.65]} />

      <directionalLight
        ref={sun}
        position={[4, 6, 3]}
        intensity={2.3}
        color="#FFF3D6"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />

      {/* 冷色补光，避免暗部死黑 */}
      <pointLight
        ref={fill}
        position={[-3.4, -1.6, -2.6]}
        intensity={1.1}
        color="#6FB6F0"
        decay={FILL_DECAY}
      />

      {/* 轮廓光：不投影，只勾边；拖拽旋转时阴影不会跟着重算 */}
      <directionalLight ref={rim} position={[-4.6, 2.4, -4.6]} intensity={0.9} color="#8FB4FF" />

      {/* 温暖微光：难过时从星球正面缓缓亮起，疲惫时留一盏夜灯 */}
      <pointLight
        ref={warm}
        position={[1.7, 0.9, 2.2]}
        intensity={0}
        color="#FFD9A0"
        decay={FILL_DECAY}
      />
    </>
  )
}
