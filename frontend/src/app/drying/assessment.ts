import type {
  SimulationPayload,
  NarrativePayload,
  PlanEnvelopePayload,
} from '@/core/api/backend-schemas'

/** Older simulation responses can reuse the plan's backend checks only when
 * both endpoints reported exactly the same trajectory summary. No local physics. */
export function withPlanValidation(
  simulation: SimulationPayload,
  plan: PlanEnvelopePayload | null,
  target: number,
): SimulationPayload {
  if (simulation.validation || !plan?.plan.predicted) return simulation
  const predicted = plan.plan.predicted
  if (
    [
      'final_moisture_percent_wb',
      'duration_minutes',
      'water_removed_kg',
      'energy_kwh',
      'minimum_energy_kwh',
      'model_version',
    ].some(
      (key) =>
        simulation[key as keyof SimulationPayload] !==
        predicted[key as keyof SimulationPayload],
    )
  )
    return simulation
  const validation = plan.plan.validation
  const targetCheck = validation.checks.find(
    (check) => check.code === 'TARGET_ACHIEVED_INDEPENDENTLY',
  )
  return {
    ...simulation,
    validation,
    target_moisture_percent_wb: target,
    target_achieved: targetCheck
      ? targetCheck.passed && simulation.final_moisture_percent_wb <= target
      : null,
  }
}

/** A passing target check is separate from overall numerical validation. */
export function assessDrying(simulation: SimulationPayload, target: number) {
  const checks = simulation.validation?.checks ?? []
  const targetCheck = checks.find(
    (c) => c.code === 'TARGET_ACHIEVED_INDEPENDENTLY',
  )
  if (
    simulation.validation?.status === 'VALIDATED' &&
    targetCheck?.passed &&
    simulation.target_achieved === true &&
    simulation.final_moisture_percent_wb <= target
  )
    return {
      label: 'Predicted to be achievable',
      tone: 'green',
      detail:
        'The model predicts your target can be reached within this plan. Its independent calculation checks passed.',
    } as const
  if (
    simulation.target_achieved === false &&
    targetCheck?.passed === false &&
    simulation.final_moisture_percent_wb > target
  )
    return {
      label: 'Predicted not to be achievable',
      tone: 'amber',
      detail:
        'The model predicts this batch will finish above your moisture target. Consider a longer drying window or a smaller batch, then generate a new plan.',
    } as const
  return {
    label: 'Cannot be determined',
    tone: 'amber',
    detail:
      'The available results do not independently confirm a feasible plan. Review the inputs and calculation details before relying on this prediction.',
  } as const
}

export function validationLabel(status?: string) {
  if (status === 'VALIDATED') return 'Model checks passed'
  if (status === 'NEED_MORE_DATA') return 'More information is needed'
  if (status === 'NO_FEASIBLE_PLAN')
    return 'Model checks found no feasible plan'
  return 'Prediction not yet validated'
}

export function isGeminiRecommendation(narrative?: NarrativePayload) {
  return (
    narrative?.provider === 'gemini' &&
    narrative.verification === 'LIVE_GEMINI_VERIFIED' &&
    narrative.tool_trace.some((call) => call.ok)
  )
}
