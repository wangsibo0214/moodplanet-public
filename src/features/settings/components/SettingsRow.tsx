import type { ReactNode } from 'react'

export interface SettingsRowProps {
  label: string
  description?: string
  control: ReactNode
}

/** 设置项单行：左侧说明，右侧控件。窄屏时自动改为上下堆叠。 */
export function SettingsRow({ label, description, control }: SettingsRowProps) {
  return (
    <div className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-ink-100">{label}</span>
        {description ? (
          <span className="text-xs leading-relaxed text-ink-500">{description}</span>
        ) : null}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  )
}
