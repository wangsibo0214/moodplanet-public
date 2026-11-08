import { TAGS } from '@/features/mood/mood.config'
import type { TagKey } from '@/types/mood'
import { cn } from '@/utils/cn'

interface TagPickerProps {
  value: TagKey[]
  onChange: (tags: TagKey[]) => void
  labelledBy?: string
}

/** 标签多选。标签只影响「自我关怀建议」的兜底句，不参与关键词判断。 */
export function TagPicker({ value, onChange, labelledBy }: TagPickerProps) {
  const toggle = (key: TagKey) => {
    onChange(value.includes(key) ? value.filter((tag) => tag !== key) : [...value, key])
  }

  return (
    <ul aria-labelledby={labelledBy} className="flex flex-wrap gap-2">
      {TAGS.map((tag) => {
        const on = value.includes(tag.key)
        return (
          <li key={tag.key}>
            <button
              type="button"
              aria-pressed={on}
              onClick={() => toggle(tag.key)}
              className={cn(
                'h-11 cursor-pointer rounded-full px-4 text-sm transition-colors duration-200 ease-soft',
                'active:scale-[0.97]',
                on
                  ? 'bg-iris-400/20 font-medium text-iris-100 ring-1 ring-iris-300/60 ring-inset'
                  : 'bg-white/4 text-ink-300 ring-1 ring-hairline ring-inset hover:text-ink-50 hover:ring-hairline-strong',
              )}
            >
              {tag.label}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
