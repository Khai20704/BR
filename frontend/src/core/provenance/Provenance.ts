/**
 * Provenance of anything the workspace displays.
 *
 * Four kinds are kept strictly apart so a reader can never mistake one for
 * another: a fixture, a documented scenario input, a model prediction, and a
 * real measurement. Nothing here claims experimental validation.
 */
export type ProvenanceKind =
  | 'SYNTHETIC'
  | 'SCENARIO_INPUT'
  | 'MODEL_PREDICTION'
  | 'MEASURED'

export interface Provenance {
  readonly kind: ProvenanceKind
  readonly label: string
  readonly detail: string
  readonly modelVersion: string | null
}

const LABELS: Record<ProvenanceKind, string> = {
  SYNTHETIC: 'SYNTHETIC / UI PREVIEW',
  SCENARIO_INPUT: 'SCENARIO INPUT',
  MODEL_PREDICTION: 'MODEL_PREDICTION',
  MEASURED: 'MEASURED',
}

function build(
  kind: ProvenanceKind,
  detail: string,
  modelVersion: string | null,
): Provenance {
  return { kind, label: LABELS[kind], detail, modelVersion }
}

/** Fixture data: a fixed interface curve, never an engineering result. */
export function syntheticProvenance(detail: string): Provenance {
  return build('SYNTHETIC', detail, null)
}

/** Scenario inputs — documented defaults or values typed into this workspace. */
export function scenarioInputProvenance(
  modelVersion: string,
  detail = 'Documented default scenario supplied by the backend. Not a measurement.',
): Provenance {
  return build('SCENARIO_INPUT', detail, modelVersion)
}

/** Output of the deterministic engine, independently re-checked by it. */
export function modelPredictionProvenance(
  modelVersion: string,
  detail = 'Model prediction. Not a measurement and not experimentally validated.',
): Provenance {
  return build('MODEL_PREDICTION', detail, modelVersion)
}

/** Reserved for verified sensor data. No code path produces it yet. */
export function measuredProvenance(detail: string): Provenance {
  return build('MEASURED', detail, null)
}
