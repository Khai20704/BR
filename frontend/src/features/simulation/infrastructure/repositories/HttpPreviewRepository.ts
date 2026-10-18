import type { AxiosInstance } from 'axios'
import {
  simulationSchema,
  type SimulationPayload,
} from '@/core/api/backend-schemas'
import { toPlanStatus } from '@/core/preview/plan-types'
import { formatMinute } from '@/core/preview/format'
import { modelPredictionProvenance } from '@/core/provenance/Provenance'
import type { ScenarioDraft } from '@/core/scenario/scenario-draft'
import { postScenario } from '@/core/scenario/scenario-gateway'
import type { SimulationPreview } from '../../domain/models/SimulationPreview'
import type { PreviewRepository } from '../../domain/repositories/PreviewRepository'

export const SIMULATION_PATH = '/api/v1/simulations'

/** Map an integrated trajectory onto the simulation DTO. */
export function mapSimulation(payload: SimulationPayload): SimulationPreview {
  return {
    provenance: modelPredictionProvenance(payload.model_version),
    points: payload.points.map((point) => ({
      time: formatMinute(point.minute),
      moisture: point.moisture_percent_wb,
    })),
    status: toPlanStatus(payload.validation?.status ?? 'NOT_VALIDATED'),
    targetMoisturePercentWb: payload.target_moisture_percent_wb ?? undefined,
    targetAchieved: payload.target_achieved ?? undefined,
    validation: payload.validation
      ? {
          ...payload.validation,
          status: toPlanStatus(payload.validation.status),
        }
      : undefined,
    finalMoisturePercentWb: payload.final_moisture_percent_wb,
    durationMinutes: payload.duration_minutes,
    waterRemovedKg: payload.water_removed_kg,
    energyKwh: payload.energy_kwh,
    minimumEnergyKwh: payload.minimum_energy_kwh,
    modelVersion: payload.model_version,
    notes: payload.notes.map((note) =>
      note.replace(
        'Target moisture reached at minute',
        'Coarse model predicts target crossing at minute',
      ),
    ),
  }
}

/**
 * Integrate the entered scenario. Without phases the engine simulates the
 * optimizer's own schedule, which is what the digital twin shows.
 */
export async function loadScenarioSimulation(
  client: AxiosInstance,
  draft: ScenarioDraft,
): Promise<SimulationPreview> {
  const payload = await postScenario({
    client,
    path: SIMULATION_PATH,
    schema: simulationSchema,
    featureLabel: 'simulation',
    draft,
  })
  return mapSimulation(payload)
}

export function createHttpPreviewRepository(
  client: AxiosInstance,
  draft: ScenarioDraft,
): PreviewRepository {
  return {
    load: () => loadScenarioSimulation(client, draft),
  }
}
