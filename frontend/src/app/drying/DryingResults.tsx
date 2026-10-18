import { Panel } from '@/shared/components/ui'
import type { SimulationPayload } from '@/core/api/backend-schemas'
import { assessDrying, validationLabel } from './assessment'

export function DryingAssessment({
  simulation,
  target,
}: {
  simulation: SimulationPayload
  target: number
}) {
  const assessment = assessDrying(simulation, target)
  return (
    <>
      <h3 className={'assessment-outcome ' + assessment.tone}>
        {assessment.label}
      </h3>
      <p className="body-copy">{assessment.detail}</p>
      <p>
        Target: <strong>{target}% wet basis</strong>
      </p>
      <p className="muted">
        {validationLabel(simulation.validation?.status)}. These are numerical
        model checks, not experimental validation or guaranteed performance.
      </p>
    </>
  )
}

export function DryingKeyResults({
  simulation,
}: {
  simulation: SimulationPayload
}) {
  return (
    <div className="drying-key-results">
      <div>
        <span>Estimated Drying Time</span>
        <strong>
          {simulation.duration_minutes}
          <small> minutes</small>
        </strong>
      </div>
      <div>
        <span>Predicted Final Moisture</span>
        <strong>
          {simulation.final_moisture_percent_wb}
          <small>% wet basis</small>
        </strong>
      </div>
      <div>
        <span>Estimated Water Removed</span>
        <strong>
          {simulation.water_removed_kg}
          <small> kg</small>
        </strong>
      </div>
    </div>
  )
}

export function DryingSummary({
  simulation,
  target,
}: {
  simulation: SimulationPayload
  target: number
}) {
  return (
    <>
      <Panel title="AI Assessment">
        <DryingAssessment simulation={simulation} target={target} />
      </Panel>
      <Panel title="Key Results">
        <DryingKeyResults simulation={simulation} />
        {simulation.target_achieved !== true && (
          <p className="body-copy">
            This is the time simulated for the attempt, not a confirmed time to
            reach your target.
          </p>
        )}
      </Panel>
    </>
  )
}
