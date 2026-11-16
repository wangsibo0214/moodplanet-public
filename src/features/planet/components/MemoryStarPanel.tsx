import { useEffect, useRef } from 'react'
import { Star, X } from 'lucide-react'

import { MOOD_MAP } from '@/features/mood/mood.config'
import { useMoodStore } from '@/stores/useMoodStore'
import { usePlanetStore } from '@/stores/usePlanetStore'
import { formatRecordTime } from '@/utils/date'

import {
  registerStarPanelNodes,
  unregisterStarPanelNodes,
} from '../scene/starPanelBridge'

/**
 * 左键（或轻触）星球上的记忆星后弹出：只看记忆本身。
 * 名称、日期与完整内容都来自关联的那条 MoodRecord；大小调整在右键的独立面板里。
 * 记录一旦被删，这里直接回到空态而不是留一颗打不开的星。
 *
 * 定位不写死在 CSS 里：根节点常驻舞台左上角，由 StarPanelTracker 每帧投影
 * 选中星的世界坐标后写 transform，弹窗因此贴着星走；指示线一端是星、一端是弹窗边框。
 * 首帧投影完成前保持 hidden，避免在 (0,0) 闪一下。
 */
export function MemoryStarPanel() {
  const selectedRecordId = usePlanetStore((state) => state.selectedRecordId)
  const openStar = usePlanetStore((state) => state.openStar)
  const star = usePlanetStore((state) =>
    selectedRecordId === null
      ? null
      : (state.stars.find((item) => item.recordId === selectedRecordId) ?? null),
  )
  const record = useMoodStore((state) =>
    selectedRecordId === null
      ? null
      : (state.records.find((item) => item.id === selectedRecordId) ?? null),
  )
  /* 星在但记录已经不在：自动收起选中态，避免出现「打不开的记忆星」 */
  const orphaned = selectedRecordId !== null && record === null
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const lineRef = useRef<SVGLineElement>(null)
  const dotRef = useRef<SVGCircleElement>(null)

  useEffect(() => {
    if (orphaned) openStar(null)
  }, [orphaned, openStar])

  /* 点面板之外的任何地方（含星球空白处）或按 Escape 收起；面板内的点击交给面板自己 */
  useEffect(() => {
    if (record === null) return
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return
      openStar(null)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') openStar(null)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [record, openStar])

  /* 打开期间把 DOM 节点交给帧同步桥；关闭即摘除，tracker 下一帧自然停写 */
  const open = record !== null
  useEffect(() => {
    if (!open) return
    const root = rootRef.current
    const panel = panelRef.current
    const svg = svgRef.current
    const line = lineRef.current
    const dot = dotRef.current
    if (!root || !panel || !svg || !line || !dot) return
    const nodes = { root, panel, svg, line, dot }
    registerStarPanelNodes(nodes)
    return () => unregisterStarPanelNodes(nodes)
  }, [open])

  if (record === null) return null

  const mood = MOOD_MAP[record.mood]
  const name = star !== null && star.title.length > 0 ? star.title : `${mood.label}的记忆星`

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
              onClick={() => openStar(null)}
              aria-label="关闭记忆星详情"
              className="-mt-1 -mr-1.5 grid size-11 shrink-0 cursor-pointer place-items-center rounded-sm text-ink-700 transition-colors duration-200 hover:text-ink-100"
            >
              <X className="size-4" strokeWidth={1.9} aria-hidden />
            </button>
          </div>

          <p className="text-xs text-ink-700">{formatRecordTime(record.createdAt)}</p>

          {record.content.trim().length > 0 ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink-100">
              {record.content}
            </p>
          ) : (
            <p className="text-sm text-ink-500">这条记录没有写下文字。</p>
          )}
        </div>
      </div>
    </>
  )
}