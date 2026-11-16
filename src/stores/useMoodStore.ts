import { create } from 'zustand'

import { analyzeMood, neutralAnalysis } from '@/services/moodAnalysis'
import { localRecordRepository } from '@/services/recordRepository'
import { sound } from '@/features/sound/soundManager'
import type { SoundName } from '@/features/sound/lib/synth'
import { usePlanetStore } from '@/stores/usePlanetStore'
import type { MoodKey, MoodRecord, TagKey } from '@/types/mood'
import { createId } from '@/utils/id'

export interface RecordDraft {
  mood: MoodKey
  content: string
  tags: TagKey[]
  /** false 表示用户选择「只保存」，跳过本地解读 */
  analyzed: boolean
}

export type MoodStoreStatus = 'idle' | 'loading' | 'ready'

interface MoodState {
  /** 按创建顺序（旧 → 新）排列 */
  records: MoodRecord[]
  status: MoodStoreStatus
  loadError: string | null
  saveError: string | null
  hydrate: () => Promise<void>
  createRecord: (draft: RecordDraft) => MoodRecord
  updateRecord: (id: string, draft: RecordDraft) => MoodRecord | null
  deleteRecord: (id: string) => void
  dismissErrors: () => void
  /** 设置页「清空全部数据」用：内存复位，落盘由调用方删 key 完成 */
  resetAll: () => void
}

function buildRecord(
  id: string,
  draft: RecordDraft,
  createdAt: string,
  updatedAt: string,
): MoodRecord {
  const input = { mood: draft.mood, content: draft.content, tags: draft.tags }
  const analysis = draft.analyzed ? analyzeMood(input) : neutralAnalysis(input)
  return {
    id,
    mood: draft.mood,
    content: draft.content,
    tags: draft.tags,
    keywords: analysis.keywords,
    theme: analysis.theme,
    feedback: analysis.feedback,
    suggestion: analysis.suggestion,
    planet: analysis.planet,
    analyzed: draft.analyzed,
    createdAt,
    updatedAt,
  }
}

const SAVE_ERROR = '写入本地存储失败了，记录还在页面上，但刷新后可能会丢失。'

export const useMoodStore = create<MoodState>()((set, get) => {
  /** 界面先拿到新状态，落盘在后台进行；失败时只补一条提示，不回滚。
      cue 只在落盘成功后响：失败绝不播成功音。 */
  const commit = (records: MoodRecord[], cue?: SoundName) => {
    set({ records })
    void localRecordRepository.save(records).then((ok) => {
      set({ saveError: ok ? null : SAVE_ERROR })
      if (ok && cue) sound.play(cue)
    })
  }

  return {
    records: [],
    status: 'idle',
    loadError: null,
    saveError: null,

    hydrate: async () => {
      if (get().status !== 'idle') return
      set({ status: 'loading' })
      const { records, error } = await localRecordRepository.load()
      set({ records, status: 'ready', loadError: error })
      /* 星球状态必须在记录就位之后再读：记忆星是照着记录重建的 */
      await usePlanetStore.getState().hydrate(records)
    },

    createRecord: (draft) => {
      const now = new Date().toISOString()
      const record = buildRecord(createId('rec'), draft, now, now)
      const next = [...get().records, record]
      commit(next, 'success')
      usePlanetStore.getState().recordCreated(record, next)
      return record
    },

    updateRecord: (id, draft) => {
      const existing = get().records.find((item) => item.id === id)
      if (!existing) return null
      const next = buildRecord(id, draft, existing.createdAt, new Date().toISOString())
      const nextRecords = get().records.map((item) => (item.id === id ? next : item))
      commit(nextRecords, 'success')
      usePlanetStore.getState().recordUpdated(next, nextRecords)
      return next
    },

    deleteRecord: (id) => {
      const remaining = get().records.filter((item) => item.id !== id)
      commit(remaining)
      usePlanetStore.getState().recordDeleted(id, remaining)
    },

    dismissErrors: () => set({ loadError: null, saveError: null }),

    resetAll: () => set({ records: [], status: 'ready', loadError: null, saveError: null }),
  }
})
