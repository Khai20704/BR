import { Link } from 'react-router'
import { useAuth } from '@/core/auth/context'
import { Panel, PageHeader } from '@/shared/components/ui'
export function SettingsPage() {
  const { user } = useAuth()
  return (
    <>
      <PageHeader
        eyebrow="MAKE YOURSELF AT HOME"
        title="Settings"
        description="Your account and the way Br displays your plans."
      />
      <div className="equal-columns">
        <Panel title="Your account">
          <h3>{user?.displayName ?? 'Your Google account'}</h3>
          <p className="body-copy">{user?.email}</p>
          <p>
            Use the account menu at the top right to log out. Your saved shop
            and drying history will be here when you sign in again.
          </p>
        </Panel>
        <Panel title="Display & privacy">
          <div className="info-row">
            <span>Appearance</span>
            <strong>Dark with mint accents</strong>
          </div>
          <div className="info-row">
            <span>Units</span>
            <strong>°C, kg, minutes</strong>
          </div>
          <p className="body-copy">
            Your workspace is private to your account. You can review and delete
            individual saved records in{' '}
            <Link to="/history">Drying History</Link>.
          </p>
          <Link className="text-link" to="/shop">
            Manage your shop and AC information
          </Link>
        </Panel>
      </div>
    </>
  )
}
