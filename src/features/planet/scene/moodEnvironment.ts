import * as THREE from 'three'

import type { MoodKey } from '@/types/mood'

/**
 * 情绪 → 场景参数。
 *
 * 每种心情对应一组具体数值，场景里的灯光、云层、水面、植被、星光、伙伴
 * 全部读同一份运行时对象，因此换心情时所有元素是同步渐变的，不会各跳各的。
 * 数值一律取「柔和」区间：焦虑不闪、疲惫不黑、兴奋不刺眼。
 */

const COLOR_KEYS = ['ambient', 'hemiSky', 'hemiGround', 'sun', 'fill', 'tint'] as const

const NUMBER_KEYS = [
  'ambientIntensity',
  'hemiIntensity',
  'sunIntensity',
  'fillIntensity',
  'exposure',
  'glow',
  'cloudOpacity',
  'cloudSpeed',
  'waterRoughness',
  'waterOpacity',
  'waterEmissive',
  'wind',
  'bloom',
  'starBrightness',
  'starTwinkle',
  'dew',
  'rest',
  'warmGlow',
  'pulse',
] as const

export type ColorKey = (typeof COLOR_KEYS)[number]
export type NumberKey = (typeof NUMBER_KEYS)[number]
export type EnvSpec = Record<ColorKey, string> & Record<NumberKey, number>

/** 没有任何记录时的星球：默认的安静蓝紫夜空。这也是所有心情的回落基线。 */
export const BASELINE: EnvSpec = {
  ambient: '#C9C4FF',
  hemiSky: '#BCB4FF',
  hemiGround: '#2A2350',
  sun: '#FFF3D6',
  fill: '#6FB6F0',
  tint: '#96AAFF',

  ambientIntensity: 0.85,
  hemiIntensity: 0.65,
  sunIntensity: 2.3,
  fillIntensity: 1.1,
  exposure: 1.15,
  glow: 0.75,
  cloudOpacity: 0,
  cloudSpeed: 0.008,
  waterRoughness: 0.16,
  waterOpacity: 0.78,
  waterEmissive: 0.45,
  wind: 0.22,
  bloom: 0.35,
  starBrightness: 0.9,
  starTwinkle: 0,
  dew: 0,
  rest: 0,
  warmGlow: 0,
  pulse: 0,
}

