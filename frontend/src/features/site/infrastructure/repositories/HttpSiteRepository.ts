import type { AxiosInstance } from 'axios'
import { z } from 'zod'
import { toApiError } from '@/core/api/http-client'
import { ApiError } from '@/core/errors/ApiError'
import type { SiteRepository } from '../../domain/repositories/SiteRepository'
// Provisional DTO only; confirm the wire contract before enabling a route.
const siteSchema = z.object({ id: z.string().min(1), name: z.string().min(1) })
export function createHttpSiteRepository(
  client: AxiosInstance,
  pathForId: (id: string) => string,
): SiteRepository {
  return {
    async getById(id, signal) {
      try {
        const path = pathForId(id)
        if (
          !path.startsWith('/') ||
          path.startsWith('//') ||
          path.includes('\\')
        )
          throw new ApiError(
            'unconfigured',
            'The site route must be a relative backend path.',
          )
        const response = await client.get<unknown>(path, { signal })
        const parsed = siteSchema.safeParse(response.data)
        if (!parsed.success)
          throw new ApiError(
            'invalid-response',
            'The backend returned an invalid site response.',
          )
        return parsed.data
      } catch (error) {
        throw toApiError(error)
      }
    },
  }
}
