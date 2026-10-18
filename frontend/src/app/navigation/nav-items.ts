import {
  Boxes,
  Cpu,
  Gauge,
  Layers,
  LayoutDashboard,
  RefreshCw,
  Sparkles,
  Thermometer,
} from 'lucide-react'
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

/**
 * The eight workspace destinations. Labels are the accessible names of the
 * sidebar links and must stay stable — navigation tests match on them.
 */
export const navGroups: readonly NavGroup[] = [
  {
    title: 'Workspace',
    items: [
      { label: 'Overview', path: '/', icon: LayoutDashboard },
      { label: 'Site setup', path: '/site', icon: Layers },
      { label: 'Batch setup', path: '/batch', icon: Boxes },
    ],
  },
  {
    title: 'Thermal intelligence',
    items: [
      { label: 'Thermal profile', path: '/thermal-profile', icon: Thermometer },
      { label: 'Thermal digital twin', path: '/simulation', icon: Cpu },
    ],
  },
  {
    title: 'Decision intelligence',
    items: [
      { label: 'AI planning', path: '/ai-planning', icon: Sparkles },
      { label: 'Adaptive replanning', path: '/replanning', icon: RefreshCw },
      { label: 'Benchmark', path: '/benchmark', icon: Gauge },
    ],
  },
]

export const navItems: readonly NavItem[] = navGroups.flatMap(
  group => group.items,
)

export function findNavItem(pathname: string): NavItem {
  return (
    navItems.find(item => item.path === pathname) ??
    navItems[0] ?? { label: 'Overview', path: '/', icon: LayoutDashboard }
  )
}
