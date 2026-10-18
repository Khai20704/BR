import { useScenario } from '@/core/scenario/ScenarioProvider'
import { ThermalScenarioForm } from './ThermalScenarioForm'
import type { ScenarioDraft } from '@/core/scenario/scenario-draft'
import { useState, type ReactNode } from 'react'
import { Activity, Thermometer, Waves } from 'lucide-react'
import type { ThermalPreview } from '../../domain/models/ThermalPreview'
import { usePreviewQuery } from '@/shared/hooks/usePreviewQuery'
import { PreviewChart } from '@/shared/components/PreviewChart'
import { formatRange } from '@/core/preview/format'
import {
  EmptyState,
  Notice,
  PageHeader,
  Panel,
  ProvenanceTag,
  RequestState,
  Stat,
} from '@/shared/components/ui'

export function ThermalProfilePage({
  load,
  renderSimulation,
}: {
  load: (draft: ScenarioDraft) => Promise<ThermalPreview>
  renderSimulation: () => ReactNode
}) {
  const { draft, revision } = useScenario()
  const query = usePreviewQuery('thermal', () => load(draft), revision)
  const [view, setView] = useState<'temperature' | 'heat'>('temperature')
  const [run, setRun] = useState(false)
  const data = query.isFetching || query.error ? undefined : query.data
  return (
    <>
      <PageHeader
        eyebrow="THERMAL INTELLIGENCE / SOURCE"
        title="Thermal profile"
        description="Understand the shape of available heat across your operating window."
        action={
          data ? <ProvenanceTag provenance={data.provenance} /> : undefined
        }
      />
      <RequestState
        pending={query.isFetching}
        error={query.error}
        retry={() => void query.refetch()}
      />
      <ThermalScenarioForm onRun={setRun} />
      <div className="stats-grid three">
        <Stat
          label="Source temperature"
          value={data ? formatRange(data.temperatureRange) : '—'}
          unit="°C"
          detail={
            data
              ? `${data.sourceName} · not measured`
              : 'No source profile connected'
          }
          icon={<Thermometer />}
        />
        <Stat
          label="Heat availability"
          value={data ? formatRange(data.heatRange, 1) : '—'}
          unit="kW"
          detail={
            data
              ? 'Available heat per window sample'
              : 'Awaiting a source profile'
          }
          icon={<Waves />}
        />
        <Stat
          label="Uncertainty"
          value="Unknown"
          detail={data ? data.uncertainty : 'No uncertainty model is available'}
          icon={<Activity />}
        />
      </div>
      <Panel
        title="Source profile"
        subtitle={
          data
            ? `${data.sourceName} · ${data.points.length} samples, elapsed time`
            : 'Operating window'
        }
        action={
          <div className="segmented" aria-label="Chart metric">
            <button
              aria-pressed={view === 'temperature'}
              onClick={() => setView('temperature')}
            >
              Temperature
            </button>
            <button
              aria-pressed={view === 'heat'}
              onClick={() => setView('heat')}
            >
              Heat
            </button>
          </div>
        }
      >
        {data ? (
          <PreviewChart
            points={data.points.map((p) => ({
              time: p.time,
              value: view === 'temperature' ? p.temperature : p.heat,
            }))}
            label={
              view === 'temperature' ? 'Source temperature' : 'Available heat'
            }
            unit={view === 'temperature' ? '°C' : 'kW'}
          />
        ) : (
          <EmptyState />
        )}
      </Panel>
      <div className="equal-columns section-gap">
        <Panel title="Data provenance">
          {data ? (
            <ProvenanceTag provenance={data.provenance} />
          ) : (
            <EmptyState />
          )}
          <p className="body-copy">
            {data
              ? data.provenance.detail
              : 'No source of these values is available.'}
          </p>
        </Panel>
        <Panel title="Uncertainty & coverage">
          <p className="body-copy">
            {data?.uncertainty ?? 'No uncertainty model is available.'}
          </p>
          <Notice>
            No confidence band is implied. A verified profile is required for
            engineering use.
          </Notice>
        </Panel>
      </div>
      {run && <div className="section-gap">{renderSimulation()}</div>}
    </>
  )
}
