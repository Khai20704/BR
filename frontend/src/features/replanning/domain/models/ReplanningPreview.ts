import type { Provenance } from '@/core/provenance/Provenance'
import type {
  NarrativePreview,
  PlanPhasePreview,
  PlanStatus,
} from '@/core/preview/plan-types'

/** The plan produced after a heat-source change, with its reason codes. */
export interface ReplanningPreview {
  readonly provenance: Provenance
  readonly status: PlanStatus
  readonly reasonCodes: readonly string[]
  readonly remainingMinutes: number
  readonly changedTemperatureC: number
  readonly phases: readonly PlanPhasePreview[]
  readonly durationMinutes: number | null
  readonly energyKwh: number | null
  readonly finalMoisturePercentWb: number | null
  readonly narrative: NarrativePreview
}
