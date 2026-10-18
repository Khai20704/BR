import type { SimulationPreview } from '../../domain/models/SimulationPreview'
import type { ScenarioDraft } from '@/core/scenario/scenario-draft'
import { useScenario } from '@/core/scenario/ScenarioProvider'
import { usePreviewQuery } from '@/shared/hooks/usePreviewQuery'
import { PreviewChart } from '@/shared/components/PreviewChart'
import { formatMeasurement } from '@/core/preview/format'
import {
  EmptyState,
  Notice,
  PageHeader,
  Panel,
  ProvenanceTag,
  RequestState,
  Status,
} from '@/shared/components/ui'

export function SimulationPage({
  load,
}: {
  load: (draft: ScenarioDraft) => Promise<SimulationPreview>
}) {
  const { draft, revision } = useScenario()
  const q = usePreviewQuery('simulation', () => load(draft), revision)
  const data = q.data
  return (
    <>
      <PageHeader
        eyebrow="THERMAL INTELLIGENCE / SIMULATION"
        title="Thermal digital twin"
        description="Explore the simulation workspace. Engineering validation comes next."
        action={
          data ? (
            <ProvenanceTag provenance={data.provenance} />
          ) : (
            <Status value="NOT_VALIDATED" />
          )
        }
      />
      <RequestState
        pending={q.isPending}
        error={q.error}
        retry={() => void q.refetch()}
      />
      <div className="two-column">
        <Panel
          title="Moisture prediction"
          subtitle={
            data
              ? `${data.modelVersion} · ${data.points.length} reported points`
              : 'No model has run'
          }
        >
          {data ? (
            <PreviewChart
              points={data.points.map((p) => ({
                time: p.time,
                value: p.moisture,
              }))}
              label="Predicted moisture"
              unit="% wet-basis"
            />
          ) : (
            <EmptyState />
          )}
          <Notice>
            Engine prediction, not a measurement. Target achievement is checked
            independently by the backend validator.
          </Notice>
        </Panel>
        <Panel
          title="Mass balance"
          subtitle={data ? 'Computed by the physics engine' : 'No engine run'}
        >
          <div className="result-value">
            {data ? data.waterRemovedKg.toFixed(3) : '·'}
            <span>kg water removed</span>
          </div>
          {[
            {
              label: 'Final moisture',
              value: data
                ? formatMeasurement(data.finalMoisturePercentWb, '% wb', 2)
                : '·',
            },
            {
              label: 'Duration',
              value: data ? formatMeasurement(data.durationMinutes, 'min', 0) : '·',
            },
            {
              label: 'Energy consumed',
              value: data ? formatMeasurement(data.energyKwh, 'kWh', 3) : '·',
            },
            {
              label: 'Latent energy floor',
              value: data ? formatMeasurement(data.minimumEnergyKwh, 'kWh', 3) : '·',
            },
          ].map((row) => (
            <div className="info-row" key={row.label}>
              <span>{row.label}</span>
              <strong>{row.value}</strong>
            </div>
          ))}
          <div className="section-gap">
            <Status value={data?.status ?? 'NOT_VALIDATED'} />
          </div>
        </Panel>
      </div>
      <div className="equal-columns section-gap">
        <Panel title="Simulation assumptions">
          {data && data.notes.length > 0 ? (
            <ul className="checklist">
              {data.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : (
            <ul className="checklist">
              <li>Material properties: not supplied</li>
              <li>Airflow & humidity: not supplied</li>
              <li>Heat transfer model: not connected</li>
              <li>Boundary conditions: not validated</li>
            </ul>
          )}
        </Panel>
        <Panel title="Feasibility assessment">
          <Status value={data?.status ?? 'NEED_MORE_DATA'} />
          <p className="body-copy">
            {data
              ? 'This trajectory is a model prediction with an independent energy plausibility check. It is not an experimentally validated drying curve.'
              : 'A material model, thermal inputs and operating constraints are needed before feasibility can be assessed.'}
          </p>
        </Panel>
      </div>
    </>
  )
}
