import type { AxiosInstance } from 'axios'
import {
  replanEnvelopeSchema,
  type ReplanEnvelopePayload,
} from '@/core/api/backend-schemas'
import { toPlanStatus } from '@/core/preview/plan-types'
import { modelPredictionProvenance } from '@/core/provenance/Provenance'
import type { ScenarioDraft } from '@/core/scenario/scenario-draft'
import { postScenario } from '@/core/scenario/scenario-gateway'
import { mapNarrative } from '@/core/preview/map-narrative'
import type { ReplanningPreview } from '../../domain/models/ReplanningPreview'
import type { PreviewRepository } from '../../domain/repositories/PreviewRepository'

export const REPLANNING_PATH = '/api/v1/plans/replan'
export const DEFAULT_SCENARIO_TEMPERATURE_C = 42

export function mapReplanEnvelope(
  payload: ReplanEnvelopePayload,
): ReplanningPreview {
  const predicted = payload.plan.predicted
  return {
    provenance: modelPredictionProvenance(
      payload.plan.metadata.model_version ?? 'unreported',
    ),
    status: toPlanStatus(payload.plan.status),
    reasonCodes: payload.reason_codes,
    remainingMinutes: payload.remaining_minutes,
    changedTemperatureC: payload.changed_temperature_c,
    phases: payload.plan.phases.map((phase) => ({
      temperatureC: phase.temperature_c,
      durationMinutes: phase.duration_minutes,
    })),
    durationMinutes: predicted?.duration_minutes ?? null,
    energyKwh: predicted?.energy_kwh ?? null,
    finalMoisturePercentWb: predicted?.final_moisture_percent_wb ?? null,
    narrative: mapNarrative(payload.narrative),
  }
}

/**
 * Re-optimize the remaining window at an explicit heat-source temperature.
 * The changed temperature is a scenario input typed by the operator, never a
 * sensor reading.
 */
export function createReplanPreview(
  client: AxiosInstance,
  draft: ScenarioDraft,
) {
  return async (temperatureC: number): Promise<ReplanningPreview> => {
    const payload = await postScenario({
      client,
      path: REPLANNING_PATH,
      schema: replanEnvelopeSchema,
      featureLabel: 'replanning',
      draft,
      extra: { changed_temperature_c: temperatureC, elapsed_minutes: 0 },
    })
    return mapReplanEnvelope(payload)
  }
}

export function createHttpPreviewRepository(
  client: AxiosInstance,
  draft: ScenarioDraft,
): PreviewRepository {
  const replan = createReplanPreview(client, draft)
  return {
    load: () => replan(DEFAULT_SCENARIO_TEMPERATURE_C),
  }
}
