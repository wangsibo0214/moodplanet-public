import type { ComponentType, SVGProps } from 'react'

/** 导航项。icon 用组件引用，避免在配置里写 JSX。 */
export interface NavItem {
  to: string
  label: string
  /** 一句话说明，用于侧边栏副标题与移动端无障碍描述 */
  description: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  /** 是否在移动端底部导航展示（最多 5 项，含更多入口） */
  showInMobileNav?: boolean
}
