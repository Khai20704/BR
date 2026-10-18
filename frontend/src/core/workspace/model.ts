import { z } from 'zod'
export const draftSchema = z
  .object({
    batchId: z.string().min(1).max(64),
    massKg: z.number().positive().max(100000),
    initialMoisturePercentWb: z.number().gt(0).lt(100),
    targetMoisturePercentWb: z.number().gt(0).lt(100),
    maxDurationMinutes: z.number().int().min(1).max(10080),
    minTemperatureC: z.number().min(0).max(200),
    maxTemperatureC: z.number().min(0).max(200),
    relativeHumidity: z.number().min(0).max(1),
    sourceTemperatureC: z.number().min(20).max(70).optional(),
    availableHeatKw: z.number().min(0).max(10000).optional(),
  })
  .strict()
  .refine(
    (d) =>
      d.targetMoisturePercentWb < d.initialMoisturePercentWb &&
      d.minTemperatureC < d.maxTemperatureC,
  )
export const siteSchema = z
  .object({
    name: z.string().min(2).max(120),
    location: z.string().min(2).max(200),
    acModel: z.string().min(2).max(120),
    capacity: z.number().positive().max(100000),
    source: z.string().min(1).max(120),
    provenance: z.enum([
      'Synthetic / UI preview',
      'Measured \u00b7 verification pending',
    ]),
  })
  .strict()
export type Site = z.infer<typeof siteSchema>
export const historyKinds = [
  'simulations',
  'ai_plans',
  'replanning_runs',
  'benchmarks',
] as const
export type HistoryKind = (typeof historyKinds)[number]
export interface StoredRun {
  id: string
  kind: HistoryKind
  inputSnapshot: string
  result: string
  modelVersion: string
  modelName: string
  createdAt?: { toDate: () => Date }
  dataProvenance: string
}
export function encodeSnapshot(value: unknown): string {
  const text = JSON.stringify(value)
  if (!text || new TextEncoder().encode(text).length > 180000)
    throw new Error('Record exceeds the 180 KB snapshot limit.')
  if (
    /"(?:accessToken|idToken|refreshToken|apiKey|GEMINI_API_KEY)"\s*:/.test(
      text,
    )
  )
    throw new Error('Credentials cannot be persisted.')
  return text
}
