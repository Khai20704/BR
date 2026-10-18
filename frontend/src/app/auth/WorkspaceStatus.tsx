import { useAuth } from '@/core/auth/context'
import { useScenario } from '@/core/scenario/ScenarioProvider'
export function WorkspaceStatus() {
  const { error: authError } = useAuth()
  const state = useScenario()
  return (
    <section
      aria-label="Workspace persistence"
      className="workspace-save-status"
    >
      <p role="status">{state.status}</p>
      {(state.error || authError) && (
        <p role="alert">{state.error || authError}</p>
      )}
      {state.error && state.ready && (
        <button
          className="button"
          onClick={() => void state.retrySave().catch(() => {})}
        >
          Retry workspace save
        </button>
      )}
      {state.historyStatus && <p role="status">{state.historyStatus}</p>}
      {state.historyStatus.toLowerCase().includes('not saved') && (
        <button className="button" onClick={() => void state.retryHistory()}>
          Retry history save
        </button>
      )}
    </section>
  )
}
