import { useMemo } from 'react'
import { AlertTriangle, X } from 'lucide-react'

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { MOOD_MAP } from '@/features/mood/mood.config'
import { CompanionBubble } from '@/features/planet/components/CompanionBubble'
import { CompanionRadialMenu } from '@/features/planet/components/CompanionRadialMenu'
import { MemoryStarPanel } from '@/features/planet/components/MemoryStarPanel'
import { MemoryStarSizePanel } from '@/features/planet/components/MemoryStarSizePanel'
import { PlanetGrowthPanel } from '@/features/planet/components/PlanetGrowthPanel'
import { PlanetGreeting, PlanetHud } from '@/features/planet/components/PlanetHud'
import { PlanetSnapshot } from '@/features/planet/components/PlanetSnapshot'
import { PlanetStage } from '@/features/planet/components/PlanetStage'
import { QuickEntries } from '@/features/planet/components/QuickEntries'
import { RecentStarTrail } from '@/features/planet/components/RecentStarTrail'
import { UNLOCKS } from '@/features/planet/growth.config'
import { useDocumentTitle } from '@/hooks'
import { usePlanetStore } from '@/stores/usePlanetStore'

interface PlanetState {
  label: string
  value: string
  hint: string
  hex?: string
}

export default function PlanetPage() {
  useDocumentTitle('星球主页')

  const environment = usePlanetStore((state) => state.environment)
  const growth = usePlanetStore((state) => state.growth)
  const starCount = usePlanetStore((state) => state.stars.length)
  const loadError = usePlanetStore((state) => state.loadError)
  const saveError = usePlanetStore((state) => state.saveError)
  const dismissErrors = usePlanetStore((state) => state.dismissErrors)

  const states = useMemo<PlanetState[]>(() => {
    const mood = environment.mood ? MOOD_MAP[environment.mood] : null
    return [
      {
        label: '当前主色调',
        value: mood ? mood.label : '安静蓝紫',
        hint: mood ? '由最近一个有记录的日子综合得出' : '还没有记录时的默认夜色',
        hex: mood?.hex,
      },
      {
        label: '记忆星',
        value: String(starCount),
        hint: '每成功保存一条记录点亮一颗',
      },
      {
        label: '已解锁装饰',
        value: `${growth.unlocks.length} / ${UNLOCKS.length}`,
        hint: '随累计记录与互动增加，不会减少',
      },
    ]
  }, [environment.mood, growth.unlocks.length, starCount])

  return (
    <div className="flex flex-col gap-5 lg:gap-8">
      {/* 窄屏幕问候区独立成行，不叠在舞台上，文字就不会压住星球顶部的小伙伴 */}
      <div className="lg:hidden">
        <PlanetGreeting />
      </div>
      <section className="relative">
        <PlanetStage />
        <PlanetHud />
        <CompanionBubble />
        <MemoryStarPanel />
        <MemoryStarSizePanel />
        <CompanionRadialMenu />
      </section>

      {loadError || saveError ? (
        <div
          role="status"
          className="glass-panel flex items-start gap-3 border-butter-400/30 px-4 py-3.5"
        >
          <AlertTriangle
            className="mt-0.5 size-4 shrink-0 text-butter-300"
            strokeWidth={1.8}
            aria-hidden
          />
          <div className="flex-1 space-y-1 text-sm leading-relaxed text-ink-300">
            {loadError ? <p>{loadError}</p> : null}
            {saveError ? <p>{saveError}</p> : null}
          </div>
          <button
            type="button"
            onClick={dismissErrors}
            aria-label="关闭提示"
            className="-mt-0.5 grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-ink-500 transition-colors duration-200 ease-soft hover:bg-white/6 hover:text-ink-100"
          >
            <X className="size-4" strokeWidth={1.9} aria-hidden />
          </button>
        </div>
      ) : null}

      <p className="-mt-2 text-center text-xs text-ink-700 lg:-mt-5">
        拖动旋转星球 · 双指或滚轮缩放 · 点一下星球上的伙伴 · 右键或长按伙伴打开动作菜单 ·
        左键记忆星查看记忆 · 右键或长按记忆星调整大小
      </p>

      <QuickEntries />
      <PlanetSnapshot />

      <section className="grid gap-4 lg:grid-cols-3">
        <RecentStarTrail />

        <Card>
          <CardHeader>
            <CardTitle>星球状态</CardTitle>
            <CardDescription>随着记录累积，星球会逐渐成形。</CardDescription>
          </CardHeader>
          <ul className="mt-5 flex flex-col divide-y divide-hairline">
            {states.map((item) => (
              <li
                key={item.label}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm text-ink-300">{item.label}</span>
                  <span className="text-xs leading-relaxed text-ink-700">{item.hint}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2 font-display text-lg font-semibold text-iris-300">
                  {item.hex ? (
                    <span
                      aria-hidden
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: item.hex }}
                    />
                  ) : null}
                  {item.value}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <PlanetGrowthPanel />
    </div>
  )
}
