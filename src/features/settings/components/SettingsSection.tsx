import type { ReactNode } from 'react'

import { cn } from '@/utils/cn'

export interface SettingsSectionProps {
  title: string
  description?: string
  children: ReactNode
  className?: string
}

/** 设置页的分组容器：标题区 + 以细线分隔的若干行。 */
export function SettingsSection({
  title,
  description,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <section className={cn('glass-panel overflow-hidden', className)}>
      <header className="border-b border-hairline px-5 py-4 sm:px-6">
        <h2 className="text-base font-semibold text-ink-50">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-relaxed text-ink-500">{description}</p>
        ) : null}
      </header>
      <div className="divide-y divide-hairline">{children}</div>
    </section>
  )
}
