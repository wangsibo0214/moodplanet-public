export const STAR_SIZE_MIN = 50
export const STAR_SIZE_MAX = 150
export const STAR_SIZE_DEFAULT = 100

export type StarSizeTier = 'normal' | 'important' | 'treasured'

export const STAR_TIER_LABELS: Record<StarSizeTier, string> = {
  normal: '普通',
  important: '重要',
  treasured: '珍藏',
}

/** 大小只存百分比整数；非法值回到默认，越界夹回范围 */
export function clampStarSize(value: unknown): number {
  const n = typeof value === 'number' ? value : Number.NaN
  if (!Number.isFinite(n)) return STAR_SIZE_DEFAULT
  return Math.min(STAR_SIZE_MAX, Math.max(STAR_SIZE_MIN, Math.round(n)))
}

/** 等级由大小实时算出，不单独存一份，避免两者打架 */
export function starSizeTier(size: number): StarSizeTier {
  const s = clampStarSize(size)
  if (s <= 80) return 'normal'
  if (s <= 120) return 'important'
  return 'treasured'
}

export function starSizeScale(size: number): number {
  return clampStarSize(size) / 100
}

/**
 * 各等级的光效系数：只调现有光晕/自发光/光环的强度，
 * 不改情绪色、材质与基础模型。重要档全为 1，即默认画面逐位不变。
 */
export interface StarTierVisuals {
  halo: number
  emissive: number
  ring: number
  /** 珍藏档能点亮的细微星光粒子 */
  sparkles: boolean
}

const TIER_VISUALS: Record<StarSizeTier, StarTierVisuals> = {
  normal: { halo: 0.7, emissive: 0.85, ring: 0.75, sparkles: false },
  important: { halo: 1, emissive: 1, ring: 1, sparkles: false },
  treasured: { halo: 1.4, emissive: 1.15, ring: 1.3, sparkles: true },
}

export function starTierVisuals(size: number): StarTierVisuals {
  return TIER_VISUALS[starSizeTier(size)]
}

/**
 * 显示大小每帧向目标靠拢（dt 秒）。约 0.4 秒内收敛；
 * 误差小于 0.05 直接吸附，避免无限逼近。calm 场景不调用，直接取目标。
 */
export function smoothStarSize(current: number, target: number, dt: number): number {
  const next = current + (target - current) * Math.min(1, Math.max(0, dt) * 8)
  return Math.abs(target - next) < 0.05 ? target : next
}

/** 等级切换那一下的光晕反馈时长（秒），柔和不夸张 */
export const TIER_PULSE_SECONDS = 0.7

/** 脉冲强度随时间线性衰减到 0，不为负 */
export function decayTierPulse(value: number, dt: number): number {
  return Math.max(0, value - Math.max(0, dt) / TIER_PULSE_SECONDS)
}