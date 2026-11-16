import { cn } from '@/utils/cn'

export interface ToggleProps {
  checked: boolean
  onChange: (value: boolean) => void
  /** 无障碍名称。开关没有可见文字，必须提供。 */
  label: string
  disabled?: boolean
}

/** 开关。按钮本体保持 44px 命中区，轨道与滑块为内部视觉元素。 */
export function Toggle({ checked, onChange, label, disabled = false }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      data-sound="none"
      onClick={() => onChange(!checked)}
      className={cn(
        'grid h-11 w-14 place-items-center rounded-full',
        'transition-opacity duration-200 ease-soft',
        'active:scale-[0.96] disabled:pointer-events-none disabled:opacity-45',
      )}
    >
      <span
        className={cn(
          'relative flex h-7 w-12 items-center rounded-full p-0.5',
          'transition-colors duration-200 ease-soft',
          checked
            ? 'bg-linear-to-r from-iris-500 to-astro-500 shadow-glow-iris'
            : 'bg-white/12',
        )}
      >
        <span
          className={cn(
            'size-6 rounded-full bg-ink-50 shadow-card',
            'transition-transform duration-200 ease-soft',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </span>
    </button>
  )
}
