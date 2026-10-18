import type { Provenance } from '@/core/provenance/Provenance'
import type {
  NarrativePreview,
  PlanPhasePreview,
  PlanStatus,
  ValidationPreview,
} from '@/core/preview/plan-types'

export interface PlanOptionPreview {
  readonly name: string
  readonly description: string
}

export interface PlanStepPreview {
  readonly label: string
  readonly executed: boolean
  readonly detail: string
}

/** An optimized plan with its independent validation and agent narrative. */
export interface PlanningPreview {
  readonly provenance: Provenance
  readonly status: PlanStatus
  readonly phases: readonly PlanPhasePreview[]
  readonly rationale: readonly string[]
  readonly validation: ValidationPreview
  readonly narrative: NarrativePreview
  readonly options: readonly PlanOptionPreview[]
  readonly steps: readonly PlanStepPreview[]
  readonly finalMoisturePercentWb: number | null
  readonly energyKwh: number | null
}