const OVERRIDES: Record<MoodKey, Partial<EnvSpec>> = {
  /* 开心：环境光偏暖 + 花朵逐渐开放 + 星星更明亮 */
  joy: {
    ambient: '#FFE1B4',
    hemiSky: '#FFD9A8',
    hemiGround: '#3A2B4E',
    sun: '#FFEBBE',
    fill: '#FFC98A',
    tint: '#FFD170',

    ambientIntensity: 1.0,
    hemiIntensity: 0.74,
    sunIntensity: 2.6,
    fillIntensity: 1.0,
    exposure: 1.22,
    glow: 0.95,
    cloudOpacity: 0.1,
    waterRoughness: 0.2,
    waterEmissive: 0.5,
    wind: 0.3,
    bloom: 1,
    starBrightness: 1,
    starTwinkle: 0.22,
    warmGlow: 0.34,
  },

  /* 平静：蓝紫色天空 + 平静水面 + 柔和微风 */
  calm: {
    ambient: '#C3C6FF',
    hemiSky: '#8FA6FF',
    hemiGround: '#241F45',
    sun: '#E6ECFF',
    fill: '#7FA8F5',
    tint: '#7BD9BC',

    ambientIntensity: 0.86,
    hemiIntensity: 0.8,
    sunIntensity: 2.0,
    fillIntensity: 1.2,
    exposure: 1.12,
    glow: 0.68,
    cloudOpacity: 0.14,
    cloudSpeed: 0.006,
    waterRoughness: 0.05,
    waterOpacity: 0.86,
    waterEmissive: 0.6,
    wind: 0.12,
    bloom: 0.55,
    starBrightness: 0.85,
    starTwinkle: 0.05,
    dew: 0.15,
    rest: 0.14,
    warmGlow: 0.1,
  },

  /* 疲惫：夜色更柔和 + 伙伴休息 + 环境光舒缓 */
  tired: {
    ambient: '#A9A6E8',
    hemiSky: '#6E6BB8',
    hemiGround: '#171433',
    sun: '#DCD6FF',
    fill: '#5C6FD0',
    tint: '#BFB0FB',

    ambientIntensity: 0.55,
    hemiIntensity: 0.45,
    sunIntensity: 1.25,
    fillIntensity: 0.75,
    exposure: 0.94,
    glow: 0.42,
    cloudOpacity: 0.22,
    cloudSpeed: 0.004,
    waterRoughness: 0.28,
    waterOpacity: 0.72,
    waterEmissive: 0.3,
    wind: 0.07,
    bloom: 0.3,
    starBrightness: 0.95,
    dew: 0,
    rest: 1,
    warmGlow: 0.3,
  },

  /* 焦虑：缓慢移动的云层 + 柔和动态光效 + 避免刺眼压迫 */
  anxious: {
    ambient: '#BDB4F2',
    hemiSky: '#9C8FE8',
    hemiGround: '#2A2450',
    sun: '#EFE6FF',
    fill: '#8E7FE0',
    tint: '#A48FF2',

    /* 整体比基线暗一档：亮度越低，压迫感越小 */
    ambientIntensity: 0.78,
    hemiIntensity: 0.68,
    sunIntensity: 1.7,
    fillIntensity: 1.0,
    exposure: 1.06,
    glow: 0.78,
    cloudOpacity: 0.46,
    cloudSpeed: 0.028,
    waterRoughness: 0.22,
    wind: 0.34,
    bloom: 0.45,
    starBrightness: 0.7,
    starTwinkle: 0.1,
    dew: 0.1,
    rest: 0.1,
    warmGlow: 0.26,
    /* 呼吸式的明暗起伏，频率很低（见 pulseAmount），不是爆闪 */
    pulse: 0.18,
  },

  /* 难过：雨后环境 + 植物水珠 + 逐渐展现温暖微光 */
  sad: {
    ambient: '#AFC4E8',
    hemiSky: '#7E9BD8',
    hemiGround: '#1E2440',
    sun: '#DCE8FF',
    fill: '#6FB6F0',
    tint: '#6FB6F0',

    ambientIntensity: 0.68,
    hemiIntensity: 0.6,
    sunIntensity: 1.5,
    fillIntensity: 1.15,
    exposure: 1.02,
    glow: 0.5,
    cloudOpacity: 0.3,
    cloudSpeed: 0.012,
    /* 雨后：水面更平滑、反光更强 */
    waterRoughness: 0.08,
    waterOpacity: 0.88,
    waterEmissive: 0.55,
    wind: 0.12,
    bloom: 0.4,
    starBrightness: 0.8,
    starTwinkle: 0.08,
    dew: 1,
    rest: 0.25,
    /* 冷调之上叠一层暖光，对应「逐渐展现温暖微光」 */
    warmGlow: 0.72,
    pulse: 0.06,
  },

  /* 兴奋：柔和闪烁的星光 + 花植更活跃的动画 */
  excited: {
    ambient: '#FFD3E4',
    hemiSky: '#FFB7CE',
    hemiGround: '#3A2450',
    sun: '#FFF0DC',
    fill: '#FF9FBE',
    tint: '#FFA3BE',

    ambientIntensity: 0.95,
    hemiIntensity: 0.76,
    sunIntensity: 2.5,
    fillIntensity: 1.2,
    exposure: 1.2,
    glow: 1,
    cloudOpacity: 0.08,
    cloudSpeed: 0.014,
    waterRoughness: 0.14,
    waterOpacity: 0.82,
    waterEmissive: 0.55,
    wind: 0.62,
    bloom: 0.9,
    starBrightness: 1,
    starTwinkle: 0.75,
    rest: 0,
    warmGlow: 0.4,
    pulse: 0.1,
  },
}

