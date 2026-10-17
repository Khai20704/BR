import { ArrowRight, CircleDashed, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import type { PlanningPreview } from '../../domain/models/PlanningPreview'
import { usePreviewQuery } from '@/shared/hooks/usePreviewQuery'
import {
  EmptyState,
  Notice,
  PageHeader,
  Panel,
  PreviewLabel,
  RequestState,
  Status,
} from '@/shared/components/ui'
export function PlanningPage({
  load,
}: {
  load: () => Promise<PlanningPreview>
}) {
  const q = usePreviewQuery('planning', load)
  const [previewState, setPreviewState] = useState<
    'NEED_MORE_DATA' | 'NO_FEASIBLE_PLAN' | 'NOT_VALIDATED'
  >('NEED_MORE_DATA')
  return (
    <>
      <PageHeader
        eyebrow="DECISION INTELLIGENCE / PLANNING"
        title="AI planning"
        description="From thermal context to a plan you can inspect."
        action={<Status value="NEED_MORE_DATA" />}
      />
      <RequestState
        pending={q.isPending}
        error={q.error}
        retry={() => void q.refetch()}
      />
      <Notice>
        No AI request, optimization, or tool execution has occurred. These are
        interface examples only.
      </Notice>
      {q.data && (
        <Panel
          className="section-gap"
          title="Decision state preview"
          subtitle="PREVIEW DATA · test interface states, not engineering conclusions"
        >
          <div className="field">
            <label htmlFor="planning-state">Preview a response state</label>
            <select
              id="planning-state"
              value={previewState}
              onChange={(event) => {
                const value = event.target.value
                if (
                  value === 'NEED_MORE_DATA' ||
                  value === 'NO_FEASIBLE_PLAN' ||
                  value === 'NOT_VALIDATED'
                )
                  setPreviewState(value)
              }}
            >
              <option value="NEED_MORE_DATA">NEED_MORE_DATA</option>
              <option value="NO_FEASIBLE_PLAN">NO_FEASIBLE_PLAN</option>
              <option value="NOT_VALIDATED">NOT_VALIDATED</option>
            </select>
          </div>
          <div className="section-gap">
            <Status value={previewState} />
          </div>
          <p className="body-copy">
            {previewState === 'NO_FEASIBLE_PLAN'
              ? 'Example response: no candidate satisfies the supplied constraints. Review inputs before requesting another plan. This is not an evaluated result.'
              : previewState === 'NOT_VALIDATED'
                ? 'Example response: a candidate must pass backend validation before use. No validation has occurred.'
                : 'Example response: provide measured thermal data, material properties, and operating constraints.'}
          </p>
        </Panel>
      )}
      <div className="plan-grid section-gap">
        {q.data ? (
          q.data.options.map((option, i) => (
            <Panel
              key={option.name}
              title={option.name}
              subtitle={'SCENARIO TYPE 0' + (i + 1)}
              action={<ArrowRight size={17} />}
            >
              <PreviewLabel />
              <p className="body-copy">{option.description}</p>
              <div className="info-row">
                <span>Estimated completion</span>
                <strong>·</strong>
              </div>
              <div className="info-row">
                <span>Validated outcome</span>
                <strong>None</strong>
              </div>
              <Status value="NOT_VALIDATED" />
            </Panel>
          ))
        ) : (
          <Panel title="Plan options">
            <EmptyState />
          </Panel>
        )}
      </div>
      <div className="two-column section-gap">
        <Panel
          title="Tool execution timeline"
          subtitle="PREVIEW DATA · workflow outline, not an execution trace"
        >
          {q.data ? (
            <ol className="timeline">
              {q.data.steps.map((step, i) => (
                <li key={step}>
                  <span className="timeline-marker">
                    <CircleDashed size={16} />
                  </span>
                  <div>
                    <span className="micro">STEP 0{i + 1} · NOT EXECUTED</span>
                    <h3>{step}</h3>
                    <p>No invocation, duration, or result recorded.</p>
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
              No reasoning has been generated. Future summaries will explain the
              inputs, constraints, and trade-offs behind a backend-generated
              plan.
            </p>
          </Panel>
          <Panel title="Safety validation" action={<ShieldCheck size={19} />}>
            <Status value="NOT_VALIDATED" />
            <p className="body-copy">
              No validator is connected. No plan is approved for operation.
            </p>
          </Panel>
        </div>
      </div>
    </>
  )
}
