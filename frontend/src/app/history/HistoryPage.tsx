import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router'
import { useScenario } from '@/core/scenario/ScenarioProvider'
import {
  historyKinds,
  draftSchema,
  type HistoryKind,
  type StoredRun,
} from '@/core/workspace/model'
import type { QueryDocumentSnapshot } from 'firebase/firestore'
import { historyLabels, savedPrediction } from './saved-prediction'
import { DryingAssessment, DryingKeyResults } from '../drying/DryingResults'
import { PreviewChart } from '@/shared/components/PreviewChart'
export function HistoryPage() {
  const { repository, replaceDraft } = useScenario()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const initialKind = params.get('kind')
  const [kind, setKind] = useState<HistoryKind>(
    historyKinds.includes(initialKind as HistoryKind)
      ? (initialKind as HistoryKind)
      : 'ai_plans',
  )
  const [cursor, setCursor] = useState<QueryDocumentSnapshot>()
  const [selection, setSelected] = useState<StoredRun | null>(null)
  const [error, setError] = useState('')
  const q = useQuery({
    queryKey: ['history', kind, cursor?.id],
    queryFn: () => repository!.list(kind, cursor),
    enabled: !!repository,
    staleTime: 0,
  })
  const selected =
    selection ??
    q.data?.rows.find((row) => row.id === params.get('record')) ??
    null
  const prediction = selected ? savedPrediction(selected) : null
  async function duplicate() {
    try {
      const input = JSON.parse(selected!.inputSnapshot) as {
        draft: unknown
        request?: { changed_temperature_c?: number }
      }
      await replaceDraft({
        ...draftSchema.parse(input.draft),
        ...(selected?.kind === 'replanning_runs' &&
        input.request?.changed_temperature_c !== undefined
          ? { sourceTemperatureC: input.request.changed_temperature_c }
          : {}),
        batchId: crypto.randomUUID(),
      })
      navigate('/drying/new')
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
      setParams({})
      await q.refetch()
    } catch {
      setError('Delete failed. The record has not been removed.')
    }
  }
  return (
    <>
      <h1>Drying History</h1>
      <p>
        Revisit your saved batches, drying plans, and what-if predictions. These
        are model estimates, not measured outcomes.
      </p>
      <label htmlFor="history-kind">Record type</label>
      <select
        id="history-kind"
        value={kind}
        onChange={(e) => {
          setKind(e.target.value as HistoryKind)
          setCursor(undefined)
          setSelected(null)
          setParams({})
        }}
      >
        {historyKinds.map((k) => (
          <option key={k} value={k}>
            {historyLabels[k]}
          </option>
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
      <ul className="drying-history-list">
        {q.data?.rows.map((row) => (
          <li key={row.id}>
            <button className="button" onClick={() => setSelected(row)}>
              <strong>{historyLabels[row.kind]}</strong>
              {' · '}
              <time dateTime={row.createdAt?.toDate().toISOString()}>
                {row.createdAt?.toDate().toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }) ?? 'Saving timestamp…'}
              </time>
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
          <h2>Saved {historyLabels[selected.kind]}</h2>
          {prediction ? (
            <div className="saved-plan-summary">
              <DryingAssessment
                simulation={prediction.simulation}
                target={prediction.target}
              />
              <DryingKeyResults simulation={prediction.simulation} />
              <PreviewChart
                points={prediction.simulation.points.map((point) => ({
                  time: point.minute,
                  value: point.moisture_percent_wb,
                }))}
                label="Saved moisture prediction"
                unit="% wet basis"
                target={prediction.target}
                provenanceLabel="Saved model prediction · not measured"
                xAxisLabel="Time (minutes)"
                yAxisLabel="Moisture (% wet basis)"
              />
            </div>
          ) : (
            <p>
              Detailed results are available in the saved calculation record
              below.
            </p>
          )}
          <div className="thermal-actions">
            <button
              className="button secondary"
              onClick={() => void duplicate()}
            >
              Use these inputs for a new batch
            </button>
            <button className="button secondary" onClick={() => void remove()}>
              Delete record
            </button>
          </div>
          <details className="advanced-inputs">
            <summary>View saved calculation record</summary>
            <p>
              Model: {selected.modelVersion}. Narrator model:{' '}
              {selected.modelName}.
            </p>
            <h3>Original input parameters</h3>
            <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              {JSON.stringify(JSON.parse(selected.inputSnapshot), null, 2)}
            </pre>
            <h3>Computed result and tool trace</h3>
            <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              {JSON.stringify(JSON.parse(selected.result), null, 2)}
            </pre>
          </details>
        </article>
      )}
    </>
  )
}
