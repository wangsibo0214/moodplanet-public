import { useRef } from 'react'

import { MOODS } from '@/features/mood/mood.config'
import type { MoodKey } from '@/types/mood'
import { cn } from '@/utils/cn'

interface MoodPickerProps {
  value: MoodKey | null
  onChange: (mood: MoodKey) => void
  /** 关联的标题元素 id，供 aria-labelledby 使用 */
  labelledBy?: string
}

/**
 * 心情选择器：radiogroup 语义 + 方向键漫游焦点。
 * 六种情绪共用同一明度与饱和度，选中态只靠色点与描边区分，
 * 不靠「红色 = 不好」这类暗示。
 */
export function MoodPicker({ value, onChange, labelledBy }: MoodPickerProps) {
  const buttons = useRef<Array<HTMLButtonElement | null>>([])

  const moveTo = (from: number, step: number) => {
    const next = (from + step + MOODS.length) % MOODS.length
    onChange(MOODS[next].key)
    buttons.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6"
    >
      {MOODS.map((mood, index) => {
        const selected = value === mood.key
        return (
          <button
            key={mood.key}
            ref={(el) => {
              buttons.current[index] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            /* 未选中时只让第一个候选可 tab 进来，符合 radiogroup 的漫游焦点约定 */
            tabIndex={selected || (value === null && index === 0) ? 0 : -1}
            onClick={() => onChange(mood.key)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                event.preventDefault()
                moveTo(index, 1)
              } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                event.preventDefault()
                moveTo(index, -1)
              } else if (event.key === 'Home') {
                event.preventDefault()
                moveTo(index, -index)
              } else if (event.key === 'End') {
                event.preventDefault()
                moveTo(index, MOODS.length - 1 - index)
              }
            }}
            className={cn(
              'flex min-h-[4.5rem] cursor-pointer flex-col gap-1 rounded-lg px-3 py-2.5 text-left',
              'transition-[transform,box-shadow,background-color,border-color] duration-200 ease-soft',
              'hover:-translate-y-0.5 active:scale-[0.98]',
              selected && '-translate-y-0.5 shadow-float',
            )}
            style={{
              backgroundColor: selected ? `${mood.hex}24` : 'rgb(255 255 255 / 0.03)',
              border: `1px solid ${selected ? `${mood.hex}80` : 'rgb(255 255 255 / 0.09)'}`,
            }}
          >
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-2.5 rounded-full"
                style={{ backgroundColor: mood.hex }}
              />
              <span
                className={cn('text-sm font-semibold', selected ? 'text-ink-50' : mood.accentClass)}
              >
                {mood.label}
              </span>
            </span>
            <span className="text-xs text-ink-500">{mood.hint}</span>
          </button>
        )
      })}
    </div>
  )
}
