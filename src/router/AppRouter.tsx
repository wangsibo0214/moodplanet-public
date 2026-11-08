import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'

import { PageLoader } from '@/components/ui/PageLoader'
import { AppLayout } from '@/layouts'

const PlanetPage = lazy(() => import('@/pages/PlanetPage'))
const MoodRecordPage = lazy(() => import('@/pages/MoodRecordPage'))
const MemoryStarPage = lazy(() => import('@/pages/MemoryStarPage'))
const TimeCapsulePage = lazy(() => import('@/pages/TimeCapsulePage'))
const EmotionArchivePage = lazy(() => import('@/pages/EmotionArchivePage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

/** 全站路由。每个页面独立分包，首屏只加载外壳与主页。 */
export function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<PlanetPage />} />
          <Route path="record" element={<MoodRecordPage />} />
          <Route path="memories" element={<MemoryStarPage />} />
          <Route path="capsule" element={<TimeCapsulePage />} />
          <Route path="archive" element={<EmotionArchivePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
