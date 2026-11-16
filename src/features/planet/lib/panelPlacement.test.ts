import { describe, expect, it } from 'vitest'

import { PANEL_GAP, PANEL_MARGIN, placeStarPanel } from './panelPlacement'

const BOUNDS = { w: 600, h: 400 }
const SIZE = { w: 200, h: 120 }

function coversStar(
  anchor: { x: number; y: number },
  p: { left: number; top: number },
  size: { w: number; h: number },
): boolean {
  return (
    anchor.x >= p.left &&
    anchor.x <= p.left + size.w &&
    anchor.y >= p.top &&
    anchor.y <= p.top + size.h
  )
}

describe('placeStarPanel', () => {
  it('空间充足时优先放在星的右上方', () => {
    const p = placeStarPanel({ x: 200, y: 200 }, SIZE, BOUNDS)
    expect(p.side).toBe('right')
    expect(p.vertical).toBe('above')
    expect(p.left).toBe(200 + PANEL_GAP)
    expect(p.top).toBe(200 - PANEL_GAP - SIZE.h)
  })

  it('右侧放不下时翻到左边，仍保持上方', () => {
    const anchor = { x: 560, y: 200 }
    const p = placeStarPanel(anchor, SIZE, BOUNDS)
    expect(p.side).toBe('left')
    expect(p.vertical).toBe('above')
    expect(p.left + SIZE.w).toBe(anchor.x - PANEL_GAP)
  })

  it('上方放不下时翻到下方，仍保持右侧', () => {
    const anchor = { x: 200, y: 100 }
    const p = placeStarPanel(anchor, SIZE, BOUNDS)
    expect(p.side).toBe('right')
    expect(p.vertical).toBe('below')
    expect(p.top).toBe(anchor.y + PANEL_GAP)
  })

  it('右上角的星：同时翻到左下方', () => {
    const p = placeStarPanel({ x: 560, y: 100 }, SIZE, BOUNDS)
    expect(p.side).toBe('left')
    expect(p.vertical).toBe('below')
  })

  it('窄舞台里左侧位置被夹回边距内', () => {
    const p = placeStarPanel({ x: 100, y: 200 }, SIZE, { w: 300, h: 400 })
    expect(p.left).toBe(PANEL_MARGIN)
    expect(p.left + SIZE.w).toBeLessThanOrEqual(300 - PANEL_MARGIN)
  })

  it('星落到舞台下缘之外时，弹窗夹在舞台内而不是跟着出去', () => {
    const p = placeStarPanel({ x: 200, y: 450 }, SIZE, BOUNDS)
    expect(p.top + SIZE.h).toBeLessThanOrEqual(BOUNDS.h - PANEL_MARGIN)
    expect(p.top).toBeGreaterThanOrEqual(PANEL_MARGIN)
  })

  it('夹取后若压住星，整体翻到对侧保证星露出来', () => {
    /* 又窄又矮的舞台 + 96px 高度下限：初始摆位被夹到星身上，必须翻向 */
    const anchor = { x: 150, y: 110 }
    const size = { w: 200, h: 96 }
    const bounds = { w: 300, h: 200 }
    const p = placeStarPanel(anchor, size, bounds)
    expect(coversStar(anchor, p, size)).toBe(false)
    expect(p.side).toBe('right')
    expect(p.vertical).toBe('above')
  })

  it('gap 为 0 时星正好压在边框上，摆位翻向对侧、连接线缩到星上', () => {
    const anchor = { x: 100, y: 100 }
    const p = placeStarPanel(anchor, { w: 50, h: 50 }, { w: 400, h: 400 }, 0, 0)
    expect(p.side).toBe('left')
    expect(p.vertical).toBe('below')
    expect(p.attach).toEqual(anchor)
  })

  it('连接线端点落在弹窗边框上离星最近的位置', () => {
    const anchor = { x: 200, y: 200 }
    const p = placeStarPanel(anchor, SIZE, BOUNDS)
    expect(p.attach).toEqual({ x: p.left, y: p.top + SIZE.h })
  })

  it('同一输入永远同一摆位', () => {
    const anchor = { x: 313, y: 177 }
    expect(placeStarPanel(anchor, SIZE, BOUNDS)).toEqual(placeStarPanel(anchor, SIZE, BOUNDS))
  })

  it('弹窗比舞台还大时不抛错，尽力夹在边距上', () => {
    const p = placeStarPanel({ x: 50, y: 50 }, SIZE, { w: 100, h: 100 })
    expect(Number.isFinite(p.left)).toBe(true)
    expect(Number.isFinite(p.top)).toBe(true)
    expect(p.left).toBe(PANEL_MARGIN)
    expect(p.top).toBe(PANEL_MARGIN)
  })

  it('桌面与手机尺寸下扫一遍锚点：弹窗始终在舞台内且不盖住星', () => {
    const cases = [
      { bounds: BOUNDS, size: SIZE },
      { bounds: { w: 360, h: 640 }, size: { w: 300, h: 150 } },
    ]
    for (const { bounds, size } of cases) {
      for (let x = -40; x <= bounds.w + 40; x += 40) {
        for (let y = -40; y <= bounds.h + 40; y += 40) {
          const anchor = { x, y }
          const p = placeStarPanel(anchor, size, bounds)
          expect(p.left).toBeGreaterThanOrEqual(PANEL_MARGIN)
          expect(p.top).toBeGreaterThanOrEqual(PANEL_MARGIN)
          expect(p.left + size.w).toBeLessThanOrEqual(bounds.w - PANEL_MARGIN)
          expect(p.top + size.h).toBeLessThanOrEqual(bounds.h - PANEL_MARGIN)
          expect(coversStar(anchor, p, size)).toBe(false)
        }
      }
    }
  })
})