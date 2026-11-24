import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const resets = vi.hoisted(() => ({
  mood: vi.fn(),
  planet: vi.fn(),
  capsule: vi.fn(),
  settings: vi.fn(),
}))

vi.mock('@/stores/useMoodStore', () => ({
  useMoodStore: { getState: () => ({ resetAll: resets.mood }) },
}))
vi.mock('@/stores/usePlanetStore', () => ({
  usePlanetStore: { getState: () => ({ resetAll: resets.planet }) },
}))
vi.mock('@/stores/useCapsuleStore', () => ({
  useCapsuleStore: { getState: () => ({ resetAll: resets.capsule }) },
}))
vi.mock('@/stores/useSettingsStore', () => ({
  useSettingsStore: { getState: () => ({ resetAll: resets.settings }) },
}))

import { buildExportPayload, clearAllData } from './dataTransfer'

class MemoryStorage {
  private values = new Map<string, string>()

  get length() {
    return this.values.size
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null
  }

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }

  removeItem(key: string) {
    this.values.delete(key)
  }

  keys() {
    return [...this.values.keys()]
  }
}

let storage: MemoryStorage

beforeEach(() => {
  vi.clearAllMocks()
  storage = new MemoryStorage()
  vi.stubGlobal('window', { localStorage: storage })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('buildExportPayload', () => {
  it('正常导出保留原来四键，corrupt 为空对象', () => {
    storage.setItem('moodplanet:records', '{"version":1,"records":[]}')
    storage.setItem('moodplanet:planet', '{"version":1,"stars":[]}')
    storage.setItem('moodplanet:capsules', '{"version":1,"capsules":[]}')
    storage.setItem('moodplanet:settings', '{"state":{"soundVolume":0.6},"version":0}')

    const payload = buildExportPayload()

    expect(payload.data).toEqual({
      records: { version: 1, records: [] },
      planet: { version: 1, stars: [] },
      capsules: { version: 1, capsules: [] },
      settings: { state: { soundVolume: 0.6 }, version: 0 },
    })
    expect(payload.corrupt).toEqual({})
  })

  it('损坏备份按完整键名与原文带出，不解析、不漏掉、不误收其他键', () => {
    const broken = '{"version":1,"records":['
    const parseable = '{"oops":true}'
    storage.setItem('moodplanet:records:corrupt-1', broken)
    storage.setItem('moodplanet:capsules:corrupt-2', parseable)
    storage.setItem('moodplanet:records:backup-3', 'ignore')
    storage.setItem('other:records:corrupt-4', 'ignore')

    const payload = buildExportPayload()

    expect(payload.corrupt).toEqual({
      'moodplanet:records:corrupt-1': broken,
      'moodplanet:capsules:corrupt-2': parseable,
    })
  })

  it('localStorage 枚举失败时不抛错，正常四键仍可导出', () => {
    vi.stubGlobal('window', {
      localStorage: {
        length: 1,
        key: () => {
          throw new Error('blocked')
        },
        getItem: () => null,
      },
    })

    expect(() => buildExportPayload()).not.toThrow()
    expect(buildExportPayload().corrupt).toEqual({})
  })
})

describe('clearAllData', () => {
  it('仍清掉正常键与 corrupt 备份，并复位四个 store', () => {
    storage.setItem('moodplanet:records', '{}')
    storage.setItem('moodplanet:records:corrupt-1', 'broken')
    storage.setItem('other:key', 'keep')

    clearAllData()

    expect(storage.keys()).toEqual(['other:key'])
    expect(resets.mood).toHaveBeenCalledTimes(1)
    expect(resets.planet).toHaveBeenCalledTimes(1)
    expect(resets.capsule).toHaveBeenCalledTimes(1)
    expect(resets.settings).toHaveBeenCalledTimes(1)
  })
})
