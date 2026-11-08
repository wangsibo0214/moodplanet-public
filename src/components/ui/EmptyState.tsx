import type { ComponentType, ReactNode, SVGProps } from 'react'

import { cn } from '@/utils/cn'

export interface EmptyStateProps {
  icon?: ComponentType<SVGProps<SVGSVGElement>>
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

/** 空数据占位。第一阶段各页面用它标注「留待后续实现」的区域。 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-card px-6 py-12 text-center',
        'border border-dashed border-hairline-strong bg-white/2',
        className,
      )}
    >
      {Icon ? (
        <span
          aria-hidden
          className="grid size-12 place-items-center rounded-full bg-iris-400/10 text-iris-300"
        >
          <Icon className="size-5.5" strokeWidth={1.6} />
        </span>
      ) : null}
      <p className="font-display text-sm font-semibold text-ink-100">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm leading-relaxed text-ink-500">{description}</p>
      ) : null}
      {action}
    </div>
  )
}
