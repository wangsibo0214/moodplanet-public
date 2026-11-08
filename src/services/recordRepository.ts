import { MOOD_MAP, TAG_MAP } from '@/features/mood/mood.config'
import { STORAGE_PREFIX } from '@/services/storage'
import type { MoodKey, MoodRecord, PlanetSuggestion, TagKey } from '@/types/mood'

/**
 * 情绪记录的本地仓储。
 *
 * 存的是一个带版本号的信封 `{ version, savedAt, records }`：
 * 版本号为将来的结构迁移留位置，异步接口为将来换成 IndexedDB / 远端数据库留位置。
 * 替换实现时只要再写一个满足 RecordRepository 的对象即可，调用方不用改。
 */

const RECORDS_KEY = `${STORAGE_PREFIX}records`
const CORRUPT_KEY_PREFIX = `${STORAGE_PREFIX}records:corrupt-`
const SCHEMA_VERSION = 1

export interface LoadResult {
  records: MoodRecord[]
  /** 读取或解析出问题时给界面的一句话说明，null 表示一切正常 */
  error: string | null
}

export interface RecordRepository {
  load(): Promise<LoadResult>
  save(records: MoodRecord[]): Promise<boolean>
}

interface Envelope {
  version: number
  savedAt: string
  records: MoodRecord[]
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

/** 老数据可能缺字段，能补的补上，补不出核心字段的才丢弃。 */
function coerceRecord(value: unknown): MoodRecord | null {
  if (typeof value !== 'object' || value === null) return null
  const raw = value as Partial<MoodRecord> & Record<string, unknown>

  if (!isString(raw.id) || raw.id.length === 0) return null
  if (!isString(raw.mood) || !(raw.mood in MOOD_MAP)) return null
  if (!isString(raw.createdAt)) return null

  const tags = Array.isArray(raw.tags)
    ? (raw.tags.filter((tag): tag is TagKey => isString(tag) && tag in TAG_MAP) as TagKey[])
    : []
  const keywords = Array.isArray(raw.keywords)
    ? raw.keywords.filter((word): word is string => isString(word))
    : []
  const planet =
    typeof raw.planet === 'object' && raw.planet !== null && isString((raw.planet as PlanetSuggestion).tint)
      ? (raw.planet as PlanetSuggestion)
      : null

  return {
    id: raw.id,
    mood: raw.mood as MoodKey,
    content: isString(raw.content) ? raw.content : '',
    tags,
    keywords,
    theme: isString(raw.theme) ? raw.theme : '',
    feedback: isString(raw.feedback) ? raw.feedback : '',
    suggestion: isString(raw.suggestion) ? raw.suggestion : '',
    planet,
    analyzed: raw.analyzed === true,
    createdAt: raw.createdAt,
    updatedAt: isString(raw.updatedAt) ? raw.updatedAt : raw.createdAt,
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
  if (!Array.isArray(candidate.records)) return null
  return {
    version: candidate.version,
    savedAt: isString(candidate.savedAt) ? candidate.savedAt : '',
    records: candidate.records as MoodRecord[],
  }
}

/** 解析失败时先把原文挪到备份 key，再返回空列表：不覆盖、也不让用户的数据凭空消失。 */
function backupCorrupt(text: string): string | null {
  const key = `${CORRUPT_KEY_PREFIX}${Date.now()}`
  try {
    window.localStorage.setItem(key, text)
    return key
  } catch {
    return null
  }
}

export const localRecordRepository: RecordRepository = {
  async load() {
    let text: string | null
    try {
      text = window.localStorage.getItem(RECORDS_KEY)
    } catch {
      return {
        records: [],
        error: '浏览器不允许访问本地存储，这次的记录只会留在当前页面里。',
      }
    }

    if (text === null || text === '') return { records: [], error: null }

    const envelope = parseEnvelope(text)
    if (!envelope) {
      const backup = backupCorrupt(text)
      return {
        records: [],
        error: backup
          ? `本地记录没能读出来，原文已备份到 ${backup}，现在从一份空列表开始。`
          : '本地记录没能读出来，也无法备份，现在从一份空列表开始。',
      }
    }

    /* 版本号高于当前实现时按同样的宽松规则解析：字段能认的就认，认不出的走默认值 */
    const records: MoodRecord[] = []
    let dropped = 0
    for (const item of envelope.records) {
      const record = coerceRecord(item)
      if (record) records.push(record)
      else dropped += 1
    }

    if (dropped > 0) {
      return {
        records,
        error: `有 ${dropped} 条记录的格式无法识别，已经跳过；其余 ${records.length} 条正常读出。`,
      }
    }

    return { records, error: null }
  },

  async save(records) {
    const envelope: Envelope = {
      version: SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
      records,
    }
    try {
      window.localStorage.setItem(RECORDS_KEY, JSON.stringify(envelope))
      return true
    } catch {
      return false
    }
  },
}
