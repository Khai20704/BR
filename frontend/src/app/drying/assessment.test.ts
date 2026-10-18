import { expect, it } from 'vitest'
import {
  assessDrying,
  isGeminiRecommendation,
  withPlanValidation,
} from './assessment'
import type {
  SimulationPayload,
  NarrativePayload,
  PlanEnvelopePayload,
} from '@/core/api/backend-schemas'

const simulation: SimulationPayload = {
  final_moisture_percent_wb: 24.9847,
  duration_minutes: 420,
  water_removed_kg: 5.92,
  energy_kwh: 7.2,
  minimum_energy_kwh: 3.8,
  model_version: 'thin-layer-1.0',
  notes: [],
  points: [],
  target_achieved: true,
  target_moisture_percent_wb: 25,
  validation: {
    status: 'VALIDATED',
    summary: 'Passed',
    checks: [
      {
        code: 'TARGET_ACHIEVED_INDEPENDENTLY',
        passed: true,
        detail: 'Reproduced',
      },
    ],
  },
}

it('uses existing plan checks for an identical older simulation response, but never for a different prediction', () => {
  const legacy = {
    ...simulation,
    target_achieved: undefined,
    validation: undefined,
  }
  const plan: PlanEnvelopePayload = {
    plan: {
      plan_id: 'p',
      batch_id: 'batch',
      status: 'VALIDATED',
      phases: [],
      predicted: legacy,
      validation: simulation.validation!,
      rationale: [],
      metadata: {},
    },
    candidates: [],
    narrative: {
      text: '',
      provider: 'deterministic',
      verification: 'GEMINI_DISABLED',
      tool_calls: [],
      tool_trace: [],
    },
  }
  expect(assessDrying(withPlanValidation(legacy, plan, 25), 25).label).toBe(
    'Predicted to be achievable',
  )
  expect(
    withPlanValidation({ ...legacy, energy_kwh: 9 }, plan, 25).validation,
  ).toBeUndefined()
  expect(withPlanValidation(legacy, null, 25).validation).toBeUndefined()
  const failed = {
    ...simulation,
    validation: { ...simulation.validation!, status: 'NOT_VALIDATED' },
  }
  expect(withPlanValidation(failed, plan, 25)).toBe(failed)
})
it('requires independent validation for an achievable assessment', () => {
  expect(assessDrying(simulation, 25).label).toBe('Predicted to be achievable')
  expect(assessDrying({ ...simulation, validation: undefined }, 25).label).toBe(
    'Cannot be determined',
  )
  expect(
    assessDrying({ ...simulation, target_achieved: undefined }, 25).label,
  ).toBe('Cannot be determined')
  expect(
    assessDrying({ ...simulation, final_moisture_percent_wb: 26 }, 25).label,
  ).toBe('Cannot be determined')
})
it('distinguishes an infeasible attempt from an inconclusive model', () => {
  expect(
    assessDrying(
      {
        ...simulation,
        final_moisture_percent_wb: 45,
        target_achieved: false,
        validation: {
          status: 'NO_FEASIBLE_PLAN',
          summary: 'Target not reached',
          checks: [
            {
              code: 'TARGET_ACHIEVED_INDEPENDENTLY',
              passed: false,
              detail: 'Above target',
            },
          ],
        },
      },
      25,
    ).label,
  ).toBe('Predicted not to be achievable')
  expect(
    assessDrying(
      {
        ...simulation,
        validation: { ...simulation.validation!, status: 'NOT_VALIDATED' },
      },
      25,
    ).label,
  ).toBe('Cannot be determined')
})
it('requires verified Gemini provenance and an actual successful tool call', () => {
  const narrative: NarrativePayload = {
    text: 'Explanation',
    provider: 'gemini',
    verification: 'LIVE_GEMINI_VERIFIED',
    tool_calls: ['simulate'],
    tool_trace: [],
  }
  expect(isGeminiRecommendation(narrative)).toBe(false)
  expect(
    isGeminiRecommendation({
      ...narrative,
      tool_trace: [
        { name: 'simulate', ok: true, arguments: '{}', detail: 'Completed' },
      ],
    }),
  ).toBe(true)
  expect(
    isGeminiRecommendation({
      ...narrative,
      provider: 'deterministic-after-error',
    }),
  ).toBe(false)
})
