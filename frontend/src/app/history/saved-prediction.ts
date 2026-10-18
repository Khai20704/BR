import { z } from 'zod'
import {
  simulationSchema,
  planEnvelopeSchema,
  replanEnvelopeSchema,
} from '@/core/api/backend-schemas'
import type { SimulationPayload } from '@/core/api/backend-schemas'
import type { StoredRun } from '@/core/workspace/model'

export const historyLabels = {
  simulations: 'Drying predictions',
  ai_plans: 'AI drying plans',
  replanning_runs: 'Updated plans',
  benchmarks: 'Method comparisons',
}

/** Read existing immutable snapshots without changing their stored schema. */
export function savedPrediction(
  record: StoredRun,
): { simulation: SimulationPayload; target: number } | null {
  try {
    const input = z
      .object({
        request: z.object({
          batch: z.object({ target_moisture_percent_wb: z.number().finite() }),
        }),
      })
      .parse(JSON.parse(record.inputSnapshot))
    const target = input.request.batch.target_moisture_percent_wb
    const raw: unknown = JSON.parse(record.result)
    if (record.kind === 'simulations')
      return { simulation: simulationSchema.parse(raw), target }
    const parsed =
      record.kind === 'ai_plans'
        ? planEnvelopeSchema.safeParse(raw)
        : replanEnvelopeSchema.safeParse(raw)
    if (!parsed.success || !parsed.data.plan.predicted) return null
    const { predicted, validation } = parsed.data.plan
    const targetCheck = validation.checks.find(
      (check) => check.code === 'TARGET_ACHIEVED_INDEPENDENTLY',
    )
    return {
      simulation: {
        ...predicted,
        validation,
        target_moisture_percent_wb: target,
        target_achieved: targetCheck
          ? targetCheck.passed && predicted.final_moisture_percent_wb <= target
          : null,
      },
      target,
    }
  } catch {
    return null
  }
}
