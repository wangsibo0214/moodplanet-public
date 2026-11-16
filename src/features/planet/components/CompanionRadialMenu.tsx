import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  Armchair,
  Hand,
  Heart,
  Moon,
  MoveUp,
  PartyPopper,
  type LucideIcon,
} from 'lucide-react'

import { useMediaQuery } from '@/hooks'
import { sound } from '@/features/sound/soundManager'
import { usePlanetStore } from '@/stores/usePlanetStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import type { CompanionActionKind } from '@/types/mood'
import { cn } from '@/utils/cn'

import { companionAnchor } from '../scene/companionAnchor'

/**
 * 伙伴的环绕动作菜单。
 *
 * 右键（桌面）或长按（触摸）伙伴打开；六个动作按钮以 60° 间隔围在伙伴四周。
 * 位置不走 React 重渲染：场景每帧把伙伴的屏幕坐标写进 companionAnchor，
 * 这里用 rAF 读取并直接改 transform，与气泡同一套路，拖动星球时菜单也能跟上。
 */

interface MenuAction {
  kind: CompanionActionKind
  label: string
  icon: LucideIcon
}

const ACTIONS: MenuAction[] = [
  { kind: 'wave', label: '挥手', icon: Hand },
  { kind: 'hop', label: '跳跃', icon: MoveUp },
  { kind: 'sit', label: '坐下', icon: Armchair },
  { kind: 'sleep', label: '睡觉', icon: Moon },
  { kind: 'dance', label: '跳舞', icon: PartyPopper },
  { kind: 'heart', label: '比心', icon: Heart },
]

/** 环绕半径与按钮直径（设计口径：约 85px / 48px，间隔 60°） */
const RADIUS = 85
/** 半个按钮 + 一点呼吸余量：按钮边缘到环心的最小安全距离 */
const BUTTON_HALF = 24 + 6
/** 名称标签只在按钮下方，所以只有底边需要额外让出这一段 */
const LABEL_DROP = 22
/**
 * 钳制边距按方向拆开：顶边的按钮标签朝环心内落，不必让位；
 * 底边要连标签一起算进去。伙伴常驻星球顶部，非对称边距能让环心
 * 尽量贴近角色，只有真的会溢出可视区时才 inward 平移。
 */
const MARGIN_X = RADIUS + BUTTON_HALF
const MARGIN_TOP = RADIUS + BUTTON_HALF
const MARGIN_BOTTOM = RADIUS + BUTTON_HALF + LABEL_DROP
/** 收起状态时按钮缩向中心的程度 */
const COLLAPSE = 0.35
const STAGGER_MS = 28
const POP_MS = 260
const EXIT_MS = 200
/** 选中反馈停留多久再收起菜单，让「点了哪个」看得见 */
const SELECT_HOLD_MS = 140

function angleOf(index: number): number {
  /* 从正上方起顺时针排布 */
  return ((-90 + index * 60) * Math.PI) / 180
}

