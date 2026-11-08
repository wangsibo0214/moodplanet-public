import { useEffect } from 'react'

const BASE_TITLE = 'MoodPlanet'

/** 统一页面标题格式：「页面名 · MoodPlanet」。 */
export function useDocumentTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} · ${BASE_TITLE}` : `${BASE_TITLE} · 情绪星球`
  }, [title])
}