export const MOOD_ENV: Record<MoodKey, EnvSpec> = Object.fromEntries(
  (Object.keys(OVERRIDES) as MoodKey[]).map((key) => [key, { ...BASELINE, ...OVERRIDES[key] }]),
) as Record<MoodKey, EnvSpec>

export function envSpecFor(mood: MoodKey | null): EnvSpec {
  return mood === null ? BASELINE : MOOD_ENV[mood]
}

export interface EnvRuntime {
  /** 当前真实生效的颜色，逐帧逼近目标 */
  colors: Record<ColorKey, THREE.Color>
  /** 当前真实生效的数值，逐帧逼近目标 */
  values: Record<NumberKey, number>
  target: EnvSpec
  targetColors: Record<ColorKey, THREE.Color>
  /** 场景累计时间；calm 时不推进，所有周期动画因此静止 */
  time: number
}

/** 渐变速度：约 0.9 秒走完 63%，2.6 秒基本到位。够慢才读得出「逐渐」。 */
const LAMBDA = 1.15
/** 单帧最大步长：切回标签页时第一帧的 dt 可能是整段停顿时长 */
const MAX_STEP = 0.05

function buildColors(spec: EnvSpec): Record<ColorKey, THREE.Color> {
  const colors = {} as Record<ColorKey, THREE.Color>
  for (const key of COLOR_KEYS) colors[key] = new THREE.Color(spec[key])
  return colors
}

function buildValues(spec: EnvSpec): Record<NumberKey, number> {
  const values = {} as Record<NumberKey, number>
  for (const key of NUMBER_KEYS) values[key] = spec[key]
  return values
}

/**
 * 建一份运行时。初始值直接落在目标上：
 * 刷新页面后星球应当立刻就是存盘时的样子，而不是从默认色再渐变一次。
 */
export function createEnvironment(mood: MoodKey | null): EnvRuntime {
  const spec = envSpecFor(mood)
  return {
    colors: buildColors(spec),
    values: buildValues(spec),
    target: spec,
    targetColors: buildColors(spec),
    time: 0,
  }
}

/** 切换目标心情。已经生效的数值不动，交给 advance 逐帧过渡。 */
export function retargetEnvironment(env: EnvRuntime, mood: MoodKey | null): void {
  const spec = envSpecFor(mood)
  if (spec === env.target) return
  env.target = spec
  for (const key of COLOR_KEYS) env.targetColors[key].set(spec[key])
}

export function advanceEnvironment(env: EnvRuntime, dt: number, calm: boolean): void {
  const step = Math.min(dt, MAX_STEP)
  if (!calm) env.time += step
  /* calm 时直接落到目标：减少动效下不该有任何持续渐变 */
  const k = calm ? 1 : 1 - Math.exp(-LAMBDA * step)
  if (k >= 1) {
    for (const key of COLOR_KEYS) env.colors[key].copy(env.targetColors[key])
    for (const key of NUMBER_KEYS) env.values[key] = env.target[key]
    return
  }
  for (const key of COLOR_KEYS) env.colors[key].lerp(env.targetColors[key], k)
  for (const key of NUMBER_KEYS) {
    env.values[key] += (env.target[key] - env.values[key]) * k
  }
}

/**
 * 「柔和动态光」的瞬时倍率：1 ± pulse。
 * 周期取 7 秒，肉眼读作呼吸而不是闪烁；pulse 最大 0.18，不会造成刺眼或压迫。
 */
export function pulseAmount(env: EnvRuntime): number {
  const pulse = env.values.pulse
  if (pulse <= 0) return 1
  return 1 + Math.sin(env.time * ((Math.PI * 2) / 7)) * pulse
}

/** 星光明暗的瞬时倍率：周期 3.4 秒，各颗星按相位错开由调用方处理。 */
export function twinkleAmount(env: EnvRuntime, phase: number): number {
  const amount = env.values.starTwinkle
  if (amount <= 0) return 1
  return 1 + Math.sin(env.time * 1.85 + phase) * amount
}
