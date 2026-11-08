import {
  Archive,
  Hourglass,
  NotebookPen,
  Orbit,
  Settings,
  Star,
} from 'lucide-react'

import type { NavItem } from '@/types/navigation'

/** 全站主导航。顺序即侧边栏与移动端底栏的展示顺序。 */
export const NAV_ITEMS: NavItem[] = [
  {
    to: '/',
    label: '星球主页',
    description: '你的情绪星球总览',
    icon: Orbit,
    showInMobileNav: true,
  },
  {
    to: '/record',
    label: '心情记录',
    description: '写下此刻的感受',
    icon: NotebookPen,
    showInMobileNav: true,
  },
  {
    to: '/memories',
    label: '记忆星',
    description: '被你点亮的时刻',
    icon: Star,
    showInMobileNav: true,
  },
  {
    to: '/capsule',
    label: '时光胶囊',
    description: '写给未来的一句话',
    icon: Hourglass,
    showInMobileNav: true,
  },
  {
    to: '/archive',
    label: '情绪档案',
    description: '回看情绪的轨迹',
    icon: Archive,
    showInMobileNav: true,
  },
  {
    to: '/settings',
    label: '设置',
    description: '偏好、外观与数据',
    icon: Settings,
  },
]

export const MOBILE_NAV_ITEMS = NAV_ITEMS.filter((item) => item.showInMobileNav)
