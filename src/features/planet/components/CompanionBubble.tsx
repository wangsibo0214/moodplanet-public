import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

import { useMediaQuery } from '@/hooks'
import { usePlanetStore } from '@/stores/usePlanetStore'

import { startAnchorFollow } from '../lib/anchorFollow'
import { companionAnchor } from '../scene/companionAnchor'

const DISMISS_AFTER = 5200

/** 点击星球伙伴后冒出来的一句话。整块可点，点一下就收。 */
export function CompanionBubble() {
  const line = usePlanetStore((state) => state.companionLine)
  const dismiss = usePlanetStore((state) => state.dismissCompanion)
  const calm = useMediaQuery('(prefers-reduced-motion: reduce)')
  const placeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!line) return
    const timer = window.setTimeout(dismiss, DISMISS_AFTER)
    return () => window.clearTimeout(timer)
  }, [line, dismiss])

  /* 气泡锚在伙伴头顶上方；上方放不下或会压住 HUD 顶行时翻到脚底下方；锚不上（转到背面）才退回舞台底部居中 */
  useEffect(() => {
    if (!line) return
    const el = placeRef.current
    const stage = el?.offsetParent as HTMLElement | null
    if (!el || !stage) return
    /* 气泡容器与 HUD 是 section 下的同级兄弟，顶行要到父级里找（offsetParent 只是容器自身） */
    const hudTop = stage.parentElement?.querySelector('[data-hud-top]') ?? null
    const hitsHud = (left: number, top: number, width: number, height: number) => {
      if (!hudTop) return false
      const stageRect = stage.getBoundingClientRect()
      const hudRect = hudTop.getBoundingClientRect()
      return (
        stageRect.left + left < hudRect.right &&
        stageRect.left + left + width > hudRect.left &&
        stageRect.top + top < hudRect.bottom &&
        stageRect.top + top + height > hudRect.top
      )
    }
    return startAnchorFollow({
      calm,
      place: () => {
        const half = el.offsetWidth / 2
        const height = el.offsetHeight
        const x = Math.min(Math.max(companionAnchor.x, half + 8), stage.clientWidth - half - 8)
        const above = companionAnchor.y - height - 14
        /* 从脚底起算的下方位：翻下去也不会盖住角色本身 */
        const below = companionAnchor.bottomY + 12
        const preferred = above < 8 ? below : above
        const top = hitsHud(x - half, preferred, half * 2, height) ? below : preferred
        if (companionAnchor.onScreen && !hitsHud(x - half, top, half * 2, height)) {
          el.style.left = `${x}px`
          el.style.top = `${top}px`
          el.style.bottom = 'auto'
        } else {
          el.style.left = '50%'
          el.style.top = 'auto'
          el.style.bottom = window.innerWidth >= 1024 ? '96px' : '16px'
        }
      },
      firstFrame: 'async',
      request: (callback) => window.requestAnimationFrame(callback),
      cancel: (id) => window.cancelAnimationFrame(id),
    })
  }, [line, calm])

  return (
    /* 容器常驻，aria-live 才能在内容插入时播报 */
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute inset-0 z-20"
    >
      {line && (
        <div
          ref={placeRef}
          className="absolute -translate-x-1/2"
          style={{ left: '50%', bottom: 16, width: 'min(24rem, calc(100% - 2rem))' }}
        >
          <button
            type="button"
            onClick={dismiss}
            className="glass-panel pointer-events-auto flex w-full items-center gap-2.5 py-3 pr-3 pl-4 text-left transition-transform duration-200 ease-soft active:scale-[0.98]"
          >
            <span className="text-sm leading-relaxed text-ink-100">{line}</span>
            <X className="size-4 shrink-0 text-ink-700" strokeWidth={1.9} aria-hidden />
            <span className="sr-only">（点一下收起）</span>
          </button>
        </div>
      )}
    </div>
  )
}