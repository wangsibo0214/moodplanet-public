import { useMemo } from 'react'

import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useSettingsStore, type StarDensity } from '@/stores/useSettingsStore'
import { cn } from '@/utils/cn'
import { createRandom } from '@/utils/random'

import { buildMeteors, meteorCount, meteorStyle, shouldRenderMeteors } from './meteorShower'

interface Star {
  top: number
  left: number
  size: number
  opacity: number
  delay: number
  duration: number
}

const DENSITY_COUNT: Record<StarDensity, number> = {
  low: 40,
  normal: 90,
  high: 160,
}

function buildStars(count: number): Star[] {
  const random = createRandom(20260107)
  return Array.from({ length: count }, () => ({
    top: random() * 100,
    left: random() * 100,
    size: random() < 0.82 ? 1 + random() : 2 + random() * 1.2,
    opacity: 0.25 + random() * 0.6,
    delay: random() * 5,
    duration: 3 + random() * 4,
  }))
}

/**
 * 全站固定背景层：深蓝紫宇宙渐变 + CSS 星点 + 缓慢漂浮的星云光斑。
 * 第一阶段刻意不用 three.js，等 3D 星球场景确定后再替换星点层。
 */
export function StarfieldBackground() {
  const density = useSettingsStore((s) => s.starDensity)
  const reduceMotion = useSettingsStore((s) => s.reduceMotion)
  const meteorShower = useSettingsStore((s) => s.meteorShower)
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const isMobile = useMediaQuery('(max-width: 640px)')

  const calm = reduceMotion || prefersReducedMotion
  const count = isMobile ? Math.round(DENSITY_COUNT[density] / 2) : DENSITY_COUNT[density]
  const stars = useMemo(() => buildStars(count), [count])
  const showMeteors = shouldRenderMeteors(meteorShower, calm)
  const meteors = useMemo(
    () => (showMeteors ? buildMeteors(meteorCount(isMobile)) : []),
    [isMobile, showMeteors],
  )

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="cosmic-bg absolute inset-0" />

      {stars.map((star, index) => (
        <span
          key={index}
          className={cn('absolute rounded-full bg-ink-50', !calm && 'animate-twinkle')}
          style={{
            top: `${star.top}%`,
            left: `${star.left}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: calm ? star.opacity * 0.8 : undefined,
            animationDelay: `${star.delay}s`,
            animationDuration: `${star.duration}s`,
          }}
        />
      ))}

      <div
        className={cn(
          'absolute -top-24 -left-28 size-[26rem] rounded-full bg-iris-500/12 blur-3xl',
          !calm && 'animate-drift',
        )}
      />
      <div
        className={cn(
          'absolute top-1/3 -right-32 size-[22rem] rounded-full bg-astro-500/10 blur-3xl',
          !calm && 'animate-drift',
          '[animation-delay:-6s]',
        )}
      />
      <div
        className={cn(
          'absolute -bottom-32 left-1/3 size-[24rem] rounded-full bg-blush-500/8 blur-3xl',
          !calm && 'animate-drift',
          '[animation-delay:-11s]',
        )}
      />

      {meteors.map((meteor, index) => (
        <span
          key={index}
          data-meteor-shower
          className="meteor-shower__meteor animate-meteor"
          style={meteorStyle(meteor)}
        />
      ))}

      {/* 顶部与底部的压暗，让内容区更容易读 */}
      <div className="absolute inset-0 bg-linear-to-b from-cosmos-950/55 via-transparent to-cosmos-950/70" />
    </div>
  )
}
