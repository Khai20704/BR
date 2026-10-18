import { Navigate } from 'react-router'
import { useAuth } from '@/core/auth/context'
import { useScenario } from '@/core/scenario/ScenarioProvider'
import { AppLayout } from '../router/AppLayout'
export function WorkspaceGate() {
  const { user, loading } = useAuth()
  const workspace = useScenario()
  if (loading) return <main role="status">Restoring authentication...</main>
  if (!user) return <Navigate to="/login" replace />
  if (!workspace.ready)
    return (
      <main className="main-content">
        <p role="status">Loading your workspace...</p>
        {workspace.error && <p role="alert">{workspace.error}</p>}
        <button onClick={() => window.location.reload()}>Retry loading</button>
      </main>
    )
  return <AppLayout />
}
