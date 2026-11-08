import type { HTMLAttributes } from 'react'

import { cn } from '@/utils/cn'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** 传入 MOODS 中的 surfaceClass / ringClass / accentClass 即可得到情绪色徽标 */
  tone?: 'neutral' | 'iris' | 'astro' | 'mint' | 'butter' | 'blush'
}

const TONES = {
  neutral: 'bg-white/6 text-ink-300 ring-hairline-strong',
  iris: 'bg-iris-400/12 text-iris-300 ring-iris-400/30',
  astro: 'bg-astro-400/12 text-astro-300 ring-astro-400/30',
  mint: 'bg-mint-400/12 text-mint-300 ring-mint-400/30',
  butter: 'bg-butter-400/12 text-butter-300 ring-butter-400/30',
  blush: 'bg-blush-400/12 text-blush-300 ring-blush-400/30',
} as const

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1',
        'text-xs font-medium ring-1 ring-inset',
        TONES[tone],
        className,
      )}
      {...props}
    />
  )
}
