import { useState, type FormEvent } from 'react'
import { useScenario } from '@/core/scenario/ScenarioProvider'
import {
  DOCUMENTED_DRAFT,
  type ScenarioDraft,
} from '@/core/scenario/scenario-draft'
import { draftSchema } from '@/core/workspace/model'
import { Notice, Panel } from '@/shared/components/ui'

export function ThermalScenarioForm({
  onRun,
}: {
  onRun: (run: boolean) => void
}) {
  const { draft, ready, replaceDraft } = useScenario()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState<ScenarioDraft | null>(null)
  async function apply(next: ScenarioDraft) {
    setBusy(true)
    setError('')
    setRetry(next)
    onRun(false)
    try {
      await replaceDraft(next)
      setRetry(null)
      onRun(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save scenario.')
    } finally {
      setBusy(false)
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const number = (name: string) => Number(fields.get(name))
    const next = {
      ...draft,
      sourceTemperatureC: number('sourceTemperatureC'),
      availableHeatKw: number('availableHeatKw'),
      maxDurationMinutes: number('maxDurationMinutes'),
      relativeHumidity: number('humidity') / 100,
      minTemperatureC: number('minTemperatureC'),
      maxTemperatureC: number('maxTemperatureC'),
    }
    if (!draftSchema.safeParse(next).success) {
      setError(
        'Check input ranges. Minimum temperature must be below maximum temperature.',
      )
      return
    }
    void apply(next)
  }
  const fields = [
    {
      name: 'sourceTemperatureC',
      label: 'Source temperature (°C)',
      value: draft.sourceTemperatureC ?? 43,
      min: 20,
      max: 70,
      step: 'any',
    },
    {
      name: 'availableHeatKw',
      label: 'Available waste heat (kW)',
      value: draft.availableHeatKw ?? 2.4,
      min: 0,
      max: 10000,
      step: 'any',
    },
    {
      name: 'maxDurationMinutes',
      label: 'Operating duration (minutes)',
      value: draft.maxDurationMinutes,
      min: 1,
      max: 10080,
      step: '1',
    },
    {
      name: 'humidity',
      label: 'Relative humidity (%)',
      value: Number((draft.relativeHumidity * 100).toFixed(6)),
      min: 0,
      max: 100,
      step: 'any',
    },
    {
      name: 'minTemperatureC',
      label: 'Minimum drying temperature (°C)',
      value: draft.minTemperatureC,
      min: 0,
      max: 200,
      step: 'any',
    },
    {
      name: 'maxTemperatureC',
      label: 'Maximum drying temperature (°C)',
      value: draft.maxTemperatureC,
      min: 0,
      max: 200,
      step: 'any',
    },
  ]
  return (
    <Panel
      title="Thermal Scenario Configuration"
      className="section-gap"
      subtitle="Synthetic scenario inputs, not measured data. Apply creates a constant source over the entered duration."
    >
      <form key={JSON.stringify(draft)} onSubmit={submit}>
        {draft.sourceTemperatureC === undefined && (
          <p className="body-copy">
            The varying demo source curve is active. The source values below are
            starting values for a new constant-source scenario; Apply activates
            them.
          </p>
        )}
        <fieldset disabled={busy || !ready} className="thermal-fields">
          {fields.map((field) => (
            <label key={field.name}>
              {field.label}
              <input
                required
                type="number"
                name={field.name}
                defaultValue={field.value}
                min={field.min}
                max={field.max}
                step={field.step}
              />
            </label>
          ))}
        </fieldset>
        <Notice>
          Relative humidity is saved and sent to the API, but sample humidity
          does not change this model's drying prediction. Equilibrium moisture
          uses a fixed 85% maximum humidity constraint. The material safety
          ceiling is 70°C.
        </Notice>
        <p className="body-copy">
          Target: {draft.targetMoisturePercentWb}% wet-basis. Edit batch mass
          and moisture targets in Batch setup. Reset restores the complete
          documented demo scenario and its varying source curve.
        </p>
        <div className="thermal-actions">
          <button
            className="button primary"
            disabled={busy || !ready}
            type="submit"
          >
            {busy ? 'Saving scenario…' : 'Apply & Simulate'}
          </button>
          <button
            className="button secondary"
            disabled={busy || !ready}
            type="button"
            onClick={() => void apply(DOCUMENTED_DRAFT)}
          >
            Reset to Demo
          </button>
          {error && retry && (
            <button
              className="button secondary"
              type="button"
              disabled={busy}
              onClick={() => void apply(retry)}
            >
              Retry save & simulate
            </button>
          )}
        </div>
        {error && <p role="alert">{error}</p>}
      </form>
    </Panel>
  )
}
