import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

class MemoryStorage {
  private values = new Map<string, string>()

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }
}

let storage: MemoryStorage

beforeEach(() => {
  vi.resetModules()
  storage = new MemoryStorage()
  vi.stubGlobal('window', { localStorage: storage })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

async function loadStore() {
  return (await import('./useSettingsStore')).useSettingsStore
}

function readPersisted() {
  const raw = storage.getItem('moodplanet:settings')
  expect(raw).not.toBeNull()
  return JSON.parse(raw!)
}

describe('settings persistence', () => {
  it('实际写入只包含五个数据字段，不写入 store 方法', async () => {
    const store = await loadStore()
    store.getState().setMeteorShower(true)
    store.getState().setStarDensity('high')
    store.getState().toggleNav()
    store.getState().setSoundEnabled(false)
    store.getState().setSoundVolume(0.75)

    expect(readPersisted()).toEqual({
      state: {
        meteorShower: true,
        starDensity: 'high',
        navCollapsed: true,
        soundEnabled: false,
        soundVolume: 0.75,
      },
      version: 0,
    })
  })

  it('历史未知字段在下次写设置时被白名单剔除，既有版本不变', async () => {
    storage.setItem(
      'moodplanet:settings',
      JSON.stringify({
        state: {
          meteorShower: true,
          starDensity: 'low',
          navCollapsed: true,
          soundEnabled: false,
          soundVolume: 0.4,
          reduceMotion: true,
          retiredSetting: 'legacy',
        },
        version: 0,
      }),
    )
    const store = await loadStore()
    store.getState().setSoundVolume(0.2)

    expect(readPersisted()).toEqual({
      state: {
        meteorShower: true,
        starDensity: 'low',
        navCollapsed: true,
        soundEnabled: false,
        soundVolume: 0.2,
      },
      version: 0,
    })
  })

  it('resetAll 也只落盘五个默认数据字段', async () => {
    const store = await loadStore()
    store.getState().setSoundVolume(1)
    store.getState().resetAll()

    expect(readPersisted()).toEqual({
      state: {
        meteorShower: false,
        starDensity: 'normal',
        navCollapsed: false,
        soundEnabled: true,
        soundVolume: 0.6,
      },
      version: 0,
    })
  })
})
