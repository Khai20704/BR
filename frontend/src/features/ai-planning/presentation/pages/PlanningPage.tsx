import { CircleDashed, CheckCircle2, ShieldCheck } from 'lucide-react'
import type { PlanningPreview } from '../../domain/models/PlanningPreview'
import type { ScenarioDraft } from '@/core/scenario/scenario-draft'
import { useScenario } from '@/core/scenario/ScenarioProvider'
import { usePreviewQuery } from '@/shared/hooks/usePreviewQuery'
import { formatMeasurement } from '@/core/preview/format'
import {
  Badge,
  EmptyState,
  Notice,
  PageHeader,
  Panel,
  ProvenanceTag,
  RequestState,
  Status,
} from '@/shared/components/ui'

function VerificationBadge({
  verification,
}: {
  verification: PlanningPreview['narrative']['verification']
}) {
  if (verification === 'LIVE_GEMINI_VERIFIED')
    return <Badge tone="green">LIVE_GEMINI_VERIFIED</Badge>
  if (verification === 'LIVE_GEMINI_NOT_VERIFIED')
    return <Badge tone="amber">LIVE_GEMINI_NOT_VERIFIED</Badge>
  return <Badge>GEMINI_DISABLED · DETERMINISTIC NARRATION</Badge>
}

export function PlanningPage({
  load,
}: {
  load: (draft: ScenarioDraft) => Promise<PlanningPreview>
}) {
  const { draft, revision } = useScenario()
  const q = usePreviewQuery('planning', () => load(draft), revision)
  const data = q.data
  return (
    <>
      <PageHeader
        eyebrow="DECISION INTELLIGENCE / PLANNING"
        title="AI planning"
        description="From thermal context to a plan you can inspect."
        action={
          data ? (
            <Status value={data.status} />
          ) : (
            <Status value="NEED_MORE_DATA" />
          )
        }
      />
      <RequestState
        pending={q.isPending}
        error={q.error}
        retry={() => void q.refetch()}
      />
      {data ? (
        <Notice>
          Engine output, not an experimental result. {data.validation.summary}
        </Notice>
      ) : (
        <Notice>
          No plan has been calculated. This page never substitutes sample values
          for a missing response.
        </Notice>
      )}
      {data && (
        <Panel
          className="section-gap"
          title="Decision state"
          subtitle="Plan status and its independent validation"
          action={<ProvenanceTag provenance={data.provenance} />}
        >
          <div className="info-row">
            <span>Validation</span>
            <Status value={data.validation.status} />
          </div>
          <div className="info-row">
            <span>Predicted final moisture</span>
            <strong>
              {formatMeasurement(data.finalMoisturePercentWb, '% wb', 2)}
            </strong>
          </div>
          <div className="info-row">
            <span>Predicted energy</span>
            <strong>{formatMeasurement(data.energyKwh, 'kWh', 3)}</strong>
          </div>
          {data.validation.checks.length > 0 && (
            <ul className="checklist section-gap">
              {data.validation.checks.map((check) => (
                <li key={check.code}>
                  {check.passed ? 'PASS' : 'FAIL'} · {check.code} —{' '}
                  {check.detail}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
      <div className="plan-grid section-gap">
        {data && data.options.length > 0 ? (
          data.options.map((option, i) => (
            <Panel
              key={option.name + i}
              title={option.name}
              subtitle={'PHASE 0' + (i + 1)}
            >
              <p className="body-copy">{option.description}</p>
              <Status value={data.validation.status} />
            </Panel>
          ))
        ) : (
          <Panel title="Plan options">
            <EmptyState title="No plan">
              No optimizer output is available for this scenario.
            </EmptyState>
          </Panel>
        )}
      </div>
      <div className="two-column section-gap">
        <Panel
          title="Tool execution timeline"
          subtitle="Recorded tool calls · empty when no tool ran"
          action={
            <VerificationBadge
              verification={data?.narrative.verification ?? 'GEMINI_DISABLED'}
            />
          }
        >
          {data && data.steps.length > 0 ? (
            <ol className="timeline">
              {data.steps.map((step, i) => (
                <li key={step.label + i}>
                  <span className="timeline-marker">
                    {step.executed ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <CircleDashed size={16} />
                    )}
                  </span>
                  <div>
                    <span className="micro">
                      STEP 0{i + 1} ·{' '}
                      {step.executed ? 'EXECUTED' : 'NOT EXECUTED'}
                    </span>
                    <h3>{step.label}</h3>
                    <p>{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState title="No tool executions" />
          )}
        </Panel>
        <div className="stack">
          <Panel title="Reasoning summary">
            <p className="body-copy">
              {data?.narrative.text ??
                'No reasoning has been generated for this workspace.'}
            </p>
            {data && (
              <div className="info-row">
                <span>Narration provider</span>
                <strong>{data.narrative.provider}</strong>
              </div>
            )}
          </Panel>
          <Panel title="Safety validation" action={<ShieldCheck size={19} />}>
            <Status value={data?.validation.status ?? 'NOT_VALIDATED'} />
            <p className="body-copy">
              {data
                ? 'The validator re-integrated the schedule independently of the optimizer. Validation is not an experimental proof.'
                : 'No validator result is available. No plan is approved for operation.'}
            </p>
          </Panel>
        </div>
      </div>
    </>
  )
}
