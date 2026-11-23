import { describe, expect, it } from 'vitest'

import { MOODS } from '@/features/mood/mood.config'

/**
 * 色带把六段并排画在同一条带上，相邻段只靠颜色区分。
 * 用 CIE76 ΔE 锁住两两可分辨度，防止以后加色或调色把某一对压回「看起来同色」。
 */

const toLab = (hex: string): [number, number, number] => {
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const lin = rgb.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  const [r, g, b] = lin
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  const fx = f((0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047)
  const fy = f(0.2126729 * r + 0.7151522 * g + 0.072175 * b)
  const fz = f((0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883)
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

const deltaE76 = (a: string, b: string) => {
  const [l1, a1, b1] = toLab(a)
  const [l2, a2, b2] = toLab(b)
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2)
}

const hexOf = (key: string) => MOODS.find((m) => m.key === key)!.hex

const pairs = MOODS.flatMap((m, i) =>
  MOODS.slice(i + 1).map((n) => ({
    name: `${m.label} / ${n.label}`,
    value: deltaE76(m.hex, n.hex),
  })),
)

describe('心情色板可分辨度', () => {
  it('六种心情两两 ΔE76 均不低于 25', () => {
    const worst = pairs.reduce((a, b) => (b.value < a.value ? b : a))
    expect(worst.value, `最接近的一对是 ${worst.name}`).toBeGreaterThanOrEqual(25)
  })

  it('疲惫与焦虑在色带上相邻，必须拉得开（ΔE76 不低于 30）', () => {
    expect(deltaE76(hexOf('tired'), hexOf('anxious'))).toBeGreaterThanOrEqual(30)
  })

  it('每种心情都保有家族彩度，不允许把某一种调成灰来区分', () => {
    // 上一版把疲惫压成灰紫（C* 21.8，家族其余 35–55），色带上那段看起来像阴影缺陷而不是一种心情。
    const chromaOf = (hex: string) => {
      const [, a, b] = toLab(hex)
      return Math.hypot(a, b)
    }
    const dullest = MOODS.map((m) => ({ label: m.label, value: chromaOf(m.hex) })).reduce((a, b) =>
      b.value < a.value ? b : a,
    )
    expect(dullest.value, `最灰的是 ${dullest.label}`).toBeGreaterThanOrEqual(30)
  })

  it('明度仍在一档内，避免某种心情看起来像错误提示', () => {
    const lightness = MOODS.map((m) => toLab(m.hex)[0])
    expect(Math.max(...lightness) - Math.min(...lightness)).toBeLessThanOrEqual(24)
  })
})
