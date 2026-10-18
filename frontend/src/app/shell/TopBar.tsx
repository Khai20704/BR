import { Bell, ChevronRight, Menu, X } from 'lucide-react'
import type { RefObject } from 'react'
import type { NavItem } from '../navigation/nav-items'

export function TopBar({
  current,
  navOpen,
  onToggleNav,
  menuButtonRef,
  navId,
}: {
  current: NavItem
  navOpen: boolean
  onToggleNav: () => void
  menuButtonRef: RefObject<HTMLButtonElement | null>
  navId: string
}) {
  return (
    <header className="topbar">
      <button
        type="button"
        className="menu-button"
        ref={menuButtonRef}
        aria-expanded={navOpen}
        aria-controls={navId}
        aria-label={navOpen ? 'Close menu' : 'Open menu'}
        onClick={onToggleNav}
      >
        {navOpen ? <X size={17} /> : <Menu size={17} />}
      </button>

      <div className="breadcrumb">
        <span>Workspace</span>
        <ChevronRight size={13} aria-hidden="true" />
        <strong>{current.label}</strong>
      </div>

      <div className="topbar-actions">
        <span className="badge amber">UI preview</span>
        <button type="button" className="button ghost" aria-label="Notifications">
          <Bell size={16} />
        </button>
        <span className="avatar-sm" aria-hidden="true">
          AC
        </span>
      </div>
    </header>
  )
}
