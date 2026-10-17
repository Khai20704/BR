import type { SimulationPreview } from '../../domain/models/SimulationPreview'
import { usePreviewQuery } from '@/shared/hooks/usePreviewQuery'
import { PreviewChart } from '@/shared/components/PreviewChart'
import {
  EmptyState,
  Notice,
  PageHeader,
  Panel,
  RequestState,
  Status,
} from '@/shared/components/ui'
export function SimulationPage({
  load,
}: {
  load: () => Promise<SimulationPreview>
}) {
  const q = usePreviewQuery('simulation', load)
  return (
    <>
      <PageHeader
        eyebrow="THERMAL INTELLIGENCE / SIMULATION"
        title="Thermal digital twin"
        description="Explore the simulation workspace. Engineering validation comes next."
        action={<Status value="NOT_VALIDATED" />}
      />
      <RequestState
        pending={q.isPending}
        error={q.error}
        retry={() => void q.refetch()}
      />
      <div className="two-column">
        <Panel
          title="Moisture prediction"
          subtitle="Illustrative chart layout · no model has run"
        >
          {q.data ? (
            <PreviewChart
              points={q.data.points.map((p) => ({
                time: p.time,
                value: p.moisture,
              }))}
              label="Illustrative moisture"
              unit="% wet-basis"
            />
          ) : (
            <EmptyState />
          )}
          <Notice>
            This is a synthetic curve, not a drying prediction. No target
            achievement is claimed.
          </Notice>
        </Panel>
        <Panel title="Mass balance" subtitle="Awaiting physics engine">
          <div className="result-value">
            ·<span>kg water removed</span>
          </div>
          {['Initial dry solids', 'Final wet mass', 'Energy required'].map(
            (label) => (
              <div className="info-row" key={label}>
                <span>{label}</span>
                <strong>·</strong>
              </div>
            ),
          )}
          <div className="section-gap">
            <Status value="NOT_VALIDATED" />
          </div>
        </Panel>
      </div>
      <div className="equal-columns section-gap">
        <Panel title="Simulation assumptions">
          <ul className="checklist">
            <li>Material properties: not supplied</li>
            <li>Airflow & humidity: not supplied</li>
            <li>Heat transfer model: not connected</li>
            <li>Boundary conditions: not validated</li>
          </ul>
        </Panel>
        <Panel title="Feasibility assessment">
          <Status value="NEED_MORE_DATA" />
          <p className="body-copy">
            A validated material model, measured thermal inputs, and operating
            constraints are needed before feasibility can be assessed.
          </p>
        </Panel>
      </div>
    </>
  )
}
