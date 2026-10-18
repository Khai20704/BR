import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { Building2, Leaf, Menu, X } from 'lucide-react'
import { AccountMenu } from '../auth/AccountMenu'
import { WorkspaceStatus } from '../auth/WorkspaceStatus'
import { dataMode } from '../preview-services'
import { navItems } from '../navigation/nav-items'
import { useScenario } from '@/core/scenario/ScenarioProvider'
export function AppLayout() {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const sidebar = useRef<HTMLElement>(null)
  const location = useLocation()
  const { site } = useScenario()
  const title =
    navItems.find((i) => i.path === location.pathname)?.label ??
    'AI Drying Plan'
  useEffect(() => {
    if (!open) return
    const trigger = button.current
    const first = sidebar.current?.querySelector<HTMLElement>('button, a')
    first?.focus()
    function key(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        button.current?.focus()
      }
      if (e.key === 'Tab') {
        const nodes = sidebar.current?.querySelectorAll<HTMLElement>('a,button')
        const first = nodes?.[0]
        const last = nodes?.[nodes.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }
    document.addEventListener('keydown', key)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', key)
      document.body.style.overflow = previous
      trigger?.focus()
    }
  }, [open])
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      {open && (
        <button
          className="nav-overlay"
          aria-label="Close navigation"
          onClick={() => {
            setOpen(false)
            button.current?.focus()
          }}
        />
      )}
      <aside
        ref={sidebar}
        className={'sidebar ' + (open ? 'is-open' : '')}
        aria-label="Main navigation"
      >
        <div className="brand">
          <div className="brand-mark">
            Br<span>_</span>
          </div>
          <div>
            <strong>BREAK THE RULES</strong>
            <span>THERMAL INTELLIGENCE</span>
          </div>
          <button
            className="icon-button mobile-only"
            aria-label="Close menu"
            onClick={() => {
              setOpen(false)
              button.current?.focus()
            }}
          >
            <X size={19} />
          </button>
        </div>
        <div className="workspace-selector">
          <div className="workspace-icon">
            <Building2 size={17} />
          </div>
          <div>
            <strong>{site?.name ?? 'Your coffee shop'}</strong>
            <span>
              {dataMode === 'fixture'
                ? 'Development preview'
                : 'Private workspace'}
            </span>
          </div>
        </div>
        <nav aria-label="Workspace">
          <div className="nav-group">
            {navItems.map(({ path: to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={() => {
                  setOpen(false)
                  if (open) button.current?.focus()
                }}
                className={({ isActive }) =>
                  'nav-item ' + (isActive ? 'active' : '')
                }
              >
                <Icon size={18} />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-footer">
            <span className="avatar">Br</span>
            <div>
              <strong>A little heat. New possibilities.</strong>
              <small>Private saved workspace</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-shell" inert={open}>
        <header className="topbar">
          <div className="breadcrumb">
            <button
              ref={button}
              className="icon-button mobile-only"
              aria-label="Open menu"
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <Menu size={21} />
            </button>
            <span className="breadcrumb-root">Br</span>
            <span className="breadcrumb-slash">/</span>
            <strong>{title}</strong>
          </div>
          <div className="topbar-right">
            <AccountMenu />
          </div>
        </header>
        <main id="main" tabIndex={-1} className="main-content">
          <div className="provenance-bar">
            <span>
              <Leaf size={14} />
              {dataMode === 'fixture'
                ? 'Example preview. Generate a plan to request a calculation.'
                : 'Explore with predictions. Your shop’s actual results may differ.'}
            </span>
          </div>
          <WorkspaceStatus />
          <Outlet />
          <footer className="content-footer">
            <span>Br — Break the Rules</span>
            <span>Plan with care. Make more of your coffee grounds.</span>
          </footer>
        </main>
      </div>
    </div>
  )
}
