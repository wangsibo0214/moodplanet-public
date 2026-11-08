import { ChevronLeft, ChevronRight } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import logoUrl from '@/assets/logo.svg'
import { NAV_ITEMS } from '@/config/navigation'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { cn } from '@/utils/cn'

/** 桌面端侧边导航，可折叠为纯图标栏。 */
export function SideNav() {
  const collapsed = useSettingsStore((s) => s.navCollapsed)
  const toggleNav = useSettingsStore((s) => s.toggleNav)

  return (
    <aside
      className={cn(
        'sticky top-0 z-20 hidden h-dvh shrink-0 flex-col',
        'border-r border-hairline bg-cosmos-950/50 backdrop-blur-2xl',
        'transition-[width] duration-300 ease-soft lg:flex',
        collapsed ? 'w-[78px]' : 'w-[252px]',
      )}
    >
      <div className={cn('flex h-16 items-center gap-3', collapsed ? 'justify-center px-2' : 'px-5')}>
        <img src={logoUrl} alt="" className="size-8 shrink-0" />
        {!collapsed && (
          <span className="flex flex-col leading-tight">
            <span className="font-display text-[15px] font-semibold text-ink-50">
              MoodPlanet
            </span>
            <span className="text-[11px] text-ink-500">情绪星球</span>
          </span>
        )}
      </div>

      <nav aria-label="主导航" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  'group relative flex min-h-11 items-center gap-3 rounded-md px-3',
                  'text-sm text-ink-300 transition-colors duration-200 ease-soft',
                  'hover:bg-white/6 hover:text-ink-50',
                  'active:scale-[0.98]',
                  isActive && 'bg-iris-400/12 text-ink-50 ring-1 ring-iris-400/25 ring-inset',
                  collapsed && 'justify-center px-0',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    aria-hidden
                    className={cn(
                      'absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-r-full',
                      'bg-iris-400 transition-opacity duration-200',
                      isActive ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <Icon
                    className={cn('size-5 shrink-0', isActive && 'text-iris-300')}
                    strokeWidth={1.75}
                  />
                  {!collapsed && <span className="truncate font-medium">{item.label}</span>}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className={cn('border-t border-hairline p-3', collapsed && 'flex justify-center')}>
        <button
          type="button"
          onClick={toggleNav}
          aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
          aria-expanded={!collapsed}
          className={cn(
            'flex min-h-9 items-center gap-2 rounded-md px-2.5 text-xs text-ink-500',
            'transition-colors duration-200 ease-soft hover:bg-white/6 hover:text-ink-300',
            'active:scale-[0.97]',
          )}
        >
          {collapsed ? (
            <ChevronRight className="size-4" strokeWidth={1.75} />
          ) : (
            <>
              <ChevronLeft className="size-4" strokeWidth={1.75} />
              <span>收起侧边栏</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
