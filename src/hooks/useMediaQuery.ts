import { useCallback, useSyncExternalStore } from 'react'

/**
 * 订阅一条 CSS 媒体查询，返回实时匹配结果。
 * 用 useSyncExternalStore 而非 effect + setState，避免多一次无谓渲染。
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onStoreChange)
      return () => list.removeEventListener('change', onStoreChange)
    },
    [query],
  )

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query])

  return useSyncExternalStore(subscribe, getSnapshot)
}
