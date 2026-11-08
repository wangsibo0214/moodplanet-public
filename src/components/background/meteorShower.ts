import type { CSSProperties } from 'react'

import { createRandom } from '@/utils/random'

export interface Meteor {
  top: number
  left: number
  length: number
  angle: number
  opacity: number
  delay: number
  duration: number
}

type MeteorStyle = CSSProperties & Record<`--meteor-${string}`, string>

export function meteorCount(isMobile: boolean): number {
  return isMobile ? 2 : 3
}

export function shouldRenderMeteors(enabled: boolean, calm: boolean): boolean {
  return enabled && !calm
}

export function buildMeteors(count: number): Meteor[] {
  const random = createRandom(20261108)
  return Array.from({ length: count }, () => ({
    top: -8 + random() * 38,
    left: 28 + random() * 76,
    length: 76 + random() * 44,
    angle: 135 + random() * 5,
    opacity: 0.35 + random() * 0.2,
    delay: random() * 12,
    duration: 9 + random() * 3,
  }))
}

export function meteorStyle(meteor: Meteor): MeteorStyle {
  return {
    top: `${meteor.top}%`,
    left: `${meteor.left}%`,
    opacity: 0,
    animationDelay: `${meteor.delay}s`,
    animationDuration: `${meteor.duration}s`,
    '--meteor-length': `${meteor.length}px`,
    '--meteor-angle': `${meteor.angle}deg`,
    '--meteor-opacity': `${meteor.opacity}`,
    '--meteor-travel-x': '-22vw',
    '--meteor-travel-y': '22vw',
  }
}