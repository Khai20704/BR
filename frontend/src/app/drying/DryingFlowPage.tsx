import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { useScenario } from '@/core/scenario/ScenarioProvider'
import type { ScenarioDraft } from '@/core/scenario/scenario-draft'
import { PageHeader, Panel } from '@/shared/components/ui'
import { PreviewChart } from '@/shared/components/PreviewChart'
import { dryingServices } from '../preview-services'
import { DryingBatchForm } from './DryingBatchForm'
import { DryingSummary } from './DryingResults'
import { Recommendations } from './Recommendations'
import { WhatIfSimulation } from './WhatIfSimulation'
import { CalculationDetails } from './CalculationDetails'
import { withPlanValidation } from './assessment'
import { errorMessage, type DryingServices, type DryingRun } from './types'

export function DryingFlowPage({
  services = dryingServices,
}: {
  services?: DryingServices
}) {
  const { draft, replaceDraft } = useScenario()
  const [baseline, setBaseline] = useState<DryingRun | null>(null)
  const [busy, setBusy] = useState(false)
  const [planBusy, setPlanBusy] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  async function generate(next: ScenarioDraft) {
    setBusy(true)
    try {
      await replaceDraft(next)
      const [simulation, plan, balance] = await Promise.allSettled([
        services.simulate(next),
        services.plan(next),
        services.massBalance(next),
      ])
      if (simulation.status === 'rejected')
        throw new Error(
          `The drying calculation could not finish. ${errorMessage(simulation.reason)} Your inputs are saved; select Generate AI Drying Plan to retry.`,
        )
      setBaseline({
        draft: { ...next },
        simulation: withPlanValidation(
          simulation.value,
          plan.status === 'fulfilled' ? plan.value : null,
          next.targetMoisturePercentWb,
        ),
        plan: plan.status === 'fulfilled' ? plan.value : null,
        planError: plan.status === 'rejected' ? errorMessage(plan.reason) : '',
        balance: balance.status === 'fulfilled' ? balance.value : null,
        balanceError:
          balance.status === 'rejected' ? errorMessage(balance.reason) : '',
      })
      window.requestAnimationFrame(() => {
        heading.current?.focus()
        heading.current?.scrollIntoView?.({ block: 'start' })
      })
    } finally {
      setBusy(false)
    }
  }
  async function retryPlan() {
    if (!baseline || planBusy) return
    setPlanBusy(true)
    try {
      const plan = await services.plan(baseline.draft)
      setBaseline((current) =>
        current ? { ...current, plan, planError: '' } : current,
      )
    } catch (e) {
      setBaseline((current) =>
        current ? { ...current, planError: errorMessage(e) } : current,
      )
    } finally {
      setPlanBusy(false)
    }
  }
  return (
    <div className="drying-flow">
      {!baseline ? (
        <>
          <PageHeader
            eyebrow="FROM YOUR SHOP TO A NEW POSSIBILITY"
            title="Create a Drying Batch"
            description="Tell us what you want to dry. We will estimate a plan using your batch and AC heat."
          />
          {busy && (
            <p role="status" className="notice">
              Saving your batch, calculating drying predictions, and requesting
              an explanation…
            </p>
          )}
          <DryingBatchForm draft={draft} generate={generate} />
        </>
      ) : (
        <>
          <div className="page-heading">
            <div>
              <div className="eyebrow">A PLAN TO EXPLORE</div>
              <h1 ref={heading} tabIndex={-1}>
                Your AI Drying Plan
              </h1>
              <p>
                Based on your {baseline.draft.massKg} kg batch and{' '}
                {baseline.draft.sourceTemperatureC}°C AC heat estimate.
              </p>
            </div>
            <button
              className="button secondary"
              disabled={planBusy}
              onClick={() => setBaseline(null)}
            >
              Edit batch inputs
            </button>
          </div>
          <div className="drying-results" aria-label="Original drying plan">
            <DryingSummary
              simulation={baseline.simulation}
              target={baseline.draft.targetMoisturePercentWb}
            />
            <Panel title="AI Recommendations">
              <Recommendations
                plan={baseline.plan}
                error={baseline.planError}
                retry={() => void retryPlan()}
                busy={planBusy}
              />
            </Panel>
            <Panel
              title="Moisture Prediction Chart"
              subtitle="The predicted moisture level over time."
            >
              {baseline.simulation.points.length ? (
                <PreviewChart
                  points={baseline.simulation.points.map((point) => ({
                    time: point.minute,
                    value: point.moisture_percent_wb,
                  }))}
                  label="Predicted moisture"
                  unit="% wet basis"
                  provenanceLabel="Model prediction · not measured"
                  target={baseline.draft.targetMoisturePercentWb}
                  xAxisLabel="Time (minutes)"
                  yAxisLabel="Moisture (% wet basis)"
                />
              ) : (
                <p>The engine returned no chart samples for this attempt.</p>
              )}
            </Panel>
            <WhatIfSimulation
              key={baseline.draft.batchId}
              baseline={baseline}
              services={services}
            />
            <CalculationDetails baseline={baseline} services={services} />
          </div>
          <p className="body-copy">
            Your calculations are saved to{' '}
            <Link to="/history">Drying History</Link>. Check the save status
            above before leaving.
          </p>
        </>
      )}
    </div>
  )
}
