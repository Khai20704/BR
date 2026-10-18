/**
 * Types shared by the planning, replanning, simulation and benchmark previews.
 * They mirror the backend contract and never invent a value the engine did not
 * return.
 */

export type PlanStatus =
  | 'VALIDATED'
  | 'NEED_MORE_DATA'
  | 'NO_FEASIBLE_PLAN'
  | 'NOT_VALIDATED'

export type GeminiVerification =
  | 'LIVE_GEMINI_VERIFIED'
  | 'LIVE_GEMINI_NOT_VERIFIED'
  | 'GEMINI_DISABLED'

export interface PlanPhasePreview {
  readonly temperatureC: number
  readonly durationMinutes: number
}

export interface ValidationCheckPreview {
  readonly code: string
  readonly passed: boolean
  readonly detail: string
}

export interface ValidationPreview {
  readonly status: PlanStatus
  readonly summary: string
  readonly checks: readonly ValidationCheckPreview[]
}

export interface ToolTraceEntry {
  readonly name: string
  readonly arguments: string
  readonly ok: boolean
  readonly detail: string
}

export interface NarrativePreview {
  readonly text: string
  readonly provider: string
  readonly verification: GeminiVerification
  readonly toolCalls: readonly string[]
  readonly toolTrace: readonly ToolTraceEntry[]
}

/** Narrow a backend status string onto the UI's closed set. */
export function toPlanStatus(value: string): PlanStatus {
  if (value === 'VALIDATED') return 'VALIDATED'
  if (value === 'NEED_MORE_DATA') return 'NEED_MORE_DATA'
  if (value === 'NO_FEASIBLE_PLAN') return 'NO_FEASIBLE_PLAN'
  return 'NOT_VALIDATED'
}

/** Narrow a backend verification string onto the UI's closed set. */
export function toVerification(value: string): GeminiVerification {
  if (value === 'LIVE_GEMINI_VERIFIED') return 'LIVE_GEMINI_VERIFIED'
  if (value === 'LIVE_GEMINI_NOT_VERIFIED') return 'LIVE_GEMINI_NOT_VERIFIED'
  return 'GEMINI_DISABLED'
}
