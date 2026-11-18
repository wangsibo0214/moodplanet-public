import { Check, Lock, Sprout } from 'lucide-react'

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { UNLOCKS, nextUnlock } from '@/features/planet/growth.config'
import type { UnlockDef } from '@/features/planet/growth.config'
import { usePlanetStore } from '@/stores/usePlanetStore'
import { cn } from '@/utils/cn'

const KIND_LABEL = { plant: '植物', decor: '装饰' } as const

const ROWS = UNLOCKS.filter(
  (item): item is UnlockDef & { kind: keyof typeof KIND_LABEL } => item.kind !== 'action',
)

interface GrowthRowProps {
  name: string
  tag: string
  detail: string
  unlocked: boolean
}

export function GrowthRow({ name, tag, detail, unlocked }: GrowthRowProps) {
  return (
    <li
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
            {name}
          </span>
          <span className="rounded-full bg-white/6 px-2 py-0.5 text-[11px] text-ink-700">
            {tag}
          </span>
        </span>
        <span className="text-xs leading-relaxed text-ink-700">{detail}</span>
      </span>
    </li>
  )
}

/** 门槛基于累计量且只增不减；面板只列植物与装饰。伙伴动作不进面板：自由动作只在径向菜单，解锁动作是戳伙伴的随机彩蛋（挥手另在菜单按解锁开放）。 */
export function PlanetGrowthPanel() {
  const growth = usePlanetStore((state) => state.growth)
  const owned = new Set(growth.unlocks)
  const next = nextUnlock(growth, ['plant', 'decor'])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sprout className="size-4 text-mint-400" strokeWidth={1.75} aria-hidden />
          星球成长
        </CardTitle>
        <CardDescription>
          累计保存 {growth.totalSaved} 条记录 · 和伙伴互动 {growth.interactions} 次。
          {next ? `${next.lack}，就能解锁「${next.def.name}」。` : '所有装饰都已长齐。'}
        </CardDescription>
      </CardHeader>

      <ul className="mt-5 flex flex-col gap-2.5">
        {ROWS.map((item) => (
          <GrowthRow
            key={item.id}
            name={item.name}
            tag={KIND_LABEL[item.kind]}
            detail={item.detail}
            unlocked={owned.has(item.id)}
          />
        ))}
      </ul>
    </Card>
  )
}