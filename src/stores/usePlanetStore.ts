import { create } from 'zustand'

import { MOOD_MAP } from '@/features/mood/mood.config'
import { synthesizeLatestDay } from '@/features/planet/dayMood'
import { actionPool, evaluateUnlocks } from '@/features/planet/growth.config'
import { STAR_SIZE_DEFAULT, clampStarSize } from '@/features/planet/lib/starSize'
import { scatterOrbit } from '@/features/planet/lib/starLayout'
import {
  DEFAULT_ENVIRONMENT,
  DEFAULT_GROWTH,
  EMPTY_SNAPSHOT,
  localPlanetRepository,
} from '@/services/planetRepository'
import type {
  CompanionAction,
  CompanionActionKind,
  MemoryStar,
  MoodRecord,
  PlanetEnvironment,
  PlanetGrowth,
  StarOrbit,
} from '@/types/mood'
import { createId, hashSeed } from '@/utils/id'

const COMPANION_LINES = [
  '今天也辛苦啦，先坐下来歇一会儿。',
  '你已经做得很好了，真的。',
  '要不要把此刻的心情记一笔？',
  '我在这颗星球上等你很久了。',
  '深呼吸——吸……呼……有没有松一点？',
  '难过的时候，也可以只是难过一下下。',
  '今天的云是奶油味的。',
  '记得喝水，也记得抬头看看星星。',
  '慢慢来，星球不赶时间。',
] as const

export type PlanetStatus = 'idle' | 'loading' | 'ready'

interface PlanetState {
  /* ---------- 持久化的生态状态 ---------- */
  /** 与记录一一对应的记忆星，顺序同记录（旧 → 新） */
  stars: MemoryStar[]
  growth: PlanetGrowth
  environment: PlanetEnvironment
  status: PlanetStatus
  loadError: string | null
  saveError: string | null

  /* ---------- 只活在当前会话的界面状态 ---------- */
  /** 当前打开的记忆星对应哪条记录，null 表示面板隐藏 */
  selectedRecordId: string | null
  /** 当前打开大小调整面板的记忆星 id，null 表示面板隐藏 */
  sizedStarId: string | null
  companionLine: string | null
  companionAction: CompanionAction | null
  /** 伙伴环绕动作菜单是否展开（右键 / 长按伙伴打开） */
  companionMenuOpen: boolean

  hydrate: (records: readonly MoodRecord[]) => Promise<void>
  openStar: (recordId: string | null) => void
  /** 打开某颗星的大小调整面板；传 null 关闭。与详情面板、伙伴菜单互斥 */
  openStarSize: (starId: string | null) => void
  /** 只改这一颗星的大小并落盘，其余星与原始记录都不动 */
  setStarSize: (starId: string, size: number) => void
  pokeCompanion: () => void
  dismissCompanion: () => void
  dismissErrors: () => void
  openCompanionMenu: () => void
  closeCompanionMenu: () => void
  /** 菜单里选定一个动作：播放它并顺手收起菜单 */
  performCompanionAction: (kind: CompanionActionKind) => void

  /* ---------- 由 useMoodStore 在记录生命周期里调用 ---------- */
  recordCreated: (record: MoodRecord, records: readonly MoodRecord[]) => void
  recordUpdated: (record: MoodRecord, records: readonly MoodRecord[]) => void
  recordDeleted: (recordId: string, remaining: readonly MoodRecord[]) => void
  /** 设置页「清空全部数据」用：内存复位，落盘由调用方删 key 完成 */
  resetAll: () => void
}

type CommitPatch = Partial<
  Pick<
    PlanetState,
    | 'stars'
    | 'growth'
    | 'environment'
    | 'selectedRecordId'
    | 'sizedStarId'
    | 'companionLine'
    | 'companionAction'
    | 'companionMenuOpen'
  >
>

/**
 * 由记录 id 推出一个固定的散点位。
 * 用哈希而不是数组下标，是因为下标会随删除而变化，星就会在刷新后跳到别处。
 */
function orbitFor(recordId: string): StarOrbit {
  return scatterOrbit(hashSeed(recordId))
}

/** 星上显示的一行摘要：优先取正文开头，其次取解读主题，都没有就用情绪名兜底。 */
function starTitle(record: MoodRecord): string {
  const text = record.content.trim()
  if (text.length > 0) return text.length > 30 ? `${text.slice(0, 30)}…` : text
  if (record.theme.length > 0) return record.theme
  return `${MOOD_MAP[record.mood].label}的一天`
}

