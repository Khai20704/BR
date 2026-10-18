import { expect, it } from 'vitest'
import { savedPrediction } from './saved-prediction'
import type { StoredRun } from '@/core/workspace/model'
const result = {
  final_moisture_percent_wb: 24.9,
  duration_minutes: 420,
  water_removed_kg: 5.9,
  energy_kwh: 7.2,
  minimum_energy_kwh: 3.8,
  model_version: 'thin-layer-1.0',
  notes: [],
  points: [],
}
const record: StoredRun = {
  id: 'saved',
  kind: 'simulations',
  inputSnapshot: JSON.stringify({
    request: { batch: { target_moisture_percent_wb: 25 } },
  }),
  result: JSON.stringify(result),
  modelVersion: 'thin-layer-1.0',
  modelName: 'not applicable',
  dataProvenance: 'MODEL_PREDICTION',
}
it('reopens legacy predictions without inventing target validation', () => {
  const saved = savedPrediction(record)!
  expect(saved.simulation.final_moisture_percent_wb).toBe(24.9)
  expect(saved.target).toBe(25)
  expect(saved.simulation.target_achieved).toBeUndefined()
})
it('uses the saved plan validator and original target when reopening AI plans', () => {
  const validation = {
    status: 'VALIDATED',
    summary: 'Passed',
    checks: [
      {
        code: 'TARGET_ACHIEVED_INDEPENDENTLY',
        passed: true,
        detail: 'Checked',
      },
    ],
  }
  const plan = {
    plan_id: 'p',
    batch_id: 'batch',
    status: 'VALIDATED',
    phases: [],
    predicted: result,
    validation,
    rationale: [],
    metadata: {},
  }
  const saved = savedPrediction({
    ...record,
    kind: 'ai_plans',
    result: JSON.stringify({
      plan,
      candidates: [],
      narrative: {
        text: 'Fallback',
        provider: 'deterministic',
        verification: 'GEMINI_DISABLED',
        tool_calls: [],
        tool_trace: [],
      },
    }),
  })!
  expect(saved.simulation.target_achieved).toBe(true)
  expect(saved.simulation.validation).toEqual(validation)
})
it('fails safely for old unsupported or malformed snapshots', () => {
  expect(savedPrediction({ ...record, result: '{}' })).toBeNull()
  expect(savedPrediction({ ...record, inputSnapshot: '{}' })).toBeNull()
})
