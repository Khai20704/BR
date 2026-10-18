import { z } from 'zod'

/** A single sampled point of a preview series. Units live on the series. */
export interface PreviewPoint {
  readonly time: string
  readonly value: number
}

/** Labelled numeric series. Never an engineering result on its own. */
export interface PreviewSeries {
  readonly label: string
  readonly unit: string
  readonly points: readonly PreviewPoint[]
}

export const previewPointSchema = z.object({
  time: z.string().min(1),
  value: z.number().finite(),
})

export const previewSeriesSchema = z.object({
  label: z.string().min(1),
  unit: z.string().min(1),
  points: z.array(previewPointSchema).min(2),
})
