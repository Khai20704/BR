import { useEffect, useRef, useState } from 'react'
import { ChevronDown, LogOut, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/core/auth/context'
import { useScenario } from '@/core/scenario/ScenarioProvider'
import './account-menu.css'

export function AccountMenu() {
  const { user, logout } = useAuth()
  const state = useScenario()
  const [open, setOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        trigger.current?.focus()
      }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [open])
  const name = user?.displayName || 'Your account'
  const initials =
    user?.displayName
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'Br'
  const avatar = (
    <span className="account-avatar">
      {user?.photoURL ? (
        <img src={user.photoURL} alt="" referrerPolicy="no-referrer" />
      ) : (
        initials
      )}
    </span>
  )
  function signOut() {
    const unsaved =
      state.status.startsWith('Saving') ||
      state.status === 'Not saved' ||
      state.historyStatus.startsWith('Saving') ||
      state.historyStatus.toLowerCase().includes('not saved')
    if (
      unsaved &&
      !window.confirm(
        'Some changes or history are not saved. Sign out and discard pending saves?',
      )
    )
      return
    void logout()
  }
  return (
    <div
      className="account-menu"
      ref={container}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <button
        ref={trigger}
        className="account-trigger"
        aria-label="Open account menu"
        title={name}
        aria-expanded={open}
        aria-controls="account-panel"
        onClick={() => setOpen((value) => !value)}
      >
        {avatar}
        <ChevronDown size={13} />
      </button>
      {open && (
        <section
          id="account-panel"
          className="account-panel"
          aria-label="Your account"
        >
          <div className="account-identity">
            {avatar}
            <div>
              <strong>{name}</strong>
              <p>{user?.email || 'Signed in with Google'}</p>
            </div>
          </div>
          <div className="account-private">
            <ShieldCheck size={14} />
            Private workspace
          </div>
          <button className="account-logout" onClick={signOut}>
            <LogOut size={16} />
            Log out
          </button>
        </section>
      )}
    </div>
  )
}
