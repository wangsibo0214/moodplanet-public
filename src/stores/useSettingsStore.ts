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
  setReduceMotion: (value: boolean) => void
  setMeteorShower: (value: boolean) => void
  setStarDensity: (value: StarDensity) => void
  toggleNav: () => void
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
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
      setMeteorShower: (meteorShower) => set({ meteorShower }),
      setStarDensity: (starDensity) => set({ starDensity }),
      toggleNav: () => set((state) => ({ navCollapsed: !state.navCollapsed })),
      resetAll: () => set({ reduceMotion: false, meteorShower: false, starDensity: 'normal', navCollapsed: false }),
    }),
    {
      name: 'settings',
      storage: createJSONStorage(() => appStorage),
    },
  ),
)
