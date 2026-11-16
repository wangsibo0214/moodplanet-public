import { cn } from '@/utils/cn'

export interface ChoiceOption<T extends string> {
  value: T
  label: string
}

export interface ChoiceGroupProps<T extends string> {
  value: T
  options: readonly ChoiceOption<T>[]
  onChange: (value: T) => void
  /** 作为 radiogroup 的无障碍名称 */
  label: string
  className?: string
}

/** 单选分段控件。 */
export function ChoiceGroup<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: ChoiceGroupProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        'inline-flex h-12 items-center gap-1 rounded-md bg-white/6 p-1',
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            data-sound="none"
            onClick={() => onChange(option.value)}
            className={cn(
              'h-10 min-w-14 rounded-sm px-3 text-sm font-medium',
              'transition-[background-color,color,box-shadow,transform] duration-200 ease-soft',
              'active:scale-[0.97]',
              selected
                ? 'bg-iris-400/22 text-ink-50 shadow-inset-hairline ring-1 ring-iris-400/30 ring-inset'
                : 'text-ink-500 hover:text-ink-300',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