export function CompanionRadialMenu() {
  const open = usePlanetStore((state) => state.companionMenuOpen)
  const close = usePlanetStore((state) => state.closeCompanionMenu)
  const perform = usePlanetStore((state) => state.performCompanionAction)
  const reduceMotion = useSettingsStore((state) => state.reduceMotion)
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const calm = reduceMotion || prefersReducedMotion

  /* visible 控制挂载（收起动画播完才卸载），expanded 控制展开/收起的目标姿态。
     open 翻转时在渲染期同步调整（React 官方口径），不在 effect 里 setState 引发级联渲染 */
  const [visible, setVisible] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [selected, setSelected] = useState<CompanionActionKind | null>(null)
  const [prevOpen, setPrevOpen] = useState(open)
  if (prevOpen !== open) {
    setPrevOpen(open)
    if (open) {
      setSelected(null)
      setVisible(true)
    } else {
      setExpanded(false)
    }
  }
  const ringRef = useRef<HTMLDivElement>(null)
  const firstButtonRef = useRef<HTMLButtonElement>(null)
  const selectTimer = useRef(0)
  /* 选中动作而收起时不播 whoosh：chime 已经是那一下的反馈，叠风声会吵 */
  const suppressWhoosh = useRef(false)
  const wasOpen = useRef(open)

  /* 开 = 轻微 Pop；关 = 柔和 Whoosh（首挂载不响，刷新页面不会自动出声） */
  useEffect(() => {
    if (open) {
      suppressWhoosh.current = false
      sound.play('pop')
    } else if (wasOpen.current && !suppressWhoosh.current) {
      sound.play('whoosh')
    }
    wasOpen.current = open
  }, [open])

  /* 收起时延迟卸载，让按钮有时间缩回中心再消失 */
  useEffect(() => {
    if (open) return
    const id = window.setTimeout(() => setVisible(false), calm ? 0 : EXIT_MS)
    return () => window.clearTimeout(id)
  }, [open, calm])

  /* 挂载后下一帧再展开，按钮才有从中心弹出去的过渡；顺带把焦点交给第一个按钮 */
  useLayoutEffect(() => {
    if (!visible || !open) return
    const id = window.setTimeout(() => {
      setExpanded(true)
      firstButtonRef.current?.focus({ preventScroll: true })
    }, 20)
    return () => window.clearTimeout(id)
  }, [visible, open])

  /* 跟随伙伴：rAF 读锚点、写 transform；转到背面半球（离开视野）直接收起菜单。
     舞台尺寸每帧现读，窗口缩放不需要额外监听。 */
  useLayoutEffect(() => {
    if (!visible) return
    const el = ringRef.current
    const stage = el?.offsetParent as HTMLElement | null
    if (!el || !stage) return
    const place = () => {
      if (!companionAnchor.onScreen) {
        close()
        return
      }
      /* 钳到舞台内：靠近边缘时整个环往里挪，按钮永远不出可视区。上下边距非对称（顶部无标签）。 */
      const bodyY = (companionAnchor.y + companionAnchor.bottomY) / 2
      const mx = Math.min(MARGIN_X, stage.clientWidth / 2)
      const mTop = Math.min(MARGIN_TOP, stage.clientHeight / 2)
      const mBottom = Math.min(MARGIN_BOTTOM, stage.clientHeight / 2)
      const x = Math.min(Math.max(companionAnchor.x, mx), stage.clientWidth - mx)
      const y = Math.min(Math.max(bodyY, mTop), stage.clientHeight - mBottom)
      el.style.transform = `translate(${x}px, ${y}px)`
      raf = window.requestAnimationFrame(place)
    }
    let raf = 0
    /* 先同步摆一次：首帧就不会闪现在舞台左上角 */
    place()
    return () => window.cancelAnimationFrame(raf)
  }, [visible, close])

  /* 点菜单之外的任何地方收起；环内的点击交给按钮自己 */
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (ringRef.current?.contains(event.target as Node)) return
      close()
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [open, close])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, close])

  /* 卸载时清掉还没触发的选中定时器 */
  useEffect(
    () => () => {
      if (selectTimer.current !== 0) window.clearTimeout(selectTimer.current)
    },
    [],
  )

  const handleSelect = (kind: CompanionActionKind) => {
    if (selectTimer.current !== 0) window.clearTimeout(selectTimer.current)
    setSelected(kind)
    suppressWhoosh.current = true
    sound.play('chime')
    /* perform 会顺手关掉菜单；calm 时不演选中停留，直接执行 */
    selectTimer.current = window.setTimeout(
      () => {
        selectTimer.current = 0
        perform(kind)
      },
      calm ? 0 : SELECT_HOLD_MS,
    )
  }

  if (!visible) return null

  const transition = (index: number) =>
    calm
      ? undefined
      : `transform ${POP_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1) ${index * STAGGER_MS}ms, opacity ${POP_MS}ms var(--ease-soft) ${index * STAGGER_MS}ms`

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      {/* 蒙层接住舞台上的指针：菜单开着时拖不动星球，右键也不再弹浏览器菜单 */}
      <div
        aria-hidden
        className="pointer-events-auto absolute inset-0 cursor-default"
        onContextMenu={(event) => event.preventDefault()}
      />
      <div ref={ringRef} className="absolute top-0 left-0" role="menu" aria-label="伙伴动作">
        {ACTIONS.map((action, index) => {
          const angle = angleOf(index)
          const tx = Math.cos(angle) * RADIUS
          const ty = Math.sin(angle) * RADIUS
          const Icon = action.icon
          const isSelected = selected === action.kind
          return (
            <div
              key={action.kind}
              className="group absolute top-0 left-0"
              style={{
                transform: `translate(-50%, -50%) translate(${expanded ? tx : tx * COLLAPSE}px, ${expanded ? ty : ty * COLLAPSE}px)`,
                opacity: expanded ? 1 : 0,
                transition: transition(index),
              }}
            >
              <button
                ref={index === 0 ? firstButtonRef : undefined}
                type="button"
                role="menuitem"
                aria-label={`让伙伴${action.label}`}
                data-sound="none"
                onClick={() => handleSelect(action.kind)}
                className={cn(
                  'glass-panel pointer-events-auto grid size-12 cursor-pointer place-items-center rounded-full',
                  'text-ink-300 shadow-float transition-all duration-200 ease-soft',
                  'hover:scale-110 hover:text-ink-50 hover:shadow-glow-iris',
                  'focus-visible:scale-110 focus-visible:text-ink-50',
                  'active:scale-95',
                  isSelected && 'scale-110 text-butter-300 ring-2 ring-butter-300/60',
                )}
              >
                <Icon className="size-5" strokeWidth={1.9} aria-hidden />
              </button>
              {/* 动作名称：悬停或选中时浮现 */}
              <span
                className={cn(
                  'pointer-events-none absolute top-full left-1/2 mt-1.5 -translate-x-1/2',
                  'rounded-full bg-cosmos-950/80 px-2 py-0.5 text-[11px] whitespace-nowrap text-ink-300',
                  'opacity-0 transition-opacity duration-200 ease-soft',
                  'group-hover:opacity-100 group-focus-within:opacity-100',
                  isSelected && 'opacity-100',
                )}
              >
                {action.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
