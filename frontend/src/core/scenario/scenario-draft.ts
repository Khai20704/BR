import type { ThermalWindowPayload } from '@/core/api/backend-schemas'

/**
 * The scenario the operator is editing. It is an input, never a result: every
 * value here is either a documented default or something typed into a form, and
 * the backend decides what it means.
 */
export interface ScenarioDraft {
  readonly sourceTemperatureC?: number
  readonly availableHeatKw?: number
  readonly batchId: string
  readonly massKg: number
  readonly initialMoisturePercentWb: number
  readonly targetMoisturePercentWb: number
  readonly maxDurationMinutes: number
  readonly minTemperatureC: number
  readonly maxTemperatureC: number
  readonly relativeHumidity: number
}

/** Documented properties of the workspace material (not a measurement). */
export const DOCUMENTED_MATERIAL = {
  material_id: 'spent-coffee-grounds',
  name: 'Spent coffee grounds',
  reference_rate_per_hour: 0.6,
  activation_energy_j_per_mol: 35_000,
  equilibrium_moisture_percent_wb: 6,
  max_safe_temperature_c: 70,
  specific_heat_j_per_kgk: 1_600,
} as const

/** The documented demo scenario the backend also serves from `/workspace`. */
export const DOCUMENTED_DRAFT: ScenarioDraft = {
  batchId: 'draft-batch',
  massKg: 12,
  initialMoisturePercentWb: 62,
  targetMoisturePercentWb: 25,
  maxDurationMinutes: 480,
  minTemperatureC: 30,
  maxTemperatureC: 60,
  relativeHumidity: 0.55,
}

/** True when the draft still matches the documented demo inputs. */
export function isDocumentedDraft(draft: ScenarioDraft): boolean {
  return (
    draft.sourceTemperatureC === undefined &&
    draft.availableHeatKw === undefined &&
    draft.massKg === DOCUMENTED_DRAFT.massKg &&
    draft.initialMoisturePercentWb ===
      DOCUMENTED_DRAFT.initialMoisturePercentWb &&
    draft.targetMoisturePercentWb ===
      DOCUMENTED_DRAFT.targetMoisturePercentWb &&
    draft.maxDurationMinutes === DOCUMENTED_DRAFT.maxDurationMinutes &&
    draft.minTemperatureC === DOCUMENTED_DRAFT.minTemperatureC &&
    draft.maxTemperatureC === DOCUMENTED_DRAFT.maxTemperatureC
  )
}

/** The scenario request body accepted by every engineering POST. */
export interface ScenarioRequestBody {
  readonly batch: {
    readonly batch_id: string
    readonly material: typeof DOCUMENTED_MATERIAL
    readonly mass_kg: number
    readonly initial_moisture_percent_wb: number
    readonly target_moisture_percent_wb: number
  }
  readonly profile: {
    readonly source_id: string
    readonly name: string
    readonly samples: readonly {
      readonly minute: number
      readonly temperature_c: number
      readonly available_heat_kw: number
      readonly relative_humidity: number
    }[]
  }
  readonly constraints: {
    readonly max_duration_minutes: number
    readonly min_temperature_c: number
    readonly max_temperature_c: number
    readonly max_relative_humidity: number
  }
}

/**
 * Combine the operator's batch with the backend's documented source window.
 * The window comes from the backend so the batch is never paired with invented
 * heat data.
 */
export function buildScenarioBody(
  draft: ScenarioDraft,
  window: ThermalWindowPayload,
): ScenarioRequestBody {
  return {
    batch: {
      batch_id: draft.batchId,
      material: DOCUMENTED_MATERIAL,
      mass_kg: draft.massKg,
      initial_moisture_percent_wb: draft.initialMoisturePercentWb,
      target_moisture_percent_wb: draft.targetMoisturePercentWb,
    },
    profile: {
      source_id: window.source_id,
      name: window.name,
      samples: window.points.map((point) => ({
        minute: point.minute,
        temperature_c: draft.sourceTemperatureC ?? point.temperature_c,
        available_heat_kw: draft.availableHeatKw ?? point.available_heat_kw,
        relative_humidity: draft.relativeHumidity,
      })),
    },
    constraints: {
      max_duration_minutes: draft.maxDurationMinutes,
      min_temperature_c: draft.minTemperatureC,
      max_temperature_c: draft.maxTemperatureC,
      max_relative_humidity: 0.85,
    },
  }
}

/** An honest description of where the inputs came from. */
export function describeScenarioInputs(draft: ScenarioDraft): string {
  return isDocumentedDraft(draft)
    ? 'Documented default scenario supplied by the backend. Not a measurement.'
    : `Scenario entered in this workspace (${draft.massKg} kg, ${draft.initialMoisturePercentWb}% to ${draft.targetMoisturePercentWb}% wet basis, ${draft.maxDurationMinutes} min window). Not a measurement.`
}
