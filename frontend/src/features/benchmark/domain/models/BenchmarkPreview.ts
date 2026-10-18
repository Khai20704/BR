import type { Provenance } from '@/core/provenance/Provenance'
import type { PlanStatus } from '@/core/preview/plan-types'

export interface BenchmarkMethodPreview {
  readonly method: string
  readonly status: PlanStatus
  readonly durationMinutes: number | null
  readonly energyKwh: number | null
  readonly finalMoisturePercentWb: number | null
  readonly validated: boolean
  readonly note: string
}

/** Three approaches integrated on one shared scenario. */
export interface BenchmarkPreview {
  readonly provenance: Provenance
  readonly scenarioId: string
  readonly modelVersion: string
  readonly methods: readonly BenchmarkMethodPreview[]
  readonly notes: readonly string[]
}
