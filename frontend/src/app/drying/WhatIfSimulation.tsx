import { useState } from 'react'
import { Panel } from '@/shared/components/ui'
import { PreviewChart } from '@/shared/components/PreviewChart'
import type {
  SimulationPayload,
  PlanEnvelopePayload,
  ReplanEnvelopePayload,
} from '@/core/api/backend-schemas'
import { Recommendations } from './Recommendations'
import { assessDrying, validationLabel, withPlanValidation } from './assessment'
import { errorMessage, type DryingRun, type DryingServices } from './types'

export function WhatIfSimulation({
  baseline,
  services,
}: {
  baseline: DryingRun
  services: DryingServices
}) {
  const baseTemperature = baseline.draft.sourceTemperatureC!
  const initialTemperature =
    baseTemperature > 35 && baseline.draft.minTemperatureC <= 35
      ? 35
      : Math.max(
          30,
          Math.min(
            45,
            Math.max(baseline.draft.minTemperatureC, baseTemperature - 5),
          ),
        )
  const [temperature, setTemperature] = useState(initialTemperature)
  const [result, setResult] = useState<{
    temperature: number
    simulation: SimulationPayload
    plan: PlanEnvelopePayload | null
    planError: string
    replan: ReplanEnvelopePayload | null
    replanError: string
  } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const invalid =
    temperature < 30 || temperature > 45 || !Number.isFinite(temperature)
      ? 'Choose a temperature from 30°C to 45°C.'
      : temperature >= baseTemperature
        ? 'Choose a temperature lower than the original AC heat temperature.'
        : temperature < baseline.draft.minTemperatureC
          ? `This is below your minimum drying temperature of ${baseline.draft.minTemperatureC}°C. Edit the batch conditions to explore it.`
          : ''
  async function run() {
    if (invalid || busy) return
    setBusy(true)
    setError('')
    setResult(null)
    // Separate draft, no workspace save: baseline inputs and results never change.
    const modified = { ...baseline.draft, sourceTemperatureC: temperature }
    const [simulation, plan, replan] = await Promise.allSettled([
      services.simulate(modified),
      services.plan(modified),
      baseline.draft.maxDurationMinutes >= 15
        ? services.replan(baseline.draft, temperature)
        : Promise.resolve(null),
    ])
    if (simulation.status === 'fulfilled') {
      setResult({
        temperature,
        simulation: withPlanValidation(
          simulation.value,
          plan.status === 'fulfilled' ? plan.value : null,
          baseline.draft.targetMoisturePercentWb,
        ),
        plan: plan.status === 'fulfilled' ? plan.value : null,
        planError: plan.status === 'rejected' ? errorMessage(plan.reason) : '',
        replan: replan.status === 'fulfilled' ? replan.value : null,
        replanError:
          replan.status === 'rejected' ? errorMessage(replan.reason) : '',
      })
    } else setError(errorMessage(simulation.reason))
    setBusy(false)
  }
  const before = baseline.simulation
  const after = result?.simulation
  const minutes = [
    ...new Set([
      ...before.points.map((p) => p.minute),
      ...(after?.points.map((p) => p.minute) ?? []),
    ]),
  ].sort((a, b) => a - b)
  const points = minutes.map((time) => ({
    time,
    value:
      before.points.find((p) => p.minute === time)?.moisture_percent_wb ?? null,
    comparison:
      after?.points.find((p) => p.minute === time)?.moisture_percent_wb ?? null,
  }))
  return (
    <Panel
      title="What if your AC produces less heat?"
      subtitle="Explore a cooler source without changing your original batch or plan."
    >
      <div className="what-if-controls">
        <div className="temperature-values">
          <span>
            Original / base temperature <strong>{baseTemperature}°C</strong>
          </span>
          <span>
            Adjusted scenario temperature{' '}
            <strong>
              <output htmlFor="what-if-temperature">{temperature}°C</output>
            </strong>
          </span>
        </div>
        <label htmlFor="what-if-temperature">
          AC heat temperature for comparison
        </label>
        <input
          id="what-if-temperature"
          type="range"
          min="30"
          max="45"
          step="1"
          value={temperature}
          disabled={busy}
          aria-describedby="what-if-help what-if-error"
          onChange={(event) => {
            setTemperature(Number(event.target.value))
            setResult(null)
            setError('')
          }}
        />
        <div className="range-limits" aria-hidden="true">
          <span>30°C</span>
          <span>45°C</span>
        </div>
        <p id="what-if-help" className="body-copy">
          Moving the slider only changes the input. Run the simulation to
          calculate a new prediction. Available heat stays at{' '}
          {baseline.draft.availableHeatKw} kW; this explores source temperature,
          not a reduction in heat power.
        </p>
        <p id="what-if-error" className="field-error">
          {invalid}
        </p>
        <button
          className="button primary"
          disabled={busy || !!invalid}
          onClick={() => void run()}
        >
          {busy ? 'Running What-If Simulation…' : 'Run What-If Simulation'}
        </button>
        {busy && (
          <p role="status">
            Calculating the cooler scenario and requesting an updated
            explanation…
          </p>
        )}
        {error && (
          <div role="alert">
            <p>What-if simulation could not finish. {error}</p>
            <button className="button secondary" onClick={() => void run()}>
              Retry What-If Simulation
            </button>
          </div>
        )}
      </div>
      {result && after && (
        <div className="what-if-comparison" aria-label="Before vs. After">
          <h3>Before vs. After</h3>
          <p>
            Original {baseTemperature}°C compared with {result.temperature}°C.
            Your original plan is unchanged.
          </p>
          <div className="table-scroll">
            <table>
              <caption>Model predictions, not measurements</caption>
              <thead>
                <tr>
                  <th scope="col">Result</th>
                  <th scope="col">Before · {baseTemperature}°C</th>
                  <th scope="col">After · {result.temperature}°C</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Estimated drying duration</th>
                  <td data-testid="before-duration">
                    {before.duration_minutes} minutes
                  </td>
                  <td data-testid="after-duration">
                    {after.duration_minutes} minutes
                  </td>
                </tr>
                <tr>
                  <th scope="row">Predicted final moisture</th>
                  <td data-testid="before-moisture">
                    {before.final_moisture_percent_wb}% wet basis
                  </td>
                  <td data-testid="after-moisture">
                    {after.final_moisture_percent_wb}% wet basis
                  </td>
                </tr>
                <tr>
                  <th scope="row">Target / feasibility prediction</th>
                  <td>
                    {
                      assessDrying(
                        before,
                        baseline.draft.targetMoisturePercentWb,
                      ).label
                    }
                  </td>
                  <td>
                    {
                      assessDrying(
                        after,
                        baseline.draft.targetMoisturePercentWb,
                      ).label
                    }
                  </td>
                </tr>
                <tr>
                  <th scope="row">Model validation</th>
                  <td>{validationLabel(before.validation?.status)}</td>
                  <td>{validationLabel(after.validation?.status)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="body-copy">
            If a target is not reached, the duration is the simulated attempt
            within your drying window.
          </p>
          <div className="comparison-legend">
            <span>
              <i className="legend-dot" />
              Before · {baseTemperature}°C
            </span>
            <span>
              <i className="legend-dot after" />
              After · {result.temperature}°C
            </span>
          </div>
          <PreviewChart
            points={points}
            label={`Before · ${baseTemperature}°C`}
            comparisonLabel={`After · ${result.temperature}°C`}
            unit="% wet basis"
            provenanceLabel="Model predictions · not measured"
            target={baseline.draft.targetMoisturePercentWb}
            xAxisLabel="Time (minutes)"
            yAxisLabel="Moisture (% wet basis)"
          />
          <h3>Updated recommendation</h3>
          <Recommendations plan={result.plan} error={result.planError} />
          <details className="advanced-inputs">
            <summary>View adjusted calculation checks</summary>
            {result.replan ? (
              <>
                <p>
                  Updated plan:{' '}
                  {validationLabel(result.replan.plan.validation.status)}.
                  Recomputed from the start of the drying window; no batch
                  progress was measured.
                </p>
                <p>
                  Replanning reasons: {result.replan.reason_codes.join(', ')}
                </p>
              </>
            ) : (
              <p>
                Additional replanning report unavailable.{' '}
                {result.replanError ||
                  'The existing replanning endpoint requires at least 15 minutes. The direct simulation above is still reported.'}
              </p>
            )}
            <p>
              Model: {after.model_version}. Estimated Thermal Energy:{' '}
              {after.energy_kwh} kWh.
            </p>
            <ul>
              {after.validation?.checks.map((check) => (
                <li key={check.code}>
                  {check.passed ? 'Pass' : 'Needs attention'}: {check.detail}
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </Panel>
  )
}
