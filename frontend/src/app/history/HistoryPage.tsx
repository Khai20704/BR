import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { useScenario } from '@/core/scenario/ScenarioProvider'
import {
  historyKinds,
  draftSchema,
  type HistoryKind,
  type StoredRun,
} from '@/core/workspace/model'
import type { QueryDocumentSnapshot } from 'firebase/firestore'
export function HistoryPage() {
  const { repository, replaceDraft } = useScenario()
  const navigate = useNavigate()
  const [kind, setKind] = useState<HistoryKind>('simulations')
  const [cursor, setCursor] = useState<QueryDocumentSnapshot>()
  const [selected, setSelected] = useState<StoredRun | null>(null)
  const [error, setError] = useState('')
  const q = useQuery({
    queryKey: ['history', kind, cursor?.id],
    queryFn: () => repository!.list(kind, cursor),
    enabled: !!repository,
  })
  async function duplicate() {
    try {
      const input = JSON.parse(selected!.inputSnapshot) as { draft: unknown }
      await replaceDraft({
        ...draftSchema.parse(input.draft),
        batchId: crypto.randomUUID(),
      })
      navigate('/batch')
    } catch {
      setError('Could not duplicate this record. Check its inputs and retry.')
    }
  }
  async function remove() {
    if (!selected || !window.confirm('Permanently delete this saved record?'))
      return
    try {
      await repository!.remove(kind, selected.id)
      setSelected(null)
      await q.refetch()
    } catch {
      setError('Delete failed. The record has not been removed.')
    }
  }
  return (
    <>
      <h1>History</h1>
      <p>
        Immutable input and result snapshots. Thermal energy is a model
        prediction, not electricity savings. Client-saved records are not
        server-attested measurements.
      </p>
      <label htmlFor="history-kind">Record type</label>
      <select
        id="history-kind"
        value={kind}
        onChange={(e) => {
          setKind(e.target.value as HistoryKind)
          setCursor(undefined)
          setSelected(null)
        }}
      >
        {historyKinds.map((k) => (
          <option key={k}>{k}</option>
        ))}
      </select>
      {q.isPending && <p role="status">Loading history...</p>}
      {q.error && (
        <p role="alert">
          Unable to load history.{' '}
          <button onClick={() => void q.refetch()}>Retry</button>
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {q.data?.rows.length === 0 && <p>No saved records yet.</p>}
      <ul>
        {q.data?.rows.map((row) => (
          <li key={row.id}>
            <button className="button" onClick={() => setSelected(row)}>
              {row.createdAt?.toDate().toLocaleString() ?? 'Saved run'} /{' '}
              {row.modelVersion} / {row.id.slice(0, 8)}
            </button>
          </li>
        ))}
      </ul>
      {cursor && (
        <button
          onClick={() => {
            setCursor(undefined)
            setSelected(null)
          }}
        >
          Newest records
        </button>
      )}
      {q.data?.more && (
        <button
          onClick={() => {
            setCursor(q.data?.cursor)
            setSelected(null)
          }}
        >
          Next 20
        </button>
      )}
      {selected && (
        <article className="panel">
          <h2>Saved {selected.kind}</h2>
          <p>
            Model: {selected.modelVersion}. Narrator model: {selected.modelName}
            .
          </p>
          <button className="button" onClick={() => void duplicate()}>
            Duplicate scenario
          </button>
          <button className="button" onClick={() => void remove()}>
            Delete record
          </button>
          <h3>Original input parameters</h3>
          <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {JSON.stringify(JSON.parse(selected.inputSnapshot), null, 2)}
          </pre>
          <h3>Computed result and tool trace</h3>
          <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {JSON.stringify(JSON.parse(selected.result), null, 2)}
          </pre>
        </article>
      )}
    </>
  )
}
