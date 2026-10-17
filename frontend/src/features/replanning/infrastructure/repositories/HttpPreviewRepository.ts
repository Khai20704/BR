import type { PreviewRepository } from '../../domain/repositories/PreviewRepository'
import { ApiError } from '@/core/errors/ApiError'
// Fail closed until a real endpoint and validated DTO contract exist.
export function createHttpPreviewRepository(): PreviewRepository {
  return {
    async load() {
      throw new ApiError(
        'unconfigured',
        'Backend integration is pending. No replanning endpoint is configured.',
      )
    },
  }
}
