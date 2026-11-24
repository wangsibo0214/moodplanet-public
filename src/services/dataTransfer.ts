import { STORAGE_PREFIX } from '@/services/storage'
import { useCapsuleStore } from '@/stores/useCapsuleStore'
import { useMoodStore } from '@/stores/useMoodStore'
import { usePlanetStore } from '@/stores/usePlanetStore'
import { useSettingsStore } from '@/stores/useSettingsStore'

/**
 * 本机数据的导出与清除。
 * 导出只读 localStorage，不经过 store，保证拿到的就是落盘原文；损坏备份键也按原文带出。
 * 清除先复位内存里的四个 store，再删 key，避免复位动作又把空信封写回去。
 */

const EXPORT_KEYS = ['records', 'planet', 'capsules', 'settings'] as const
const CORRUPT_PREFIXES = ['records', 'planet', 'capsules'].map((key) => `${STORAGE_PREFIX}${key}:corrupt-`)

export type ExportKey = (typeof EXPORT_KEYS)[number]

export interface ExportPayload {
  app: 'moodplanet'
  schemaVersion: 1
  exportedAt: string
  data: Record<ExportKey, unknown>
  corrupt: Record<string, string>
}

function readKey(key: ExportKey): unknown {
  let raw: string | null
  try {
    raw = window.localStorage.getItem(STORAGE_PREFIX + key)
  } catch {
    return null
  }
  if (raw === null) return null
  try {
    return JSON.parse(raw)
  } catch {
    /* 备份的意义就是不丢原文：解析不了也原样带上 */
    return raw
  }
}

function readCorruptBackups(): Record<string, string> {
  const backups: Record<string, string> = {}
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (!key || !CORRUPT_PREFIXES.some((prefix) => key.startsWith(prefix))) continue
      const raw = window.localStorage.getItem(key)
      if (raw !== null) backups[key] = raw
    }
  } catch {
    /* 存储不可读时不阻断其余四键的导出 */
  }
  return backups
}

export function buildExportPayload(): ExportPayload {
  const data = {} as Record<ExportKey, unknown>
  for (const key of EXPORT_KEYS) data[key] = readKey(key)
  return {
    app: 'moodplanet',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    data,
    corrupt: readCorruptBackups(),
  }
}

export function exportFilename(now: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return (
    `moodplanet-backup-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}.json`
  )
}

/** 触发浏览器下载，返回文件名供界面反馈。 */
export function downloadExport(): string {
  const name = exportFilename(new Date())
  const blob = new Blob([JSON.stringify(buildExportPayload(), null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  return name
}

/** 清空全部本机数据：记录、记忆星、胶囊、偏好设置，以及损坏备份 key。 */
export function clearAllData(): void {
  useMoodStore.getState().resetAll()
  usePlanetStore.getState().resetAll()
  useCapsuleStore.getState().resetAll()
  useSettingsStore.getState().resetAll()

  const doomed: string[] = []
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)
    if (key && key.startsWith(STORAGE_PREFIX)) doomed.push(key)
  }
  for (const key of doomed) {
    try {
      window.localStorage.removeItem(key)
    } catch {
      /* 单个 key 删不掉不影响整体 */
    }
  }
}
