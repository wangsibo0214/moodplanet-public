import type { CompanionActionKind, PlanetGrowth } from '@/types/mood'

export type UnlockKind = 'plant' | 'decor' | 'action'

export interface UnlockDef {
  id: string
  kind: UnlockKind
  name: string
  /** 一句话说明解锁后星球上多了什么 */
  detail: string
  /** 达成门槛；只填一项即可，两项都填表示任一达成 */
  saved?: number
  interactions?: number
}

/**
 * 成长解锁表。
 * 门槛一律基于「累计」量而不是当前记录条数，
 * 这样删掉记录、或者连着几天情绪低落，都不会让已经长出来的东西消失。
 */
export const UNLOCKS: readonly UnlockDef[] = [
  {
    id: 'glow-flower',
    kind: 'plant',
    name: '星屑花',
    detail: '地表多出一丛会微微发光的小花。',
    saved: 1,
  },
  {
    id: 'lantern-ring',
    kind: 'decor',
    name: '暖光环带',
    detail: '星球外圈挂上一串缓缓转动的小灯。',
    saved: 3,
  },
  {
    id: 'companion-twirl',
    kind: 'action',
    name: '转个圈',
    detail: '点一下伙伴，它会开心地转一圈。',
    interactions: 5,
  },
  {
    id: 'crystal-cluster',
    kind: 'decor',
    name: '晶石簇',
    detail: '高地上长出几簇半透明的晶石。',
    saved: 6,
  },
  {
    id: 'fireflies',
    kind: 'decor',
    name: '萤光浮尘',
    detail: '星球周围浮起一层缓慢飘动的光点。',
    saved: 10,
  },
  {
    id: 'companion-wave',
    kind: 'action',
    name: '挥挥手',
    detail: '点一下伙伴，它会抬起手朝你挥一挥。',
    interactions: 12,
  },
  {
    id: 'companion-glow',
    kind: 'action',
    name: '星光充电',
    detail: '点一下伙伴，它会下蹲蓄力，把触角那盏灯点亮一下。',
    interactions: 20,
  },
  {
    id: 'companion-roll',
    kind: 'action',
    name: '打个滚',
    detail: '点一下伙伴，它会原地翻一个跟头，把肚皮亮给你。',
    interactions: 30,
  },
] as const

export const UNLOCK_MAP: Readonly<Record<string, UnlockDef>> = Object.fromEntries(
  UNLOCKS.map((item) => [item.id, item]),
)

function reached(def: UnlockDef, growth: PlanetGrowth): boolean {
  const bySaved = def.saved !== undefined && growth.totalSaved >= def.saved
  const byInteraction =
    def.interactions !== undefined && growth.interactions >= def.interactions
  return bySaved || byInteraction
}

/**
 * 算出此刻应当解锁的项目，并与已解锁列表取并集。
 * 并集是关键：计数只增不减，但万一存储被改小，也不会把用户已经拿到的东西收回去。
 */
export function evaluateUnlocks(growth: PlanetGrowth): string[] {
  const owned = new Set(growth.unlocks)
  for (const def of UNLOCKS) {
    if (reached(def, growth)) owned.add(def.id)
  }
  return UNLOCKS.filter((def) => owned.has(def.id)).map((def) => def.id)
}

/** 下一个还没拿到的解锁项，用来在界面上给一句「再走多远」的提示；kinds 可限定只看某几类。 */
export function nextUnlock(
  growth: PlanetGrowth,
  kinds?: readonly UnlockKind[],
): { def: UnlockDef; lack: string } | null {
  const owned = new Set(growth.unlocks)
  for (const def of UNLOCKS) {
    if (kinds && !kinds.includes(def.kind)) continue
    if (owned.has(def.id)) continue
    const needSaved = def.saved !== undefined ? Math.max(0, def.saved - growth.totalSaved) : null
    const needPoke =
      def.interactions !== undefined
        ? Math.max(0, def.interactions - growth.interactions)
        : null
    const parts: string[] = []
    if (needSaved !== null && needSaved > 0) parts.push(`再保存 ${needSaved} 条记录`)
    if (needPoke !== null && needPoke > 0) parts.push(`再和星球互动 ${needPoke} 次`)
    return { def, lack: parts.join('，或') }
  }
  return null
}

/**
 * 解锁 id → 点击伙伴时可能抽中的动作。
 * 顺序即池子里的顺序，hop 始终打头：没解锁任何动作时只会跳一下，与加挥手之前一致。
 */
const ACTION_BY_UNLOCK: readonly (readonly [string, CompanionActionKind])[] = [
  ['companion-twirl', 'twirl'],
  ['companion-wave', 'wave'],
  ['companion-glow', 'glowPulse'],
  ['companion-roll', 'roll'],
]

export function actionPool(unlocks: readonly string[]): CompanionActionKind[] {
  const kinds: CompanionActionKind[] = ['hop']
  for (const [id, kind] of ACTION_BY_UNLOCK) {
    if (unlocks.includes(id)) kinds.push(kind)
  }
  return kinds
}
