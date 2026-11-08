import { STORAGE_PREFIX } from '@/services/storage'
import type { TimeCapsule } from '@/types/capsule'
import { toDate } from '@/utils/date'

/**
 * 时光胶囊的本地仓储。
 *
 * 单独一个信封：胶囊是「写给未来的信」，丢了的代价比星球装饰大得多，
 * 所以解析失败时把原文备份出来，而不是静默清空。
 */

const CAPSULE_KEY = `${STORAGE_PREFIX}capsules`
const CORRUPT_KEY_PREFIX = `${STORAGE_PREFIX}capsules:corrupt-`
const SCHEMA_VERSION = 1

export interface CapsuleLoadResult {
  capsules: TimeCapsule[]
  /** 读取或解析出问题时给界面的一句话说明，null 表示一切正常 */
  error: string | null
}

export interface CapsuleRepository {
  load(): Promise<CapsuleLoadResult>
  save(capsules: TimeCapsule[]): Promise<boolean>
}

interface Envelope {
  version: number
  savedAt: string
  capsules: TimeCapsule[]
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isIsoDate(value: unknown): value is string {
  return isString(value) && toDate(value) !== null
}

function coerceCapsule(value: unknown): TimeCapsule | null {
  if (typeof value !== 'object' || value === null) return null
  const raw = value as Partial<TimeCapsule> & Record<string, unknown>

  /* 缺 id 或时间戳的胶囊没法判定到期，直接丢掉，不留打不开也删不掉的幽灵 */
  if (!isString(raw.id) || raw.id.length === 0) return null
  if (!isIsoDate(raw.createdAt)) return null
  if (!isIsoDate(raw.unlockAt)) return null

  return {
    id: raw.id,
    title: isString(raw.title) ? raw.title : '',
    content: isString(raw.content) ? raw.content : '',
    createdAt: raw.createdAt,
    unlockAt: raw.unlockAt,
    /* status 由 store 对照真实时钟重算，这里只给一个合法占位 */
    status: 'sealed',
    openedAt: isIsoDate(raw.openedAt) ? raw.openedAt : null,
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
    capsules: Array.isArray(candidate.capsules) ? candidate.capsules : [],
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

export const localCapsuleRepository: CapsuleRepository = {
  async load() {
    let text: string | null
    try {
      text = window.localStorage.getItem(CAPSULE_KEY)
    } catch {
      return {
        capsules: [],
        error: '浏览器不允许访问本地存储，胶囊只会留在当前页面里。',
      }
    }

    if (text === null || text === '') return { capsules: [], error: null }

    const envelope = parseEnvelope(text)
    if (!envelope) {
      const backup = backupCorrupt(text)
      return {
        capsules: [],
        error: backup
          ? `时光胶囊没能读出来，原文已备份到 ${backup}。很抱歉，这部分内容暂时无法恢复显示。`
          : '时光胶囊没能读出来，也无法备份。很抱歉，这部分内容暂时无法恢复显示。',
      }
    }

    const capsules: TimeCapsule[] = []
    let dropped = 0
    for (const item of envelope.capsules) {
      const capsule = coerceCapsule(item)
      if (capsule) capsules.push(capsule)
      else dropped += 1
    }

    if (dropped > 0) {
      return {
        capsules,
        error: `有 ${dropped} 个胶囊缺少完整的时间信息，已经跳过；其余 ${capsules.length} 个正常读出。`,
      }
    }

    return { capsules, error: null }
  },

  async save(capsules) {
    const envelope: Envelope = {
      version: SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
      capsules,
    }
    try {
      window.localStorage.setItem(CAPSULE_KEY, JSON.stringify(envelope))
      return true
    } catch {
      return false
    }
  },
}
