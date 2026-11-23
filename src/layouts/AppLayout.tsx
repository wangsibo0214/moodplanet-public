import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { StarfieldBackground } from '@/components/background/StarfieldBackground'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useMoodStore } from '@/stores/useMoodStore'
import { cn } from '@/utils/cn'

import { MobileNav } from './MobileNav'
import { SideNav } from './SideNav'
import { TopBar } from './TopBar'

/** 全站外壳：固定星空背景 + 侧边栏（桌面）/ 顶栏与底栏（移动）+ 内容区。 */
export function AppLayout() {
  const { pathname } = useLocation()
  const hydrate = useMoodStore((s) => s.hydrate)
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const calm = prefersReducedMotion

  /* 路由切换时内容高度会突变，需要手动复位滚动位置 */
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])

  /* 全站只在挂载时读一次本地记录；store 内部有状态守卫，重复调用会直接返回 */
  useEffect(() => {
    void hydrate()
  }, [hydrate])

  return (
    <div className="relative min-h-dvh">
      <StarfieldBackground />

      <div className="relative z-10 flex min-h-dvh">
        <SideNav />

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />

          <main
            id="main"
            className={cn(
              'mx-auto w-full max-w-6xl flex-1',
              'px-4 pt-5 pb-24 sm:px-6 lg:px-10 lg:pt-10 lg:pb-14',
            )}
          >
            {/* key 随路由变化，切换页面时重放一次短进入动画 */}
            <div key={pathname} className={cn(!calm && 'page-enter')}>
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      <MobileNav />
    </div>
  )
}
