import { Search, X } from 'lucide-react'

import { cn } from '@/utils/cn'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  label: string
  placeholder?: string
  className?: string
}

/** 检索框。外观沿用 RecordForm 输入控件：bg-white/4 + hairline 描边 + iris 焦点环。 */
export function SearchInput({
  value,
  onChange,
  label,
  placeholder = '搜索关键词或时间…',
  className,
}: SearchInputProps) {
  return (
    <div className={cn('relative min-w-0 flex-1', className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-700"
        strokeWidth={1.9}
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="h-10 w-full rounded-md bg-white/4 pr-9 pl-9 text-sm text-ink-50 ring-1 ring-hairline ring-inset transition-colors duration-200 ease-soft placeholder:text-ink-700 hover:ring-hairline-strong focus:ring-iris-300/60 focus:outline-none [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="清空搜索词"
          className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-ink-500 transition-colors duration-200 ease-soft hover:bg-white/8 hover:text-ink-100"
        >
          <X className="size-3.5" strokeWidth={2} aria-hidden />
        </button>
      ) : null}
    </div>
  )
}