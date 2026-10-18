import { z } from 'zod'

/**
 * Transport schemas for the FastAPI backend. They validate exactly the fields
 * the UI consumes; unknown fields are ignored rather than trusted.
 */

const provenanceSchema = z.object({
  source: z.string().min(1),
  model_version: z.string().min(1),
  is_measurement: z.boolean(),
})

export const thermalWindowSchema = z.object({
  source_id: z.string().min(1),
  name: z.string().min(1),
  points: z
    .array(
      z.object({
        minute: z.number().int(),
        temperature_c: z.number().finite(),
        available_heat_kw: z.number().finite(),
      }),
    )
    .min(1),
  provenance: provenanceSchema,
})

const dryingPointSchema = z.object({
  minute: z.number().int(),
  moisture_percent_wb: z.number().finite(),
  temperature_c: z.number().finite(),
  water_removed_kg: z.number().finite(),
  energy_kwh: z.number().finite(),
})

export const simulationSchema = z.object({
  final_moisture_percent_wb: z.number().finite(),
  duration_minutes: z.number().int(),
  water_removed_kg: z.number().finite(),
  energy_kwh: z.number().finite(),
  minimum_energy_kwh: z.number().finite(),
  model_version: z.string().min(1),
  notes: z.array(z.string()),
  points: z.array(dryingPointSchema),
})

const validationSchema = z.object({
  status: z.string().min(1),
  summary: z.string(),
  checks: z.array(
    z.object({
      code: z.string().min(1),
      passed: z.boolean(),
      detail: z.string(),
    }),
  ),
})

const phaseSchema = z.object({
  temperature_c: z.number().finite(),
  duration_minutes: z.number().int(),
})

const planSchema = z.object({
  plan_id: z.string().min(1),
  batch_id: z.string().min(1),
  status: z.string().min(1),
  phases: z.array(phaseSchema),
  predicted: simulationSchema.nullable(),
  validation: validationSchema,
  rationale: z.array(z.string()),
  metadata: z.record(z.string(), z.string()),
})

const toolTraceSchema = z.object({
  name: z.string().min(1),
  arguments: z.string(),
  ok: z.boolean(),
  detail: z.string(),
})

export const narrativeSchema = z.object({
  text: z.string(),
  provider: z.string().min(1),
  verification: z.string().min(1),
  tool_calls: z.array(z.string()),
  tool_trace: z.array(toolTraceSchema),
})

export const planSnapshotSchema = z.object({
  plan: planSchema,
  narrative: narrativeSchema,
  provenance: provenanceSchema,
})

export const replanSnapshotSchema = z.object({
  reason_codes: z.array(z.string()),
  remaining_minutes: z.number().int(),
  changed_temperature_c: z.number().finite(),
  plan: planSchema,
  narrative: narrativeSchema,
  provenance: provenanceSchema,
})

export const benchmarkSnapshotSchema = z.object({
  scenario_id: z.string().min(1),
  model_version: z.string().min(1),
  methods: z.array(
    z.object({
      method: z.string().min(1),
      status: z.string().min(1),
      duration_minutes: z.number().int().nullable(),
      energy_kwh: z.number().finite().nullable(),
      final_moisture_percent_wb: z.number().finite().nullable(),
      validated: z.boolean(),
      note: z.string(),
    }),
  ),
  notes: z.array(z.string()),
})

const candidateSchema = z.object({
  name: z.string().min(1),
  rationale: z.string(),
  feasible: z.boolean(),
  energy_kwh: z.number().finite().nullable(),
  final_moisture_percent_wb: z.number().finite(),
})

/** `POST /plans` — the plan with every evaluated candidate and the narrative. */
export const planEnvelopeSchema = z.object({
  plan: planSchema,
  candidates: z.array(candidateSchema),
  narrative: narrativeSchema,
})

/** `POST /plans/replan` — the replanned window and its reason codes. */
export const replanEnvelopeSchema = z.object({
  plan: planSchema,
  reason_codes: z.array(z.string()),
  remaining_minutes: z.number().int(),
  changed_temperature_c: z.number().finite(),
  narrative: narrativeSchema,
})

export const massBalanceSchema = z.object({
  dry_solids_kg: z.number().finite(),
  initial_water_kg: z.number().finite(),
  final_water_kg: z.number().finite(),
  initial_mass_kg: z.number().finite(),
  final_mass_kg: z.number().finite(),
  water_to_remove_kg: z.number().finite(),
  minimum_energy_kwh: z.number().finite(),
  temperature_c: z.number().finite(),
})

export type ThermalWindowPayload = z.infer<typeof thermalWindowSchema>
export type SimulationPayload = z.infer<typeof simulationSchema>
export type PlanPayload = z.infer<typeof planSchema>
export type NarrativePayload = z.infer<typeof narrativeSchema>
export type PlanSnapshotPayload = z.infer<typeof planSnapshotSchema>
export type ReplanSnapshotPayload = z.infer<typeof replanSnapshotSchema>
export type BenchmarkSnapshotPayload = z.infer<typeof benchmarkSnapshotSchema>
export type PlanEnvelopePayload = z.infer<typeof planEnvelopeSchema>
export type ReplanEnvelopePayload = z.infer<typeof replanEnvelopeSchema>
export type MassBalancePayload = z.infer<typeof massBalanceSchema>
