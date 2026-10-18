import type { AxiosInstance } from 'axios'
import { requestBackend } from '@/core/api/request-backend'
import {
  massBalanceSchema,
  thermalWindowSchema,
} from '@/core/api/backend-schemas'
import { modelPredictionProvenance } from '@/core/provenance/Provenance'
import type { Provenance } from '@/core/provenance/Provenance'
import { SOURCE_WINDOW_PATH as THERMAL_WINDOW_PATH } from '@/core/scenario/scenario-gateway'

export const MASS_BALANCE_PATH = '/api/v1/physics/mass-balance'

/** Documented material properties for the workspace material. */
const MATERIAL = {
  material_id: 'spent-coffee-grounds',
  name: 'Spent coffee grounds',
  reference_rate_per_hour: 0.6,
  activation_energy_j_per_mol: 35_000,
  equilibrium_moisture_percent_wb: 6,
  max_safe_temperature_c: 70,
  specific_heat_j_per_kgk: 1_600,
}

const MIN_TEMPERATURE_C = 30
const MAX_TEMPERATURE_C = 60
const DEFAULT_RELATIVE_HUMIDITY = 0.55

export interface BatchMassBalanceInput {
  readonly massKg: number
  readonly initialMoisturePercentWb: number
  readonly targetMoisturePercentWb: number
  readonly durationHours: number
}

export interface BatchMassBalanceResult {
  readonly drySolidsKg: number
  readonly waterToRemoveKg: number
  readonly finalMassKg: number
  readonly minimumEnergyKwh: number
  readonly provenance: Provenance
}

/**
 * Ask the engine for the water duty of the entered batch. The thermal window is
 * read first so the request carries the same source the rest of the workspace
 * uses; only dry-solids bookkeeping is returned here.
 */
export function createBatchMassBalance(client: AxiosInstance) {
  return async (
    input: BatchMassBalanceInput,
  ): Promise<BatchMassBalanceResult> => {
    const window = await requestBackend({
      client,
      path: THERMAL_WINDOW_PATH,
      schema: thermalWindowSchema,
      featureLabel: 'source window',
    })

    const body = {
      batch: {
        batch_id: 'draft-batch',
        material: MATERIAL,
        mass_kg: input.massKg,
        initial_moisture_percent_wb: input.initialMoisturePercentWb,
        target_moisture_percent_wb: input.targetMoisturePercentWb,
      },
      profile: {
        source_id: window.source_id,
        name: window.name,
        samples: window.points.map((point) => ({
          minute: point.minute,
          temperature_c: point.temperature_c,
          available_heat_kw: point.available_heat_kw,
          relative_humidity: DEFAULT_RELATIVE_HUMIDITY,
        })),
      },
      constraints: {
        max_duration_minutes: Math.max(1, Math.round(input.durationHours * 60)),
        min_temperature_c: MIN_TEMPERATURE_C,
        max_temperature_c: MAX_TEMPERATURE_C,
        max_relative_humidity: 0.85,
      },
    }

    const payload = await requestBackend({
      client,
      path: MASS_BALANCE_PATH,
      method: 'POST',
      body,
      schema: massBalanceSchema,
      featureLabel: 'mass balance',
    })

    return {
      drySolidsKg: payload.dry_solids_kg,
      waterToRemoveKg: payload.water_to_remove_kg,
      finalMassKg: payload.final_mass_kg,
      minimumEnergyKwh: payload.minimum_energy_kwh,
      provenance: modelPredictionProvenance(
        window.provenance.model_version,
        'Computed from the entered batch with documented material properties and the backend source window. A prediction, not a measurement.',
      ),
    }
  }
}
