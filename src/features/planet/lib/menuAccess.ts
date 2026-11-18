import type { CompanionActionKind, PlanetGrowth } from '@/types/mood'

import { UNLOCK_MAP } from '../growth.config'

/** 菜单动作 → 成长解锁 id；没列进来的动作不受门控 */
const LOCK_BY_KIND: Partial<Record<CompanionActionKind, string>> = {
  wave: 'companion-wave',
}

export interface MenuLock {
  hint: string
}

/** 与 actionPool 同一口径：信 growth.unlocks（hydrate 与每次互动都会重算） */
export function menuActionLock(
  kind: CompanionActionKind,
  growth: PlanetGrowth,
): MenuLock | null {
  const id = LOCK_BY_KIND[kind]
  if (!id || growth.unlocks.includes(id)) return null
  const need = UNLOCK_MAP[id].interactions ?? 0
  return { hint: `互动 ${need} 次解锁` }
}