function makeStar(record: MoodRecord): MemoryStar {
  return {
    id: createId('star'),
    recordId: record.id,
    mood: record.mood,
    orbit: orbitFor(record.id),
    title: starTitle(record),
    createdAt: record.createdAt,
    size: STAR_SIZE_DEFAULT,
  }
}

/**
 * 环境状态取「最近一个有记录的日子」的综合结果：
 * 当天哪种心情最多就是哪种，并列时听较晚那条的；一条都没有才是默认夜空。
 */
function environmentFrom(
  records: readonly MoodRecord[],
  updatedAt: string,
): PlanetEnvironment {
  const day = synthesizeLatestDay(records)
  if (!day) return { ...DEFAULT_ENVIRONMENT, updatedAt }
  return { mood: day.mood, recordId: day.latestRecordId, updatedAt }
}

const SAVE_ERROR = '星球状态没能写进本地存储，这次的解锁和记忆星刷新后可能会回到上一个状态。'

export const usePlanetStore = create<PlanetState>()((set, get) => {
  /** 界面先拿到新状态，落盘在后台进行；失败只补一句提示，不回滚。 */
  const commit = (patch: CommitPatch) => {
    set(patch)
    const { stars, growth, environment } = get()
    void localPlanetRepository.save({ stars, growth, environment }).then((ok) => {
      set({ saveError: ok ? null : SAVE_ERROR })
    })
  }

  /** 加一次互动计数并重算解锁。解锁只增不减。 */
  const withInteraction = (growth: PlanetGrowth): PlanetGrowth => {
    const next: PlanetGrowth = { ...growth, interactions: growth.interactions + 1 }
    next.unlocks = evaluateUnlocks(next)
    return next
  }

  const pickAction = (unlocks: readonly string[], seq: number): CompanionAction => {
    /* 动作池由解锁项决定：转个圈、挥挥手在拿到之前不会出现，拿到之前只会跳一下 */
    const kinds = actionPool(unlocks)
    return { kind: kinds[Math.floor(Math.random() * kinds.length)], seq }
  }

  return {
    stars: [],
    growth: EMPTY_SNAPSHOT.growth,
    environment: EMPTY_SNAPSHOT.environment,
    status: 'idle',
    loadError: null,
    saveError: null,

    selectedRecordId: null,
    sizedStarId: null,
    companionLine: null,
    companionAction: null,
    companionMenuOpen: false,

    hydrate: async (records) => {
      if (get().status !== 'idle') return
      set({ status: 'loading' })
      const { data, error } = await localPlanetRepository.load()

      /* 记忆星始终按记录重建：星的 id 与大小复用存值，指向已删记录的自动消失。
         轨道位一律按记录哈希重算：旧版窄球带排布会围成星环，存过的旧轨道位不再复用。 */
      const stored = new Map(data.stars.map((star) => [star.recordId, star]))
      const stars = records.map((record) => {
        const prev = stored.get(record.id)
        return prev ? { ...prev, orbit: orbitFor(record.id) } : makeStar(record)
      })
      const orphaned = data.stars.length - stars.filter((star) => stored.has(star.recordId)).length

      /* 迁移期计数兜底：老数据里 totalSaved 可能落后于实际记录数，只往上抬不往下压 */
      const growth: PlanetGrowth = {
        ...data.growth,
        totalSaved: Math.max(data.growth.totalSaved, stars.length),
      }
      growth.unlocks = evaluateUnlocks(growth)

      const environment = environmentFrom(
        records,
        data.environment.updatedAt || new Date().toISOString(),
      )

      set({
        stars,
        growth,
        environment,
        status: 'ready',
        loadError:
          error ??
          (orphaned > 0
            ? `有 ${orphaned} 颗记忆星指向已经不存在的记录，已经清理掉。`
            : null),
      })

      /* 重建结果立刻落盘：星 id、轨道位和互动计数不能每次刷新都重新生成一遍 */
      void localPlanetRepository.save({ stars, growth, environment }).then((ok) => {
        set({ saveError: ok ? null : SAVE_ERROR })
      })
    },

    openStar: (recordId) => {
      if (recordId === null) {
        set({ selectedRecordId: null })
        return
      }
      /* 打开一颗星也算一次主动互动，成长不止来自写记录 */
      commit({
        selectedRecordId: recordId,
        sizedStarId: null,
        companionMenuOpen: false,
        growth: withInteraction(get().growth),
      })
    },

    openStarSize: (starId) => {
      if (starId === null) {
        set({ sizedStarId: null })
        return
      }
      /* 三个浮动面板互斥：开大小面板就收起详情与伙伴菜单 */
      set({ sizedStarId: starId, selectedRecordId: null, companionMenuOpen: false })
    },

    setStarSize: (starId, size) => {
      const next = clampStarSize(size)
      const stars = get().stars
      const target = stars.find((star) => star.id === starId)
      if (!target || target.size === next) return
      commit({ stars: stars.map((star) => (star.id === starId ? { ...star, size: next } : star)) })
    },

    pokeCompanion: () => {
      const state = get()
      const growth = withInteraction(state.growth)
      let next = COMPANION_LINES[Math.floor(Math.random() * COMPANION_LINES.length)]
      /* 连续点击时避免反复刷到同一句 */
      if (next === state.companionLine) {
        next = COMPANION_LINES[(COMPANION_LINES.indexOf(next) + 1) % COMPANION_LINES.length]
      }
      commit({
        companionLine: next,
        growth,
        companionAction: pickAction(growth.unlocks, (state.companionAction?.seq ?? 0) + 1),
      })
    },

    dismissCompanion: () => set({ companionLine: null }),
    dismissErrors: () => set({ loadError: null, saveError: null }),

    /* 重复右键只维持打开，不重播展开动画；关闭走同一个 set，天然幂等 */
    openCompanionMenu: () => {
      if (!get().companionMenuOpen)
        set({ companionMenuOpen: true, selectedRecordId: null, sizedStarId: null })
    },
    closeCompanionMenu: () => {
      if (get().companionMenuOpen) set({ companionMenuOpen: false })
    },

    performCompanionAction: (kind) => {
      const state = get()
      /* 菜单里点一个动作和戳一下同价：都算一次主动互动，解锁进度照常走 */
      const growth = withInteraction(state.growth)
      set({ companionMenuOpen: false })
      commit({
        growth,
        companionAction: { kind, seq: (state.companionAction?.seq ?? 0) + 1 },
      })
    },

    recordCreated: (record, records) => {
      const state = get()
      const growth: PlanetGrowth = {
        ...state.growth,
        totalSaved: state.growth.totalSaved + 1,
      }
      growth.unlocks = evaluateUnlocks(growth)
      commit({
        stars: [...state.stars.filter((star) => star.recordId !== record.id), makeStar(record)],
        growth,
        environment: environmentFrom(records, new Date().toISOString()),
      })
    },

    recordUpdated: (record, records) => {
      const state = get()
      const existing = state.stars.some((star) => star.recordId === record.id)
      /* 编辑不该凭空多出一颗星：有就更新摘要与颜色，没有（迁移期才可能）才补 */
      const stars = existing
        ? state.stars.map((star) =>
            star.recordId === record.id
              ? { ...star, mood: record.mood, title: starTitle(record) }
              : star,
          )
        : [...state.stars, makeStar(record)]
      const environment = environmentFrom(records, new Date().toISOString())
      const envChanged =
        environment.mood !== state.environment.mood ||
        environment.recordId !== state.environment.recordId
      commit({ stars, ...(envChanged ? { environment } : {}) })
    },

    recordDeleted: (recordId, remaining) => {
      const state = get()
      const removed = state.stars.find((star) => star.recordId === recordId)
      const environment = environmentFrom(remaining, new Date().toISOString())
      const envChanged =
        environment.mood !== state.environment.mood ||
        environment.recordId !== state.environment.recordId
      /* growth 一律不动——删记录不能让星球退化 */
      commit({
        stars: state.stars.filter((star) => star.recordId !== recordId),
        ...(envChanged ? { environment } : {}),
        selectedRecordId:
          state.selectedRecordId === recordId ? null : state.selectedRecordId,
        sizedStarId: state.sizedStarId === removed?.id ? null : state.sizedStarId,
      })
    },

    resetAll: () =>
      set({
        stars: [],
        growth: { ...DEFAULT_GROWTH, unlocks: [] },
        environment: { ...DEFAULT_ENVIRONMENT },
        status: 'ready',
        loadError: null,
        saveError: null,
        selectedRecordId: null,
        sizedStarId: null,
        companionLine: null,
        companionAction: null,
        companionMenuOpen: false,
      }),
  }
})
