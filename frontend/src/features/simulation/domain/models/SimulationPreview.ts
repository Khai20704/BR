import type { Provenance } from '@/core/provenance/Provenance'
import type { PlanStatus } from '@/core/preview/plan-types'

export interface MoisturePointPreview {
  readonly time: string
  readonly moisture: number
}

/** An integrated drying trajectory produced by the engine. */
export interface SimulationPreview {
  readonly provenance: Provenance
  readonly points: readonly MoisturePointPreview[]
  readonly status: PlanStatus
  readonly finalMoisturePercentWb: number
  readonly durationMinutes: number
  readonly waterRemovedKg: number
  readonly energyKwh: number
  readonly minimumEnergyKwh: number
  readonly modelVersion: string
  readonly notes: readonly string[]
}
