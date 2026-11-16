import { MOOD_MAP } from '@/features/mood/mood.config'
import { evaluateUnlocks, UNLOCK_MAP } from '@/features/planet/growth.config'
import { clampStarSize } from '@/features/planet/lib/starSize'
import { STORAGE_PREFIX } from '@/services/storage'
import type { MemoryStar, MoodKey, PlanetEnvironment, PlanetGrowth, StarOrbit } from '@/types/mood'

/**
 * 星球生态的本地仓储：记忆星、成长解锁、当前环境状态。
 *
 * 与情绪记录分开存一份，理由是两个信封的写入频率与损坏影响面不同——
 * 星球状态坏了最多是装饰回到初始，记录坏了才是真的丢东西。
 * 结构同样是带版本号的信封，将来换 IndexedDB / 远端数据库时替换实现即可。
 */

const PLANET_KEY = `${STORAGE_PREFIX}planet`
const CORRUPT_KEY_PREFIX = `${STORAGE_PREFIX}planet:corrupt-`
const SCHEMA_VERSION = 1

export interface PlanetSnapshot {
  stars: MemoryStar[]
  growth: PlanetGrowth
  environment: PlanetEnvironment
}

export interface PlanetLoadResult {
  data: PlanetSnapshot
  /** 读取或解析出问题时给界面的一句话说明，null 表示一切正常 */
  error: string | null
}

export interface PlanetRepository {
  load(): Promise<PlanetLoadResult>
  save(data: PlanetSnapshot): Promise<boolean>
}

interface Envelope extends PlanetSnapshot {
  version: number
  savedAt: string
}

export const DEFAULT_GROWTH: PlanetGrowth = { totalSaved: 0, interactions: 0, unlocks: [] }

export const DEFAULT_ENVIRONMENT: PlanetEnvironment = {
  mood: null,
  recordId: null,
  updatedAt: '',
}

export const EMPTY_SNAPSHOT: PlanetSnapshot = {
  stars: [],
  growth: DEFAULT_GROWTH,
  environment: DEFAULT_ENVIRONMENT,
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function toNumber(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'number' ? value : Number.NaN
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

function coerceOrbit(value: unknown): StarOrbit {
  const raw = (typeof value === 'object' && value !== null ? value : {}) as Partial<StarOrbit>
  return {
    /* 半径夹在地表（约 1.3）与视锥半高之间，超出范围的星会转到画布外点不到 */
    radius: toNumber(raw.radius, 1.42, 1.3, 1.9),
    phase: toNumber(raw.phase, 0, 0, Math.PI * 2),
    tiltX: toNumber(raw.tiltX, 0, -0.9, 0.9),
    tiltZ: toNumber(raw.tiltZ, 0, -0.9, 0.9),
  }
}

function coerceStar(value: unknown): MemoryStar | null {
  if (typeof value !== 'object' || value === null) return null
  const raw = value as Partial<MemoryStar> & Record<string, unknown>

  /* 星没有 recordId 就成了纯装饰，这种数据直接丢掉，不留「点不开的星」 */
  if (!isString(raw.id) || raw.id.length === 0) return null
  if (!isString(raw.recordId) || raw.recordId.length === 0) return null
  if (!isString(raw.mood) || !(raw.mood in MOOD_MAP)) return null

  return {
    id: raw.id,
    recordId: raw.recordId,
    mood: raw.mood as MoodKey,
    orbit: coerceOrbit(raw.orbit),
    title: isString(raw.title) ? raw.title : '',
    createdAt: isString(raw.createdAt) ? raw.createdAt : '',
    size: clampStarSize(raw.size),
  }
}

function coerceGrowth(value: unknown): PlanetGrowth {
  const raw = (typeof value === 'object' && value !== null ? value : {}) as Partial<PlanetGrowth>
  const unlocks = Array.isArray(raw.unlocks)
    ? raw.unlocks.filter((id): id is string => isString(id) && id in UNLOCK_MAP)
    : []
  const growth: PlanetGrowth = {
    totalSaved: Math.round(toNumber(raw.totalSaved, 0, 0, 1_000_000)),
    interactions: Math.round(toNumber(raw.interactions, 0, 0, 1_000_000)),
    unlocks,
  }
  /* 计数达标但列表里没有的项补回来：解锁只能加不能减 */
  growth.unlocks = evaluateUnlocks(growth)
  return growth
}

function coerceEnvironment(value: unknown): PlanetEnvironment {
  const raw =
    (typeof value === 'object' && value !== null ? value : {}) as Partial<PlanetEnvironment>
  const mood = isString(raw.mood) && raw.mood in MOOD_MAP ? (raw.mood as MoodKey) : null
  return {
    mood,
    /* 情绪认不出来时关联的记录 id 也一并作废，避免界面拿它去查一条不存在的记录 */
    recordId: mood === null || !isString(raw.recordId) ? null : raw.recordId,
    updatedAt: isString(raw.updatedAt) ? raw.updatedAt : '',
  }
}

function parseEnvelope(text: string): Envelope | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }
  if (typeof parsed !== 'object' || parsed === null) return null
  const candidate = parsed as Partial<Envelope>
  if (typeof candidate.version !== 'number') return null
  return {
    version: candidate.version,
    savedAt: isString(candidate.savedAt) ? candidate.savedAt : '',
    stars: Array.isArray(candidate.stars) ? (candidate.stars as MemoryStar[]) : [],
    growth: coerceGrowth(candidate.growth),
    environment: coerceEnvironment(candidate.environment),
  }
}

function backupCorrupt(text: string): string | null {
  const key = `${CORRUPT_KEY_PREFIX}${Date.now()}`
  try {
    window.localStorage.setItem(key, text)
    return key
  } catch {
    return null
  }
}

export const localPlanetRepository: PlanetRepository = {
  async load() {
    let text: string | null
    try {
      text = window.localStorage.getItem(PLANET_KEY)
    } catch {
      return {
        data: EMPTY_SNAPSHOT,
        error: '浏览器不允许访问本地存储，星球状态只会留在当前页面里。',
      }
    }

    if (text === null || text === '') return { data: EMPTY_SNAPSHOT, error: null }

    const envelope = parseEnvelope(text)
    if (!envelope) {
      const backup = backupCorrupt(text)
      return {
        data: EMPTY_SNAPSHOT,
        error: backup
          ? `星球状态没能读出来，原文已备份到 ${backup}。记忆星会按现有记录重新点亮，只有互动计数从头开始。`
          : '星球状态没能读出来，也无法备份。记忆星会按现有记录重新点亮，只有互动计数从头开始。',
      }
    }

    const stars: MemoryStar[] = []
    let dropped = 0
    for (const item of envelope.stars) {
      const star = coerceStar(item)
      if (star) stars.push(star)
      else dropped += 1
    }

    const data: PlanetSnapshot = {
      stars,
      growth: envelope.growth,
      environment: envelope.environment,
    }

    if (dropped > 0) {
      return {
        data,
        error: `有 ${dropped} 颗记忆星缺少关联记录，已经清理掉；其余 ${stars.length} 颗正常读出。`,
      }
    }

    return { data, error: null }
  },

  async save(data) {
    const envelope: Envelope = {
      version: SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
      stars: data.stars,
      growth: data.growth,
      environment: data.environment,
    }
    try {
      window.localStorage.setItem(PLANET_KEY, JSON.stringify(envelope))
      return true
    } catch {
      return false
    }
  },
}
