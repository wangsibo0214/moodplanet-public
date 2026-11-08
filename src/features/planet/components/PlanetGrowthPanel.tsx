import { Check, Lock, Sprout } from 'lucide-react'

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { UNLOCKS, nextUnlock } from '@/features/planet/growth.config'
import { usePlanetStore } from '@/stores/usePlanetStore'
import { cn } from '@/utils/cn'

const KIND_LABEL = { plant: '植物', decor: '装饰', action: '伙伴动作' } as const

/**
 * 成长面板。
 * 门槛全部基于累计量，且解锁只增不减，所以这里永远不会出现「昨天有今天没了」的项。
 */
export function PlanetGrowthPanel() {
  const growth = usePlanetStore((state) => state.growth)
  const owned = new Set(growth.unlocks)
  const next = nextUnlock(growth)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sprout className="size-4 text-mint-400" strokeWidth={1.75} aria-hidden />
          星球成长
        </CardTitle>
        <CardDescription>
          累计保存 {growth.totalSaved} 条记录 · 主动互动 {growth.interactions} 次。
          {next ? `${next.lack}，就能解锁「${next.def.name}」。` : '所有装饰都已长齐。'}
        </CardDescription>
      </CardHeader>

      <ul className="mt-5 flex flex-col gap-2.5">
        {UNLOCKS.map((item) => {
          const unlocked = owned.has(item.id)
          return (
            <li
              key={item.id}
              className={cn(
                'flex items-start gap-3 rounded-md px-3.5 py-3 transition-colors duration-200 ease-soft',
                unlocked ? 'bg-white/5' : 'bg-white/2',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 grid size-6 shrink-0 place-items-center rounded-full',
                  unlocked ? 'bg-mint-400/15 text-mint-400' : 'bg-white/6 text-ink-700',
                )}
              >
                {unlocked ? (
                  <Check className="size-3.5" strokeWidth={2.2} aria-hidden />
                ) : (
                  <Lock className="size-3" strokeWidth={2} aria-hidden />
                )}
                <span className="sr-only">{unlocked ? '已解锁' : '未解锁'}</span>
              </span>

              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'text-sm font-medium',
                      unlocked ? 'text-ink-50' : 'text-ink-500',
                    )}
                  >
                    {item.name}
                  </span>
                  <span className="rounded-full bg-white/6 px-2 py-0.5 text-[11px] text-ink-700">
                    {KIND_LABEL[item.kind]}
                  </span>
                </span>
                <span className="text-xs leading-relaxed text-ink-700">{item.detail}</span>
              </span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
