import { Settings } from 'lucide-react'
import { Link } from 'react-router-dom'

import logoUrl from '@/assets/logo.svg'
import { cn } from '@/utils/cn'

/** 移动端顶栏：品牌 + 设置入口（桌面端由侧边栏承担）。 */
export function TopBar() {
  return (
    <header
      className={cn(
        'sticky top-0 z-20 flex h-14 items-center justify-between gap-3 px-4',
        'border-b border-hairline bg-cosmos-950/70 backdrop-blur-2xl lg:hidden',
      )}
    >
      <Link to="/" className="flex items-center gap-2.5 active:scale-[0.97]">
        <img src={logoUrl} alt="" className="size-7" />
        <span className="font-display text-sm font-semibold text-ink-50">MoodPlanet</span>
      </Link>

      <Link
        to="/settings"
        aria-label="设置"
        className={cn(
          'grid size-11 place-items-center rounded-md text-ink-300',
          'transition-colors duration-200 ease-soft hover:bg-white/6 hover:text-ink-50',
          'active:scale-[0.95]',
        )}
      >
        <Settings className="size-5" strokeWidth={1.75} />
      </Link>
    </header>
  )
}
