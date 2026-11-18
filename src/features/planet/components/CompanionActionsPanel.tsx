import { PawPrint } from 'lucide-react'

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { UNLOCK_MAP } from '@/features/planet/growth.config'
import { ACTION_CATALOG } from '@/features/planet/lib/actionCatalog'
import { usePlanetStore } from '@/stores/usePlanetStore'

import { GrowthRow } from './PlanetGrowthPanel'

/** 伙伴动作独立栏：自由五动作天生可用，四个彩蛋动作信 growth.unlocks 显示锁态与门槛。 */
export function CompanionActionsPanel() {
  const growth = usePlanetStore((state) => state.growth)
  const owned = new Set(growth.unlocks)
  const poke = ACTION_CATALOG.filter((entry) => entry.source === 'poke')
  const ownedPoke = poke.filter((entry) => owned.has(entry.unlockId ?? '')).length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PawPrint className="size-4 text-butter-300" strokeWidth={1.75} aria-hidden />
          伙伴动作
        </CardTitle>
        <CardDescription>
          菜单里五个动作天生可用 · 彩蛋已解锁 {ownedPoke} / {poke.length}。
          彩蛋动作随互动次数解锁，戳伙伴时随机抽中。
        </CardDescription>
      </CardHeader>

      <ul className="mt-5 flex flex-col gap-2.5">
        {ACTION_CATALOG.map((entry) => {
          if (entry.source === 'menu') {
            return (
              <GrowthRow
                key={entry.kind}
                name={entry.name}
                tag="菜单"
                detail={entry.detail}
                unlocked
              />
            )
          }
          const def = UNLOCK_MAP[entry.unlockId ?? '']
          const unlocked = owned.has(def.id)
          return (
            <GrowthRow
              key={entry.kind}
              name={entry.name}
              tag="彩蛋"
              detail={
                unlocked
                  ? `${entry.detail}（戳伙伴时随机抽中）`
                  : `${entry.detail}（互动 ${def.interactions ?? 0} 次解锁）`
              }
              unlocked={unlocked}
            />
          )
        })}
      </ul>
    </Card>
  )
}