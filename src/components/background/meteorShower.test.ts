import { describe, expect, it } from 'vitest'

import {
  buildMeteors,
  meteorCount,
  meteorStyle,
  shouldRenderMeteors,
} from './meteorShower'

describe('meteor shower', () => {
  it('仅在开关开启且未降低动效时显示流星', () => {
    expect(shouldRenderMeteors(false, false)).toBe(false)
    expect(shouldRenderMeteors(true, true)).toBe(false)
    expect(shouldRenderMeteors(false, true)).toBe(false)
    expect(shouldRenderMeteors(true, false)).toBe(true)
  })

  it('桌面最多三条、移动端最多两条', () => {
    expect(meteorCount(false)).toBe(3)
    expect(meteorCount(true)).toBe(2)
  })

  it('使用固定种子保持刷新前后的分布一致', () => {
    expect(buildMeteors(3)).toEqual(buildMeteors(3))
  })

  it('流星从右上向左下移动且每次划过留有间歇', () => {
    for (const meteor of buildMeteors(3)) {
      expect(meteor.top).toBeGreaterThanOrEqual(-8)
      expect(meteor.top).toBeLessThan(30)
      expect(meteor.left).toBeGreaterThanOrEqual(28)
      expect(meteor.left).toBeLessThan(104)
      expect(meteor.angle).toBeGreaterThanOrEqual(135)
      expect(meteor.angle).toBeLessThan(140)
      expect(meteor.duration).toBeGreaterThanOrEqual(9)
      expect(meteor.duration).toBeLessThan(12)
    }
  })

  it('将动画参数限定在 transform 与 opacity 所需的 CSS 变量中', () => {
    const meteor = buildMeteors(1)[0]
    const style = meteorStyle(meteor)

    expect(style).toMatchObject({
      opacity: 0,
      '--meteor-travel-x': '-22vw',
      '--meteor-travel-y': '22vw',
      '--meteor-length': `${meteor.length}px`,
      '--meteor-angle': `${meteor.angle}deg`,
      '--meteor-opacity': `${meteor.opacity}`,
    })
  })
})