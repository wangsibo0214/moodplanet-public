import type { CompanionActionKind } from '@/types/mood'

import { UNLOCKS } from '../growth.config'

export interface ActionCatalogEntry {
  kind: CompanionActionKind
  name: string
  detail: string
  /** menu = 菜单里天生可用；poke = 戳伙伴彩蛋，按互动门槛解锁 */
  source: 'menu' | 'poke'
  unlockId?: string
}

const MENU_COPY: readonly (readonly [CompanionActionKind, string, string])[] = [
  ['hop', '跳跃', '菜单里点一下，它会原地蹦一下。'],
  ['sit', '坐下', '菜单里点一下，它会乖乖坐好。'],
  ['sleep', '睡觉', '菜单里点一下，它会打个盹。'],
  ['dance', '跳舞', '菜单里点一下，它会扭一段舞。'],
  ['heart', '比心', '菜单里点一下，它会给你比个心。'],
]

const POKE_KIND_BY_UNLOCK: Readonly<Record<string, CompanionActionKind>> = {
  'companion-twirl': 'twirl',
  'companion-wave': 'wave',
  'companion-glow': 'glowPulse',
  'companion-roll': 'roll',
}

/** 伙伴动作目录：自由五动作 + 四个解锁彩蛋，供「伙伴动作」栏列全 9 个动作。 */
export const ACTION_CATALOG: readonly ActionCatalogEntry[] = [
  ...MENU_COPY.map(([kind, name, detail]) => ({ kind, name, detail, source: 'menu' as const })),
  ...UNLOCKS.filter((item) => item.kind === 'action').map((item) => ({
    kind: POKE_KIND_BY_UNLOCK[item.id],
    name: item.name,
    detail: item.detail,
    source: 'poke' as const,
    unlockId: item.id,
  })),
]