import type { PreviewSeries } from '@/core/preview/PreviewSeries'

/**
 * A thermal profile preview. Every field is either a mirrored series or a
 * descriptive label — the frontend never computes a thermal result.
 */
export interface ThermalProfilePreview {
  readonly series: PreviewSeries
  readonly peakTemperatureC: number
  readonly ambientTemperatureC: number
  readonly steadyStateMinute: number | null
  readonly note: string
}
