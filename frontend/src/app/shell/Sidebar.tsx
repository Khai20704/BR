import { NavLink } from 'react-router'
import { ChevronDown, Database, FlaskConical, Settings } from 'lucide-react'
import { navGroups } from '../navigation/nav-items'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'nav-link active' : 'nav-link'

export function Sidebar({
  id,
  isOpen,
  onNavigate,
}: {
  id: string
  isOpen: boolean
  onNavigate: () => void
}) {
  return (
    <aside id={id} className={isOpen ? 'sidebar open' : 'sidebar'}>
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          Br
        </span>
        <span className="brand-text">
          <strong>BR</strong>
          <span>Thermal workspace</span>
        </span>
      </div>

      <button type="button" className="workspace-switch">
        <span className="workspace-switch-icon" aria-hidden="true">
          <FlaskConical size={15} />
        </span>
        <span className="workspace-switch-text">
          <strong>Alpha cell line</strong>
          <span>Workspace · preview</span>
        </span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>

      <nav aria-label="Workspace">
        {navGroups.map(group => (
          <div className="nav-group" key={group.title}>
            <p className="nav-group-title">{group.title}</p>
            <ul className="nav-list">
              {group.items.map(item => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/'}
                    className={linkClass}
                    onClick={onNavigate}
                  >
                    <item.icon size={16} aria-hidden="true" />
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="connection-card">
          <Database size={15} aria-hidden="true" />
          <div>
            <strong>Backend not connected</strong>
            <span>No endpoint configured</span>
          </div>
        </div>
        <a className="nav-link" href="#settings" onClick={onNavigate}>
          <Settings size={16} aria-hidden="true" />
          Workspace settings
        </a>
        <div className="workspace-identity">
          <span className="avatar" aria-hidden="true">
            AC
          </span>
          <div>
            <strong>Alpha cell line</strong>
            <span>Engineering preview</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
