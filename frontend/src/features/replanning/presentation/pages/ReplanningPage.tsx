import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ArrowRight, LoaderCircle, RefreshCw, Thermometer } from 'lucide-react'
import type { ReplanningPreview } from '../../domain/models/ReplanningPreview'
import type { ScenarioDraft } from '@/core/scenario/scenario-draft'
import { useScenario } from '@/core/scenario/ScenarioProvider'
import { formatMeasurement } from '@/core/preview/format'
import {
  EmptyState,
  Notice,
  PageHeader,
  Panel,
  ProvenanceTag,
  Status,
} from '@/shared/components/ui'

export function ReplanningPage({
  replan,
  preview,
}: {
  replan: (
    draft: ScenarioDraft,
    temperatureC: number,
  ) => Promise<ReplanningPreview>
  preview: boolean
}) {
  const { draft, revision } = useScenario()
  const [temperature, setTemperature] = useState(42)
  const [submitted, setSubmitted] = useState<number | null>(null)
  const mutation = useMutation({
    mutationFn: async (value: number) => {
      const baselineTemperature = draft.sourceTemperatureC ?? 42
      const baseline = await replan(draft, baselineTemperature)
      const result = value === baselineTemperature ? baseline : await replan(draft, value)
      return { result, baseline, baselineTemperature, temperature: value, revision }
    },
  })
  const stale = mutation.data?.temperature !== temperature
  const current = mutation.data?.revision === revision ? mutation.data : undefined
  const data = current?.result
  const before = current?.baseline
  return (
    <>
      <PageHeader
        eyebrow="DECISION INTELLIGENCE / ADAPTATION"
        title="Adaptive replanning"
        description="When conditions change, review the decision before acting."
        action={data ? <ProvenanceTag provenance={data.provenance} /> : undefined}
      />
      <div className="two-column">
        <Panel
          title="Changed thermal condition"
          subtitle="Manual scenario input · not a sensor reading"
          action={<Thermometer size={19} />}
        >
          <div className="slider-value">
            {temperature}
            <span>°C</span>
          </div>
          <label htmlFor="temperature" className="slider-label">
            Heat source temperature
          </label>
          <input
            className="temperature-slider"
            id="temperature"
            type="range"
            min="20"
            max="70"
            step="1"
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
          />
          <div className="slider-range">
            <span>20 °C</span>
            <span>Scenario range only</span>
            <span>70 °C</span>
          </div>
          <Notice>
            Changing the slider does not send a control command. Replanning
            re-optimizes from minute zero; elapsed drying and measured batch progress are not entered in this MVP.
          </Notice>
          <div className="form-footer">
            <span>
              {preview
                ? 'SYNTHETIC / UI PREVIEW'
                : 'Backend replan · model prediction'}
            </span>
            <button
              className="button primary"
              disabled={mutation.isPending}
              onClick={() => {
                setSubmitted(temperature)
                mutation.mutate(temperature)
              }}
            >
              {mutation.isPending ? (
                <LoaderCircle size={15} className="spin" />
              ) : (
                <RefreshCw size={15} />
              )}{' '}
              {mutation.isPending ? 'Requesting…' : 'Replan'}
            </button>
          </div>
        </Panel>
        <Panel title="Decision state" subtitle="Explicit request required">
          {mutation.isPending ? (
            <p role="status">Recalculating the remaining window…</p>
          ) : mutation.isError ? (
            <div role="alert">
              <Status value="NEED_MORE_DATA" />
              <h3>Backend disconnected</h3>
              <p className="body-copy">{mutation.error.message}</p>
            </div>
          ) : data ? (
            <>
              <div className="section-gap">
                <Status value={data.status} />
              </div>
              <p className="body-copy">
                Replanned for {submitted} °C. Remaining window{' '}
                {data.remainingMinutes} minutes.
                {stale ? ' Inputs have changed; request a new replan.' : ''}
              </p>
              <div className="reason-codes">
                {data.reasonCodes.map((code) => (
                  <code key={code}>{code}</code>
                ))}
              </div>
            </>
          ) : (
            <>
              <Status value="NEED_MORE_DATA" />
              <p className="body-copy">
                Choose a scenario temperature, then select Replan. There is no
                automatic execution.
              </p>
            </>
          )}
        </Panel>
      </div>
      <Panel
        className="section-gap"
        title="Before & after"
        subtitle={
          data
            ? 'Computed baseline and changed source, using the same batch and available heat'
            : 'No optimization result is available'
        }
      >
        <div className="comparison">
          <div>
            <span className="eyebrow">PREVIOUS PLAN</span>
            <h3>{before ? `${current?.baselineTemperature} C source temperature` : 'Not requested'}</h3>
            <p>
              Duration {formatMeasurement(before?.durationMinutes ?? null, 'min', 0)}<br />
              Energy {formatMeasurement(before?.energyKwh ?? null, 'kWh', 3)}<br />
              Final moisture {formatMeasurement(before?.finalMoisturePercentWb ?? null, '% wb', 2)}
            </p>
          </div>
          <ArrowRight className="comparison-arrow" />
          <div>
            <span className="eyebrow">REQUESTED SCENARIO</span>
            <h3>
              {submitted === null
                ? 'Awaiting request'
                : submitted + ' °C source temperature'}
            </h3>
            {data ? (
              <p>
                Duration {formatMeasurement(data.durationMinutes, 'min', 0)}
                <br />
                Energy {formatMeasurement(data.energyKwh, 'kWh', 3)}
                <br />
                Final moisture{' '}
                {formatMeasurement(data.finalMoisturePercentWb, '% wb', 2)}
              </p>
            ) : (
              <p>
                New duration —<br />
                Energy impact —<br />
                Feasibility —
              </p>
            )}
          </div>
        </div>
      </Panel>
      {data && data.narrative.text && (
        <Panel className="section-gap" title="Narration">
          <p className="body-copy">{data.narrative.text}</p>
          <div className="info-row">
            <span>Provider</span>
            <strong>{data.narrative.provider}</strong>
          </div>
          <div className="info-row">
            <span>Gemini verification</span>
            <strong>{data.narrative.verification}</strong>
          </div>
        </Panel>
      )}
      {!data && !mutation.isError && !mutation.isPending && (
        <Panel className="section-gap" title="Replanned schedule">
          <EmptyState title="No replan yet">
            Nothing has been calculated. Request a replan to see engine output.
          </EmptyState>
        </Panel>
      )}
    </>
  )
}
