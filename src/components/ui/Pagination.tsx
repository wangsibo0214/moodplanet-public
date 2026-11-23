import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '@/utils/cn'
import { pageTokens } from '@/utils/listQuery'

import { buttonClasses } from './buttonStyles'

interface PaginationProps {
  page: number
  pageCount: number
  onChange: (page: number) => void
  className?: string
}

/** 分页底栏。只有一页时不渲染；页码窗口化，当前页用主色高亮。 */
export function Pagination({ page, pageCount, onChange, className }: PaginationProps) {
  if (pageCount <= 1) return null
  const tokens = pageTokens(page, pageCount)

  return (
    <nav
      aria-label="分页"
      className={cn('mt-4 flex flex-wrap items-center justify-center gap-1.5', className)}
    >
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="上一页"
        className={buttonClasses('outline', 'sm', 'h-9 w-9 px-0')}
      >
        <ChevronLeft className="size-4" strokeWidth={2} aria-hidden />
      </button>

      {tokens.map((token, index) =>
        token === 'gap' ? (
          <span key={`gap-${index}`} aria-hidden className="px-0.5 text-xs text-ink-700">
            …
          </span>
        ) : (
          <button
            key={token}
            type="button"
            onClick={() => onChange(token)}
            aria-label={`第 ${token} 页`}
            aria-current={token === page ? 'page' : undefined}
            className={buttonClasses(
              token === page ? 'primary' : 'ghost',
              'sm',
              'h-9 min-w-9 px-2 font-display',
            )}
          >
            {token}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= pageCount}
        aria-label="下一页"
        className={buttonClasses('outline', 'sm', 'h-9 w-9 px-0')}
      >
        <ChevronRight className="size-4" strokeWidth={2} aria-hidden />
      </button>
    </nav>
  )
}