import type { PreviewRepository } from '../../domain/repositories/PreviewRepository'
// Static UI artwork data, never a physical model or an execution result.
export function createFixturePreviewRepository(): PreviewRepository {
  return {
    async load() {
      if (!import.meta.env.DEV)
        throw new Error('Preview fixtures are disabled in production.')
      return {
        source: 'synthetic',
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
        status: 'NEED_MORE_DATA',
        steps: [
          'Collect scenario inputs',
          'Request thermal simulation',
          'Evaluate candidate schedules',
          'Validate constraints',
        ],
      }
    },
  }
}
