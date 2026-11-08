import { NavLink } from 'react-router-dom'

import { MOBILE_NAV_ITEMS } from '@/config/navigation'
import { cn } from '@/utils/cn'

/** 移动端底部导航。仅展示 5 个高频入口，设置走顶栏。 */
export function MobileNav() {
  return (
    <nav
      aria-label="移动端导航"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-cosmos-950/85 backdrop-blur-2xl lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-lg items-stretch">
        {MOBILE_NAV_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.to === '/'}
                aria-label={item.label}
                title={item.description}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-14 flex-col items-center justify-center gap-1',
                    'text-[11px] transition-colors duration-200 ease-soft',
                    isActive ? 'text-iris-300' : 'text-ink-500 hover:text-ink-300',
                  )
                }
              >
                <Icon className="size-5" strokeWidth={1.75} />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
