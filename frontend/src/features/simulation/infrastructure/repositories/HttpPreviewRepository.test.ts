import { expect, it } from 'vitest'
import { mapSimulation } from './HttpPreviewRepository'
const result = {
  final_moisture_percent_wb: 24.9847,
  duration_minutes: 420,
  water_removed_kg: 5.92,
  energy_kwh: 7.2,
  minimum_energy_kwh: 3.88,
  model_version: 'thin-layer-1.0',
  points: [],
  notes: ['Target moisture reached at minute 420.'],
}
it('does not infer independent validation from moisture or legacy notes', () => {
  const mapped = mapSimulation(result)
  expect(mapped.targetAchieved).toBeUndefined()
  expect(mapped.status).toBe('NOT_VALIDATED')
  expect(mapped.notes[0]).toMatch(/^Coarse model predicts/)
})
it('preserves a backend rejection even when coarse moisture is below target', () => {
  const mapped = mapSimulation({
    ...result,
    target_moisture_percent_wb: 25,
    target_achieved: false,
    validation: {
      status: 'NOT_VALIDATED',
      summary: 'Target check failed',
      checks: [
        {
          code: 'TARGET_ACHIEVED_INDEPENDENTLY',
          passed: false,
          detail: 'Fine-step prediction exceeds target',
        },
      ],
    },
  })
  expect(mapped.targetAchieved).toBe(false)
  expect(mapped.validation?.checks[0]?.passed).toBe(false)
})
