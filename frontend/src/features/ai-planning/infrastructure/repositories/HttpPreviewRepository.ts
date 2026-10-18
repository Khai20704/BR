import { mapNarrative } from '@/core/preview/map-narrative'
import type { AxiosInstance } from 'axios'
import {
  planEnvelopeSchema,
  type PlanEnvelopePayload,
} from '@/core/api/backend-schemas'
import {
  toPlanStatus,
  type NarrativePreview,
} from '@/core/preview/plan-types'
import { modelPredictionProvenance } from '@/core/provenance/Provenance'
import type { ScenarioDraft } from '@/core/scenario/scenario-draft'
import { postScenario } from '@/core/scenario/scenario-gateway'
import type {
  PlanOptionPreview,
  PlanStepPreview,
  PlanningPreview,
} from '../../domain/models/PlanningPreview'
import type { PreviewRepository } from '../../domain/repositories/PreviewRepository'

export const PLAN_PATH = '/api/v1/plans'


/**
 * The timeline shows what actually ran. An empty trace is reported as an empty
 * trace — fallback narration is never presented as a tool invocation.
 */
function mapSteps(narrative: NarrativePreview): PlanStepPreview[] {
  if (narrative.toolTrace.length === 0)
    return [
      {
        label: 'No tool execution recorded',
        executed: false,
        detail:
          narrative.verification === 'LIVE_GEMINI_NOT_VERIFIED'
            ? 'A live Gemini call was attempted and did not complete.'
            : 'Gemini is not configured; narration was generated locally.',
      },
    ]
  return narrative.toolTrace.map((call) => ({
    label: call.name,
    executed: true,
    detail: `${call.ok ? 'returned' : 'failed'}: ${call.detail}`,
  }))
}

function mapOptions(plan: PlanEnvelopePayload['plan']): PlanOptionPreview[] {
  return plan.phases.map((phase) => ({
    name: `Hold ${phase.temperature_c.toFixed(1)} °C`,
    description: `${phase.duration_minutes} minutes at ${phase.temperature_c.toFixed(1)} °C, chosen by the optimizer.`,
  }))
}

export function mapPlanEnvelope(
  payload: PlanEnvelopePayload,
): PlanningPreview {
  const narrative = mapNarrative(payload.narrative)
  return {
    provenance: modelPredictionProvenance(
      payload.plan.metadata.model_version ?? 'unreported',
    ),
    status: toPlanStatus(payload.plan.status),
    phases: payload.plan.phases.map((phase) => ({
      temperatureC: phase.temperature_c,
      durationMinutes: phase.duration_minutes,
    })),
    rationale: payload.plan.rationale,
    validation: {
      status: toPlanStatus(payload.plan.validation.status),
      summary: payload.plan.validation.summary,
      checks: payload.plan.validation.checks,
    },
    narrative,
    options: mapOptions(payload.plan),
    steps: mapSteps(narrative),
    finalMoisturePercentWb:
      payload.plan.predicted?.final_moisture_percent_wb ?? null,
    energyKwh: payload.plan.predicted?.energy_kwh ?? null,
  }
}

/**
 * Optimize, validate and narrate the entered scenario. The backend runs the
 * deterministic optimizer and validator; Gemini only narrates what the tools
 * returned.
 */
export async function loadScenarioPlan(
  client: AxiosInstance,
  draft: ScenarioDraft,
): Promise<PlanningPreview> {
  const payload = await postScenario({
    client,
    path: PLAN_PATH,
    schema: planEnvelopeSchema,
    featureLabel: 'plan',
    draft,
  })
  return mapPlanEnvelope(payload)
}

export function createHttpPreviewRepository(
  client: AxiosInstance,
  draft: ScenarioDraft,
): PreviewRepository {
  return {
    load: () => loadScenarioPlan(client, draft),
  }
}
