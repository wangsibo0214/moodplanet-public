import { create } from 'zustand'

import { capsuleStatus } from '@/features/capsule/capsuleTime'
import { localCapsuleRepository } from '@/services/capsuleRepository'
import type { TimeCapsule } from '@/types/capsule'
import { createId } from '@/utils/id'

export interface CapsuleDraft {
  title: string
  content: string
  /** ISO 时间戳，由表单按快捷档位算出 */
  unlockAt: string
}

export type CapsuleStoreStatus = 'idle' | 'loading' | 'ready'

interface CapsuleState {
  capsules: TimeCapsule[]
  status: CapsuleStoreStatus
  loadError: string | null
  saveError: string | null
  hydrate: () => Promise<void>
  createCapsule: (draft: CapsuleDraft) => TimeCapsule
  /** 只有到期（ready）的胶囊能开启；封存中调用返回 false */
  openCapsule: (id: string) => boolean
  deleteCapsule: (id: string) => void
  dismissErrors: () => void
  /** 设置页「清空全部数据」用：内存复位，落盘由调用方删 key 完成 */
  resetAll: () => void
}

const SAVE_ERROR = '写入本地存储失败了，胶囊还在页面上，但刷新后可能会丢失。'

/** 存下来的 status 可能过期，时钟不会：每次进出 store 都重算一遍。 */
function refresh(capsules: TimeCapsule[], now: Date): TimeCapsule[] {
  return capsules.map((capsule) => ({ ...capsule, status: capsuleStatus(capsule, now) }))
}

export const useCapsuleStore = create<CapsuleState>()((set, get) => {
  /** 界面先拿到新状态，落盘在后台进行；失败时只补一条提示，不回滚。 */
  const commit = (capsules: TimeCapsule[]) => {
    set({ capsules })
    void localCapsuleRepository.save(capsules).then((ok) => {
      set({ saveError: ok ? null : SAVE_ERROR })
    })
  }

  return {
    capsules: [],
    status: 'idle',
    loadError: null,
    saveError: null,

    hydrate: async () => {
      if (get().status !== 'idle') return
      set({ status: 'loading' })
      const { capsules, error } = await localCapsuleRepository.load()
      set({ capsules: refresh(capsules, new Date()), status: 'ready', loadError: error })
    },

    createCapsule: (draft) => {
      const now = new Date()
      const capsule: TimeCapsule = {
        id: createId('cap'),
        title: draft.title.trim().length > 0 ? draft.title.trim() : '未命名的胶囊',
        content: draft.content,
        createdAt: now.toISOString(),
        unlockAt: draft.unlockAt,
        status: 'sealed',
        openedAt: null,
      }
      commit([...get().capsules, refresh([capsule], now)[0]])
      return capsule
    },

    openCapsule: (id) => {
      const now = new Date()
      const target = get().capsules.find((item) => item.id === id)
      if (!target || capsuleStatus(target, now) !== 'ready') return false
      const opened: TimeCapsule = { ...target, openedAt: now.toISOString(), status: 'opened' }
      commit(get().capsules.map((item) => (item.id === id ? opened : item)))
      return true
    },

    deleteCapsule: (id) => {
      commit(get().capsules.filter((item) => item.id !== id))
    },

    dismissErrors: () => set({ loadError: null, saveError: null }),

    resetAll: () => set({ capsules: [], status: 'ready', loadError: null, saveError: null }),
  }
})
