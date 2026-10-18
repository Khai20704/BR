import type { Provenance } from '@/core/provenance/Provenance'

export interface ThermalPointPreview {
  readonly time: string
  readonly temperature: number
  readonly heat: number
}

export interface NumericRange {
  readonly min: number
  readonly max: number
}

/** The source window: either the backend scenario or a labelled fixture. */
export interface ThermalPreview {
  readonly provenance: Provenance
  readonly sourceId: string
  readonly sourceName: string
  readonly points: readonly ThermalPointPreview[]
  readonly uncertainty: string
  readonly temperatureRange: NumericRange | null
  readonly heatRange: NumericRange | null
}
