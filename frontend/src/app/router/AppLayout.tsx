import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Boxes,
  BrainCircuit,
  Building2,
  ChevronDown,
  Command,
  FlaskConical,
  LayoutDashboard,
  Menu,
  RefreshCw,
  Unplug,
  Waves,
  X,
} from 'lucide-react'
import { AccountMenu } from '../auth/AccountMenu'
import { WorkspaceStatus } from '../auth/WorkspaceStatus'
import { dataMode } from '../preview-services'
import { Badge } from '@/shared/components/ui'
const groups = [
  {
    label: 'WORKSPACE',
    items: [
      { to: '/', label: 'Overview', icon: LayoutDashboard },
      { to: '/history', label: 'History', icon: Boxes },
      { to: '/site', label: 'Site setup', icon: Building2 },
      { to: '/batch', label: 'Batch setup', icon: Boxes },
    ],
  },
  {
    label: 'THERMAL INTELLIGENCE',
    items: [
      { to: '/thermal-profile', label: 'Thermal profile', icon: Activity },
      { to: '/simulation', label: 'Thermal digital twin', icon: Waves },
    ],
  },
  {
    label: 'DECISION INTELLIGENCE',
    items: [
      { to: '/ai-planning', label: 'AI planning', icon: BrainCircuit },
      { to: '/replanning', label: 'Adaptive replanning', icon: RefreshCw },
      { to: '/benchmark', label: 'Benchmark', icon: BarChart3 },
    ],
  },
]
export function AppLayout() {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const sidebar = useRef<HTMLElement>(null)
  const location = useLocation()
  const title =
    groups.flatMap((g) => g.items).find((i) => i.to === location.pathname)
      ?.label ?? 'Workspace'
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
            <strong>Br workspace</strong>
            <span>
              {dataMode === 'fixture'
                ? 'Development preview'
                : 'Private workspace'}
            </span>
          </div>
          <ChevronDown size={14} />
        </div>
        <nav>
          {groups.map((g) => (
            <div className="nav-group" key={g.label}>
              <div className="nav-label">{g.label}</div>
              {g.items.map(({ to, label, icon: Icon }) => (
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
                  {to === '/ai-planning' && (
                    <span className="nav-ai" aria-hidden="true">
                      AI
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="connection-card">
            <span className="connection-icon">
              <Unplug size={16} />
            </span>
            <div>
              <strong>Engineering API</strong>
              <p>Connection checked per request</p>
            </div>
          </div>
          <div className="sidebar-footer">
            <span className="avatar">Br</span>
            <div>
              <strong>Engineering workspace</strong>
              <small>Private saved workspace</small>
            </div>
            <Command size={14} />
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
            <span className="breadcrumb-root">Workspace</span>
            <span className="breadcrumb-slash">/</span>
            <strong>{title}</strong>
          </div>
          <div className="topbar-right">
            <Badge tone={dataMode === 'fixture' ? 'amber' : 'neutral'}>
              {dataMode === 'fixture' ? (
                <FlaskConical size={12} />
              ) : (
                <Unplug size={12} />
              )}{' '}
              {dataMode === 'fixture' ? 'UI PREVIEW' : 'HTTP MODE'}
            </Badge>
            <span className="topbar-divider" />
            <AccountMenu />
          </div>
        </header>
        <main id="main" tabIndex={-1} className="main-content">
          <div className="provenance-bar">
            <span>
              <FlaskConical size={14} />
              {dataMode === 'fixture'
                ? 'SYNTHETIC / UI PREVIEW · All displayed curves are illustrative. No live execution.'
                : 'MODEL PREDICTIONS / No verified sensor data.'}
            </span>
            <span className="phase-label">
              PHASE 05
              <ArrowUpRight size={12} />
            </span>
          </div>
          <WorkspaceStatus />
          <Outlet />
          <footer className="content-footer">
            <span>Br — Break the Rules</span>
            <span>Designed for insight. Not connected to control.</span>
          </footer>
        </main>
      </div>
    </div>
  )
}
