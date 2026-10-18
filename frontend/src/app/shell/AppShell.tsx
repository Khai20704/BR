import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import type { ReactNode } from 'react'
import type { DataMode } from '@/core/config/data-mode'
import { findNavItem } from '../navigation/nav-items'
import { ProvenanceBar } from './ProvenanceBar'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

const NAV_ID = 'workspace-navigation'

export function AppShell({
  children,
  dataMode,
}: {
  children: ReactNode
  dataMode: DataMode
}) {
  const { pathname } = useLocation()
  const [navOpen, setNavOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const current = findNavItem(pathname)

  const closeNav = useCallback(() => setNavOpen(false), [])

  useEffect(() => {
    if (!navOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setNavOpen(false)
      menuButtonRef.current?.focus()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [navOpen])

  return (
    <div className="app-shell">
      <Sidebar id={NAV_ID} isOpen={navOpen} onNavigate={closeNav} />
      {navOpen && (
        <button
          type="button"
          className="sidebar-scrim"
          aria-label="Close menu overlay"
          onClick={closeNav}
        />
      )}
      <div className="shell-main">
        <TopBar
          current={current}
          navOpen={navOpen}
          navId={NAV_ID}
          menuButtonRef={menuButtonRef}
          onToggleNav={() => setNavOpen(open => !open)}
        />
        <ProvenanceBar mode={dataMode} />
        <main className="content">{children}</main>
        <footer className="app-footer">
          <span>
            Br AI Thermal Engineer · engineering preview, no live backend
          </span>
          <span className="footer-links">
            <a href="#architecture">Architecture</a>
            <a href="#api-contract">API contract</a>
            <span>Phase 02</span>
          </span>
        </footer>
      </div>
    </div>
  )
}
