import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ArrowRight, LoaderCircle, RefreshCw, Thermometer } from 'lucide-react'
import type { ReplanningPreview } from '../../domain/models/ReplanningPreview'
import {
  Notice,
  PageHeader,
  Panel,
  PreviewLabel,
  Status,
} from '@/shared/components/ui'
export function ReplanningPage({
  load,
  preview,
}: {
  load: () => Promise<ReplanningPreview>
  preview: boolean
}) {
  const [temperature, setTemperature] = useState(42)
  const [submitted, setSubmitted] = useState<number | null>(null)
  const mutation = useMutation({
    mutationFn: async (value: number) => {
      await new Promise((resolve) => setTimeout(resolve, 500))
      const result = await load()
      return { result, temperature: value }
    },
  })
  const stale = mutation.data?.temperature !== temperature
  return (
    <>
      <PageHeader
        eyebrow="DECISION INTELLIGENCE / ADAPTATION"
        title="Adaptive replanning"
        description="When conditions change, review the decision before acting."
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
            Changing the slider does not run a model or send a control command.
          </Notice>
          <div className="form-footer">
            <span>
              {preview ? 'SYNTHETIC / UI PREVIEW' : 'Backend disconnected'}
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
            <p role="status">Requesting scenario preview…</p>
          ) : mutation.isError ? (
            <div role="alert">
              <Status value="NEED_MORE_DATA" />
              <h3>Backend disconnected</h3>
              <p className="body-copy">{mutation.error.message}</p>
            </div>
          ) : mutation.data ? (
            <>
              <PreviewLabel />
              <div className="section-gap">
                <Status value={mutation.data.result.status} />
              </div>
              <p className="body-copy">
                Preview reviewed for {submitted} °C. No plan has been calculated
                or validated.
                {stale ? ' Inputs have changed; request a new preview.' : ''}
              </p>
              <div className="reason-codes">
                {mutation.data.result.reasonCodes.map((code) => (
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
        subtitle="No optimization result is available"
      >
        <div className="comparison">
          <div>
            <span className="eyebrow">PREVIOUS PLAN</span>
            <h3>No validated plan</h3>
            <p>
              Duration —<br />
              Energy —<br />
              Final moisture —
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
            <p>
              New duration —<br />
              Energy impact —<br />
              Feasibility —
            </p>
          </div>
        </div>
      </Panel>
    </>
  )
}
