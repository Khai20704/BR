import { House, Store, History, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  readonly label: string
  readonly path: string
  readonly icon: LucideIcon
}

export interface NavGroup {
  readonly title: string
  readonly items: readonly NavItem[]
}

/** The four operator-facing destinations. Batch creation starts from Home. */
export const navGroups: readonly NavGroup[] = [
  {
    title: 'Workspace',
    items: [
      { label: 'Home', path: '/', icon: House },
      { label: 'My Shop', path: '/shop', icon: Store },
      { label: 'Drying History', path: '/history', icon: History },
      { label: 'Settings', path: '/settings', icon: Settings },
    ],
  },
]

export const navItems: readonly NavItem[] = navGroups.flatMap(
  (group) => group.items,
)

export function findNavItem(pathname: string): NavItem {
  return (
    navItems.find((item) => item.path === pathname) ??
    navItems[0] ?? { label: 'Home', path: '/', icon: House }
  )
}
