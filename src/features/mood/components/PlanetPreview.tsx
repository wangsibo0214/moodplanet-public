import type { PlanetSuggestion } from '@/types/mood'

interface PlanetPreviewProps {
  planet: PlanetSuggestion
  moodLabel: string
}

/**
 * 星球变化预览：用 CSS 渐变画一颗小球，颜色与光晕强度直接取自分析结果，
 * 和主页 3D 星球用的是同一组参数（tint / glow），所以「预览」不会骗人。
 */
export function PlanetPreview({ planet, moodLabel }: PlanetPreviewProps) {
  const glowAlpha = Math.round(planet.glow * 90)
    .toString(16)
    .padStart(2, '0')

  return (
    <div className="flex items-center gap-4">
      <div aria-hidden className="relative size-20 shrink-0">
        <span
          className="absolute -inset-4 rounded-full animate-drift"
          style={{
            background: `radial-gradient(circle, ${planet.tint}${glowAlpha} 0%, transparent 68%)`,
          }}
        />
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 32% 28%, ${planet.tint}f0, ${planet.tint}59 46%, rgb(9 11 30 / 0.92) 82%)`,
            boxShadow: `inset -6px -8px 18px rgb(7 8 26 / 0.55), 0 0 ${12 + planet.glow * 26}px ${planet.tint}4d`,
          }}
        />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-ink-700">今日心情 · {moodLabel}</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-300">{planet.note}</p>
      </div>
    </div>
  )
}
