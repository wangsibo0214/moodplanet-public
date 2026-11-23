import type { MoodKey, TagKey } from '@/types/mood'

export interface MoodMeta {
  key: MoodKey
  label: string
  /** 选择器上的一句提示 */
  hint: string
  /** 原始色值，供后续 Canvas / three.js 直接使用 */
  hex: string
  accentClass: string
  surfaceClass: string
  ringClass: string
}

/**
 * 情绪色板：六种情绪共用同一档明度，
 * 这样「难过」不会看起来像错误提示，「开心」也不会刺眼。
 * 唯一要照顾的是「疲惫」：它原本与「焦虑」同属蓝紫，靠色相分不开。
 * 区分只能换色相，不能靠调灰——堆叠色带里一段低彩度的颜色看起来像缺陷，不像另一种心情。
 */
export const MOODS: MoodMeta[] = [
  {
    key: 'joy',
    label: '开心',
    hint: '想笑、有点雀跃',
    hex: '#FFD170',
    accentClass: 'text-butter-400',
    surfaceClass: 'bg-butter-400/12',
    ringClass: 'ring-butter-400/30',
  },
  {
    key: 'calm',
    label: '平静',
    hint: '安稳、松弛',
    hex: '#7BD9BC',
    accentClass: 'text-mint-400',
    surfaceClass: 'bg-mint-400/12',
    ringClass: 'ring-mint-400/30',
  },
  {
    key: 'tired',
    label: '疲惫',
    hint: '电量不太够',
    hex: '#FFA57F',
    accentClass: 'text-clay-300',
    surfaceClass: 'bg-clay-300/12',
    ringClass: 'ring-clay-300/30',
  },
  {
    key: 'anxious',
    label: '焦虑',
    hint: '思绪有点满',
    hex: '#A48FF2',
    accentClass: 'text-iris-400',
    surfaceClass: 'bg-iris-400/12',
    ringClass: 'ring-iris-400/30',
  },
  {
    key: 'sad',
    label: '难过',
    hint: '心里有点沉',
    hex: '#6FB6F0',
    accentClass: 'text-astro-400',
    surfaceClass: 'bg-astro-400/12',
    ringClass: 'ring-astro-400/30',
  },
  {
    key: 'excited',
    label: '兴奋',
    hint: '有点想跳起来',
    hex: '#FFA3BE',
    accentClass: 'text-blush-400',
    surfaceClass: 'bg-blush-400/12',
    ringClass: 'ring-blush-400/30',
  },
]

export const MOOD_MAP = Object.fromEntries(MOODS.map((m) => [m.key, m])) as Record<
  MoodKey,
  MoodMeta
>

export interface TagMeta {
  key: TagKey
  label: string
  /** 文字太短、理解不充分时，用它兜一句温和的关怀 */
  careLine: string
}

export const TAGS: TagMeta[] = [
  { key: 'study', label: '学习', careLine: '学习之余留一点空白，大脑也需要喘口气。' },
  { key: 'life', label: '生活', careLine: '生活里的琐碎也在消耗心力，记得给自己留点位置。' },
  { key: 'social', label: '社交', careLine: '和人相处之后，独处一会儿也是在照顾自己。' },
  { key: 'work', label: '工作', careLine: '工作可以拆成几段完成，不必一次扛完所有事。' },
  { key: 'rest', label: '休息', careLine: '休息本身就是有用的事，不需要额外的理由。' },
  { key: 'exercise', label: '运动', careLine: '身体动起来之后，也记得补水和拉伸。' },
]

export const TAG_MAP = Object.fromEntries(TAGS.map((t) => [t.key, t])) as Record<TagKey, TagMeta>
