import type { PreviewRepository } from '../../domain/repositories/PreviewRepository'
import { syntheticProvenance } from '@/core/provenance/Provenance'

// Static UI artwork data, never a physical model or an execution result.
export function createFixturePreviewRepository(): PreviewRepository {
  return {
    async load() {
      if (!import.meta.env.DEV)
        throw new Error('Preview fixtures are disabled in production.')
      return {
        provenance: syntheticProvenance(
          'Illustrative plan layout. No optimizer, validator or agent ran.',
        ),
        status: 'NEED_MORE_DATA',
        phases: [],
        rationale: [],
        validation: {
          status: 'NEED_MORE_DATA',
          summary: 'No validation has run.',
          checks: [],
        },
        narrative: {
          text: 'No reasoning has been generated. This is a synthetic preview.',
          provider: 'fixture',
          verification: 'GEMINI_DISABLED',
          toolCalls: [],
          toolTrace: [],
        },
        options: [
          {
            name: 'Heat-following',
            description:
              'Explore a schedule aligned with available waste heat.',
          },
          {
            name: 'Time-constrained',
            description:
              'Explore the trade-off against a maximum batch duration.',
          },
          {
            name: 'Conservative',
            description:
              'Explore a scenario with an explicit uncertainty margin.',
          },
        ],
        steps: [
          {
            label: 'Collect scenario inputs',
            executed: false,
            detail: 'No invocation, duration, or result recorded.',
          },
          {
            label: 'Request thermal simulation',
            executed: false,
            detail: 'No invocation, duration, or result recorded.',
          },
          {
            label: 'Evaluate candidate schedules',
            executed: false,
            detail: 'No invocation, duration, or result recorded.',
          },
          {
            label: 'Validate constraints',
            executed: false,
            detail: 'No invocation, duration, or result recorded.',
          },
        ],
        finalMoisturePercentWb: null,
        energyKwh: null,
      }
    },
  }
}
