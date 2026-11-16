/** 弹窗与星锚点之间的间距：斜向留白，连接线才读得出指向 */
export const PANEL_GAP = 18
/** 弹窗与舞台边缘的最小距离 */
export const PANEL_MARGIN = 8

export interface AnchorPoint {
  x: number
  y: number
}

export interface PanelSize {
  w: number
  h: number
}

export interface PanelPlacement {
  left: number
  top: number
  side: 'right' | 'left'
  vertical: 'above' | 'below'
  /** 弹窗边框上离星最近的点：连接线落在这一端 */
  attach: AnchorPoint
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * 锚定式弹窗摆位：优先星的右上方，右放不下翻左、上放不下翻下，
 * 最后夹进舞台内；夹完若仍压住星就整体翻到另一侧。
 * 纯函数，不碰 DOM，便于单测覆盖各种边缘情形。
 */
export function placeStarPanel(
  anchor: AnchorPoint,
  size: PanelSize,
  bounds: PanelSize,
  gap = PANEL_GAP,
  margin = PANEL_MARGIN,
): PanelPlacement {
  const maxLeft = Math.max(margin, bounds.w - size.w - margin)
  const maxTop = Math.max(margin, bounds.h - size.h - margin)

  let side: 'right' | 'left' = anchor.x + gap + size.w <= bounds.w - margin ? 'right' : 'left'
  let left = side === 'right' ? anchor.x + gap : anchor.x - gap - size.w
  let vertical: 'above' | 'below' = anchor.y - gap - size.h >= margin ? 'above' : 'below'
  let top = vertical === 'above' ? anchor.y - gap - size.h : anchor.y + gap

  left = clamp(left, margin, maxLeft)
  top = clamp(top, margin, maxTop)

  /* 夹取后仍盖住星：翻到对侧再夹一次，保证星始终露在弹窗外 */
  if (anchor.x >= left && anchor.x <= left + size.w && anchor.y >= top && anchor.y <= top + size.h) {
    side = side === 'right' ? 'left' : 'right'
    left = clamp(side === 'right' ? anchor.x + gap : anchor.x - gap - size.w, margin, maxLeft)
    vertical = vertical === 'above' ? 'below' : 'above'
    top = clamp(vertical === 'above' ? anchor.y - gap - size.h : anchor.y + gap, margin, maxTop)
  }

  return {
    left,
    top,
    side,
    vertical,
    attach: {
      x: clamp(anchor.x, left, left + size.w),
      y: clamp(anchor.y, top, top + size.h),
    },
  }
}