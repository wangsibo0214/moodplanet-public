import { useMemo, useState } from 'react'

import {
  clampPage,
  collectMonths,
  EMPTY_QUERY,
  filterItems,
  isFiltering,
  PAGE_SIZE,
  pageCountOf,
  paginate,
  type ListQueryState,
  type TimeRange,
} from '@/utils/listQuery'

interface ListQueryOptions<T> {
  items: T[]
  /** 模块级稳定函数，避免每次渲染重算过滤 */
  getFields: (item: T) => string[]
  getTime: (item: T) => string
  now: Date
  pageSize?: number
}

/**
 * 列表检索 + 分页的临时 UI 状态。不落盘、不新增持久化字段。
 * 任一过滤条件变化都回到第 1 页；页码按当前匹配数夹取，删记录后不会停在空页。
 */
export function useListQuery<T>({
  items,
  getFields,
  getTime,
  now,
  pageSize = PAGE_SIZE,
}: ListQueryOptions<T>) {
  const [state, setState] = useState<ListQueryState>(EMPTY_QUERY)
  const [page, setPage] = useState(1)

  const months = useMemo(() => collectMonths(items, getTime), [items, getTime])
  const matched = useMemo(
    () => filterItems(items, state, getFields, getTime, now),
    [items, state, getFields, getTime, now],
  )
  const pageCount = pageCountOf(matched.length, pageSize)
  const safePage = clampPage(page, pageCount)
  const pageItems = useMemo(
    () => paginate(matched, safePage, pageSize),
    [matched, safePage, pageSize],
  )

  const patch = (next: Partial<ListQueryState>) => {
    setState((prev) => ({ ...prev, ...next }))
    setPage(1)
  }

  return {
    query: state.query,
    range: state.range,
    month: state.month,
    months,
    page: safePage,
    pageCount,
    total: items.length,
    matchedCount: matched.length,
    pageItems,
    filtering: isFiltering(state),
    onQuery: (query: string) => patch({ query }),
    onRange: (range: TimeRange) => patch({ range }),
    onMonth: (month: string) => patch({ month }),
    onPage: setPage,
    onReset: () => {
      setState(EMPTY_QUERY)
      setPage(1)
    },
  }
}