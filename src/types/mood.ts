/** 情绪基调：开心、平静、疲惫、焦虑、难过、兴奋。 */
export type MoodKey = 'joy' | 'calm' | 'tired' | 'anxious' | 'sad' | 'excited'

/** 记录标签：学习、生活、社交、工作、休息、运动。 */
export type TagKey = 'study' | 'life' | 'social' | 'work' | 'rest' | 'exercise'

/** 星球视觉建议：规则分析给出的、3D 场景可以直接消费的少量参数。 */
export interface PlanetSuggestion {
  /** 主色调，取自情绪色板 */
  tint: string
  /** 光晕强度 0–1 */
  glow: number
  /** 一句话说明，用于结果卡上的「星球变化预览」 */
  note: string
}

/** 本地规则分析的产物。用户跳过分析时，这一份不存在。 */
export interface MoodAnalysis {
  theme: string
  keywords: string[]
  feedback: string
  suggestion: string
  planet: PlanetSuggestion
}

/** 一条情绪记录。 */
export interface MoodRecord {
  id: string
  mood: MoodKey
  content: string
  tags: TagKey[]
  /** 分析关键词；跳过分析时为空数组 */
  keywords: string[]
  /** 情绪主题；跳过分析时为空字符串 */
  theme: string
  feedback: string
  suggestion: string
  /** 星球视觉建议；跳过分析时为 null */
  planet: PlanetSuggestion | null
  /** 是否跑过本地规则分析 */
  analyzed: boolean
  /** ISO 8601 */
  createdAt: string
  /** ISO 8601 */
  updatedAt: string
}

/** 记忆星在轨道上的固定摆放。创建时算好并存盘，刷新后位置不漂移。 */
export interface StarOrbit {
  /** 到星球球心的距离 */
  radius: number
  /** 轨道初始相位（弧度） */
  phase: number
  /** 轨道面倾角，让星群散在三维空间里而不是挤在一个圆上 */
  tiltX: number
  tiltZ: number
}

/**
 * 一颗记忆星：由某条心情记录点亮。
 * 星与记录一一对应，recordId 是它存在的全部意义——没有关联记录的星不该出现。
 */
export interface MemoryStar {
  id: string
  /** 关联的 MoodRecord.id */
  recordId: string
  mood: MoodKey
  orbit: StarOrbit
  /** 记录当时的摘要，供列表展示；详情始终回查记录本体 */
  title: string
  /** ISO 8601，星被点亮的时刻，等于记录的 createdAt */
  createdAt: string
  /** 视觉大小百分比（50–150，默认 100）；等级由它实时算出，不另存 */
  size: number
}

/** 星球当前的环境状态：由最近一个有记录的日子综合得出（最多的心情胜出，并列取较晚），存盘以便刷新后保持。 */
export interface PlanetEnvironment {
  /** 主导情绪，null 表示还没有记录，星球保持默认的安静夜空 */
  mood: MoodKey | null
  /** 这份环境对应哪条记录；该记录被删掉后回落到次新的一条 */
  recordId: string | null
  /** ISO 8601 */
  updatedAt: string
}

/** 星球的长期成长量。全部只增不减，删记录或情绪低落都不会让星球退化。 */
export interface PlanetGrowth {
  /** 累计成功保存次数 */
  totalSaved: number
  /** 累计主动互动次数（点伙伴、点记忆星） */
  interactions: number
  /** 已解锁的植物 / 装饰 / 伙伴动作 id */
  unlocks: string[]
}

/**
 * 伙伴能播放的动作。
 * hop 是对点击的直接回应，永远可能；twirl / wave / glowPulse / roll 各由一个解锁项放行，
 * 只会出现在点击的随机池里；sit / sleep / dance / heart 由环绕动作菜单显式触发，不进随机池。
 */
export type CompanionActionKind =
  | 'hop'
  | 'twirl'
  | 'wave'
  | 'glowPulse'
  | 'roll'
  | 'sit'
  | 'sleep'
  | 'dance'
  | 'heart'

/** 一次伙伴动作：seq 变化即重放，即便连续两次抽到同一种动作 */
export interface CompanionAction {
  kind: CompanionActionKind
  seq: number
}
