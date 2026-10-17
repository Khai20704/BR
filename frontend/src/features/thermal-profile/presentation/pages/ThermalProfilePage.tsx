import { useState } from 'react'
import { Activity, Thermometer, Waves } from 'lucide-react'
import type { ThermalPreview } from '../../domain/models/ThermalPreview'
import { usePreviewQuery } from '@/shared/hooks/usePreviewQuery'
import { PreviewChart } from '@/shared/components/PreviewChart'
import {
  EmptyState,
  Notice,
  PageHeader,
  Panel,
  PreviewLabel,
  RequestState,
  Stat,
} from '@/shared/components/ui'
export function ThermalProfilePage({
  load,
}: {
  load: () => Promise<ThermalPreview>
}) {
  const query = usePreviewQuery('thermal', load)
  const [view, setView] = useState<'temperature' | 'heat'>('temperature')
  return (
    <>
      <PageHeader
        eyebrow="THERMAL INTELLIGENCE / SOURCE"
        title="Thermal profile"
        description="Understand the shape of available heat across your operating window."
      />
      <RequestState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      <div className="stats-grid three">
        <Stat
          label="Source temperature"
          value={query.data ? '34–48' : '—'}
          unit="°C"
          detail={
            query.data
              ? 'Synthetic range · not measured'
              : 'No measured data connected'
          }
          icon={<Thermometer />}
        />
        <Stat
          label="Heat availability"
          value={query.data ? '1.2–3.1' : '—'}
          unit="kW"
          detail={
            query.data
              ? 'Illustrative profile only'
              : 'Awaiting a source profile'
          }
          icon={<Waves />}
        />
        <Stat
          label="Uncertainty"
          value="Unknown"
          detail="Calibration & observations required"
          icon={<Activity />}
        />
      </div>
      <Panel
        title="Source profile"
        subtitle="Operating window · 08:00–16:00"
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
        {query.data ? (
          <PreviewChart
            points={query.data.points.map((p) => ({
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
          <PreviewLabel />
          <p className="body-copy">
            This fixed curve is an interface fixture. It is not a measurement,
            forecast, or estimate of recoverable heat.
          </p>
        </Panel>
        <Panel title="Uncertainty & coverage">
          <p className="body-copy">
            {query.data?.uncertainty ?? 'No uncertainty model is available.'}
          </p>
          <Notice>
            No confidence band is implied. A verified profile is required for
            engineering use.
          </Notice>
        </Panel>
      </div>
    </>
  )
}
