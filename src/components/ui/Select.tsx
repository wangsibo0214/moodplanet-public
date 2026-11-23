import { ChevronDown } from 'lucide-react'
import type { SelectHTMLAttributes } from 'react'

import { cn } from '@/utils/cn'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
}

/** 原生下拉，零依赖、键盘可达。选项底色压成宇宙深底，避免深色页面里白底白字。 */
export function Select({ label, className, children, ...props }: SelectProps) {
  return (
    <div className={cn('relative min-w-0 shrink-0', className)}>
      <select
        aria-label={label}
        className="h-10 w-full cursor-pointer appearance-none rounded-md bg-white/4 pr-8 pl-3 text-sm text-ink-100 ring-1 ring-hairline ring-inset transition-colors duration-200 ease-soft hover:ring-hairline-strong focus:ring-iris-300/60 focus:outline-none"
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-ink-500"
        strokeWidth={1.9}
        aria-hidden
      />
    </div>
  )
}