import type { MoodKey } from '@/types/mood'

export interface MoodSceneMeta {
  /** 一句话概括星球变成了什么样子，用于 HUD 与结果卡 */
  label: string
  /** 逐项列出真实生效的场景变化，用于「星球状态」说明 */
  effects: readonly string[]
}

/**
 * 六种心情对应的场景变化说明。
 * 单独放在 features/planet 下且不引入 three，
 * 这样非 3D 的界面也能引用，不会把 three 拖进主 chunk。
 */
export const MOOD_SCENE: Record<MoodKey, MoodSceneMeta> = {
  joy: {
    label: '星球被暖光罩住，花开得更满',
    effects: ['环境光转为奶油暖色', '花朵逐渐开放', '远处星星更亮'],
  },
  calm: {
    label: '蓝紫色的天空，水面很平',
    effects: ['天空转为蓝紫', '水面变得平滑', '只留一丝柔和微风'],
  },
  tired: {
    label: '夜色柔下来，伙伴先休息了',
    effects: ['整体亮度压柔', '伙伴闭眼进入休息状态', '留一盏舒缓的暖光'],
  },
  anxious: {
    label: '云层慢慢走过，光在轻轻呼吸',
    effects: ['出现缓慢移动的云层', '光线柔和地明暗起伏', '降低对比避免刺眼'],
  },
  sad: {
    label: '雨停了，叶子上还挂着水珠',
    effects: ['雨后湿润的地表', '植物上出现水珠', '温暖微光逐渐浮现'],
  },
  excited: {
    label: '星光在闪，花叶也热闹起来',
    effects: ['星光柔和闪烁', '植物摆动更活跃', '花朵张开、光晕更亮'],
  },
}

/** 还没有任何记录时的星球说明。 */
export const IDLE_SCENE_META = {
  label: '一片安静的夜空，等第一条心情落下来',
  effects: ['默认的蓝紫夜色', '轻微的微风与自转'],
} as const satisfies MoodSceneMeta
