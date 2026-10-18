import type { NarrativePayload } from '@/core/api/backend-schemas'
import { toVerification, type NarrativePreview } from './plan-types'
export function mapNarrative(narrative: NarrativePayload): NarrativePreview {
  return {
    text: narrative.text,
    provider: narrative.provider,
    verification: toVerification(narrative.verification),
    toolCalls: narrative.tool_calls,
    toolTrace: narrative.tool_trace.map((call) => ({
      name: call.name,
      arguments: call.arguments,
      ok: call.ok,
      detail: call.detail,
    })),
  }
}

