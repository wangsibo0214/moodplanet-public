import { useEffect, useRef } from 'react'
import { RotateCcw, Star, X } from 'lucide-react'

import { Button } from '@/components/ui'
import { MOOD_MAP } from '@/features/mood/mood.config'
import {
  STAR_SIZE_DEFAULT,
  STAR_SIZE_MAX,
  STAR_SIZE_MIN,
  STAR_TIER_LABELS,
  starSizeTier,
} from '@/features/planet/lib/starSize'
import { usePlanetStore } from '@/stores/usePlanetStore'

import {
  registerSizePanelNodes,
  unregisterSizePanelNodes,
} from '../scene/starPanelBridge'

/**
 * 右键（或长按）记忆星后弹出的大小调整面板。
 * 只调当前这一颗星：等级由百分比实时算出，不重复展示记忆正文。
 *
 * 定位与详情面板同一套帧同步机制：根节点常驻舞台左上角，StarPanelTracker
 * 每帧投影锚定星的世界坐标后写 transform；首帧投影完成前保持 hidden。
 */
export function MemoryStarSizePanel() {
  const sizedStarId = usePlanetStore((state) => state.sizedStarId)
  const openStarSize = usePlanetStore((state) => state.openStarSize)
  const setStarSize = usePlanetStore((state) => state.setStarSize)
  const star = usePlanetStore((state) =>
    sizedStarId === null ? null : (state.stars.find((item) => item.id === sizedStarId) ?? null),
  )
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const lineRef = useRef<SVGLineElement>(null)
  const dotRef = useRef<SVGCircleElement>(null)
  /* 星被删（记录删除）时收起面板，不留一个调不到的对象 */
  const orphaned = sizedStarId !== null && star === null

  useEffect(() => {
    if (orphaned) openStarSize(null)
  }, [orphaned, openStarSize])

  /* 点面板之外或按 Escape 收起；拖滑块的手势留在面板内 */
  useEffect(() => {
    if (star === null) return
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return
      openStarSize(null)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') openStarSize(null)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [star, openStarSize])

  /* 打开期间把 DOM 节点交给帧同步桥；关闭即摘除，tracker 下一帧自然停写 */
  const open = star !== null
  useEffect(() => {
    if (!open) return
    const root = rootRef.current
    const panel = panelRef.current
    const svg = svgRef.current
    const line = lineRef.current
    const dot = dotRef.current
    if (!root || !panel || !svg || !line || !dot) return
    const nodes = { root, panel, svg, line, dot }
    registerSizePanelNodes(nodes)
    return () => unregisterSizePanelNodes(nodes)
  }, [open])

  if (star === null) return null

  const mood = MOOD_MAP[star.mood]
  const name = star.title.length > 0 ? star.title : `${mood.label}的记忆星`
  const tier = starSizeTier(star.size)

  return (
    <>
      <svg
        ref={svgRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10"
        style={{ visibility: 'hidden' }}
      >
        <line ref={lineRef} stroke={mood.hex} strokeOpacity={0.45} strokeWidth={1.5} />
        <circle ref={dotRef} r={3} fill={mood.hex} fillOpacity={0.8} />
      </svg>
      <div
        ref={rootRef}
        className="pointer-events-none absolute top-0 left-0 z-20 w-[min(92%,21rem)]"
        style={{ visibility: 'hidden' }}
      >
        <div
          ref={panelRef}
          className="glass-panel pointer-events-auto flex max-h-[70vh] flex-col gap-3 overflow-y-auto p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Star
                className="size-4 shrink-0"
                style={{ color: mood.hex }}
                strokeWidth={1.9}
                aria-hidden
              />
              <h2 className="truncate font-display text-sm font-semibold text-ink-50">{name}</h2>
            </div>
            <button
              type="button"
              onClick={() => openStarSize(null)}
              aria-label="关闭大小调整"
              className="-mt-1 -mr-1.5 grid size-11 shrink-0 cursor-pointer place-items-center rounded-sm text-ink-700 transition-colors duration-200 hover:text-ink-100"
            >
              <X className="size-4" strokeWidth={1.9} aria-hidden />
            </button>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full bg-white/6 px-2.5 py-1 text-[11px] font-medium text-ink-300">
              {STAR_TIER_LABELS[tier]}记忆星
            </span>
            <span className="font-display text-lg font-semibold text-iris-300 tabular-nums">
              {star.size}%
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-ink-700 tabular-nums">{STAR_SIZE_MIN}%</span>
            <input
              type="range"
              min={STAR_SIZE_MIN}
              max={STAR_SIZE_MAX}
              step={1}
              value={star.size}
              onChange={(event) => setStarSize(star.id, Number(event.target.value))}
              aria-label="记忆星大小"
              aria-valuetext={`${star.size}%`}
              className="h-2 min-w-0 flex-1 cursor-pointer accent-iris-400"
            />
            <span className="text-[11px] text-ink-700 tabular-nums">{STAR_SIZE_MAX}%</span>
          </div>

          <Button
            variant="secondary"
            size="sm"
            disabled={star.size === STAR_SIZE_DEFAULT}
            onClick={() => setStarSize(star.id, STAR_SIZE_DEFAULT)}
          >
            <RotateCcw className="size-4" strokeWidth={1.9} aria-hidden />
            恢复默认大小
          </Button>
        </div>
      </div>
    </>
  )
}