import { cn } from '@/utils/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline'
export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: cn(
    'bg-linear-to-br from-iris-500 to-astro-500 text-ink-50',
    'shadow-glow-iris hover:brightness-110 hover:shadow-float',
    'active:brightness-95',
  ),
  secondary: cn(
    'glass-panel rounded-md text-ink-100',
    'hover:border-hairline-strong hover:text-ink-50 hover:shadow-float',
    'active:bg-white/4',
  ),
  outline: cn(
    'border border-hairline-strong text-ink-300',
    'hover:border-iris-300/60 hover:text-ink-50',
    'active:bg-white/4',
  ),
  ghost: cn('text-ink-300 hover:bg-white/6 hover:text-ink-50', 'active:bg-white/10'),
}

/* md / lg 高度 >= 44px，满足最小触控目标尺寸 */
const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 gap-1.5 rounded-sm px-3.5 text-sm',
  md: 'h-11 gap-2 rounded-md px-5 text-sm',
  lg: 'h-12 gap-2 rounded-md px-6 text-base',
}

/**
 * 按钮样式。与 <Button> 分开存放，一是让 <Link> 能复用同一套外观
 * （避免把 <a> 嵌进 <button> 造成无效 HTML），二是保证本文件只导出组件、
 * 不干扰 React Fast Refresh。
 */
export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
): string {
  return cn(
    'inline-flex shrink-0 items-center justify-center font-medium',
    'transition-[transform,box-shadow,background-color,border-color,filter,color]',
    'duration-200 ease-soft select-none',
    'active:scale-[0.97]',
    'disabled:pointer-events-none disabled:opacity-45',
    VARIANTS[variant],
    SIZES[size],
    className,
  )
}
