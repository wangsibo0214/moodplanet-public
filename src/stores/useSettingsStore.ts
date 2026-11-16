import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { appStorage } from '@/services/storage'

export type StarDensity = 'low' | 'normal' | 'high'

interface SettingsState {
  /** 用户主动降低动效，叠加系统的 prefers-reduced-motion */
  reduceMotion: boolean
  meteorShower: boolean
  starDensity: StarDensity
  navCollapsed: boolean
  /** 全局交互音效开关；关闭时正在播放的声音也立即停止 */
  soundEnabled: boolean
  /** 0–1，默认适中；拖动实时生效 */
  soundVolume: number
  setReduceMotion: (value: boolean) => void
  setMeteorShower: (value: boolean) => void
  setStarDensity: (value: StarDensity) => void
  toggleNav: () => void
  setSoundEnabled: (value: boolean) => void
  setSoundVolume: (value: number) => void
  /** 设置页「清空全部数据」用：偏好回到默认值 */
  resetAll: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      reduceMotion: false,
      meteorShower: false,
      starDensity: 'normal',
      navCollapsed: false,
      soundEnabled: true,
      soundVolume: 0.6,
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
      setMeteorShower: (meteorShower) => set({ meteorShower }),
      setStarDensity: (starDensity) => set({ starDensity }),
      toggleNav: () => set((state) => ({ navCollapsed: !state.navCollapsed })),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setSoundVolume: (soundVolume) => set({ soundVolume: Math.min(1, Math.max(0, soundVolume)) }),
      resetAll: () =>
        set({
          reduceMotion: false,
          meteorShower: false,
          starDensity: 'normal',
          navCollapsed: false,
          soundEnabled: true,
          soundVolume: 0.6,
        }),
    }),
    {
      name: 'settings',
      storage: createJSONStorage(() => appStorage),
    },
  ),
)
