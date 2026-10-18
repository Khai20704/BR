import { useState } from 'react'
import type { BenchmarkPreview } from '@/features/benchmark/domain/models/BenchmarkPreview'
import { errorMessage, type DryingRun, type DryingServices } from './types'
import { validationLabel } from './assessment'

export function CalculationDetails({
  baseline,
  services,
}: {
  baseline: DryingRun
  services: DryingServices
}) {
  const [benchmark, setBenchmark] = useState<BenchmarkPreview | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function compare() {
    setBusy(true)
    setError('')
    try {
      setBenchmark(await services.benchmark(baseline.draft))
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  const { simulation, plan, balance, draft } = baseline
  return (
    <details className="panel calculation-details">
      <summary>View Calculation Details</summary>
      <h3>Estimated Thermal Energy</h3>
      <p>
        {simulation.energy_kwh} kWh of modeled thermal demand. This is not
        measured electricity consumption or savings.
      </p>
      <p>
        Minimum thermal energy to reach the requested target:{' '}
        {simulation.minimum_energy_kwh} kWh.
      </p>
      <h3>Mass balance</h3>
      <p>
        The simulation predicts {simulation.water_removed_kg} kg of water
        removed.
      </p>
      {balance ? (
        <dl className="calculation-list">
          <div>
            <dt>Dry solids</dt>
            <dd>{balance.dry_solids_kg} kg</dd>
          </div>
          <div>
            <dt>Initial water</dt>
            <dd>{balance.initial_water_kg} kg</dd>
          </div>
          <div>
            <dt>Water to remove to reach the target</dt>
            <dd>{balance.water_to_remove_kg} kg</dd>
          </div>
          <div>
            <dt>Final wet mass at the requested target</dt>
            <dd>{balance.final_mass_kg} kg</dd>
          </div>
        </dl>
      ) : (
        <p>
          Additional target mass-balance values are unavailable.{' '}
          {baseline.balanceError}
        </p>
      )}
      <h3>Technical feasibility checks</h3>
      <p>{validationLabel(simulation.validation?.status)}</p>
      <ul className="checklist">
        {simulation.validation?.checks.map((check) => (
          <li key={check.code}>
            {check.passed ? 'Pass' : 'Needs attention'} · {check.code}:{' '}
            {check.detail}
          </li>
        ))}
      </ul>
      {!simulation.validation && (
        <p>This response did not include independent validation.</p>
      )}
      <h3>Model assumptions</h3>
      <ul className="checklist">
        {simulation.notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
      <p>
        Constant source: {draft.sourceTemperatureC}°C and{' '}
        {draft.availableHeatKw} kW over {draft.maxDurationMinutes} minutes.
        Drying temperature range: {draft.minTemperatureC}–
        {draft.maxTemperatureC}°C, capped by the material safety limit.
      </p>
      <p>
        Recorded relative humidity:{' '}
        {Number((draft.relativeHumidity * 100).toFixed(6))}%. Sample humidity
        does not change this model; equilibrium moisture uses the fixed maximum
        humidity constraint of 85%. Airflow and experimental calibration are not
        modeled.
      </p>
      <h3>Data provenance & model version</h3>
      <p>
        Source and batch values are examples or operator inputs. Output is a
        model prediction. There is no verified sensor data or experimental
        validation. Model version: {simulation.model_version}.
      </p>
      <h3>Gemini tool trace</h3>
      {plan ? (
        <>
          <p>
            Provider: {plan.narrative.provider}. Verification:{' '}
            {plan.narrative.verification}. Plan validation:{' '}
            {validationLabel(plan.plan.validation.status)}.
          </p>
          {plan.narrative.tool_trace.length ? (
            <ul>
              {plan.narrative.tool_trace.map((call, i) => (
                <li key={i}>
                  {call.name} · {call.ok ? 'Completed' : 'Failed'}
                  <pre>{call.arguments}</pre>
                  <p>{call.detail}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>No Gemini tool calls were recorded.</p>
          )}
        </>
      ) : (
        <p>No recommendation response or tool trace is available.</p>
      )}
      <h3>Benchmark evidence</h3>
      <p>
        Compare the existing drying methods for this original batch. All values
        are model predictions.
      </p>
      <button
        className="button secondary"
        onClick={() => void compare()}
        disabled={busy}
      >
        {busy
          ? 'Comparing methods…'
          : error
            ? 'Retry method comparison'
            : 'Compare drying methods'}
      </button>
      {error && <p role="alert">{error}</p>}
      {benchmark && (
        <div className="table-scroll">
          <table>
            <caption>Same batch, source, and model</caption>
            <thead>
              <tr>
                <th>Method</th>
                <th>Duration</th>
                <th>Final moisture</th>
                <th>Thermal energy</th>
                <th>Model checks</th>
              </tr>
            </thead>
            <tbody>
              {benchmark.methods.map((method) => (
                <tr key={method.method}>
                  <th scope="row">{method.method}</th>
                  <td>
                    {method.durationMinutes === null
                      ? 'Unavailable'
                      : `${method.durationMinutes} min`}
                  </td>
                  <td>
                    {method.finalMoisturePercentWb === null
                      ? 'Unavailable'
                      : `${method.finalMoisturePercentWb}%`}
                  </td>
                  <td>
                    {method.energyKwh === null
                      ? 'Unavailable'
                      : `${method.energyKwh} kWh`}
                  </td>
                  <td>{validationLabel(method.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </details>
  )
}
