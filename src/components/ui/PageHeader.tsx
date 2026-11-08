import type { ComponentType, ReactNode, SVGProps } from 'react'

import { cn } from '@/utils/cn'

export interface PageHeaderProps {
  title: string
  description?: string
  icon?: ComponentType<SVGProps<SVGSVGElement>>
  actions?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="flex items-start gap-3.5">
        {Icon ? (
          <span
            aria-hidden
            className={cn(
              'mt-0.5 grid size-11 shrink-0 place-items-center',
              'rounded-lg bg-iris-400/12 text-iris-300 ring-1 ring-iris-400/25 ring-inset',
            )}
          >
            <Icon className="size-5" strokeWidth={1.75} />
          </span>
        ) : null}
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-ink-50 sm:text-[1.75rem]">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-sm leading-relaxed text-ink-500">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  )
}
