import { createHttpClient } from '@/core/api/http-client'
import { parseEnvironment } from '@/core/config/env'
import { createGetSiteById, createHttpSiteRepository } from '@/features/site'
// Invoke only when a backend route is agreed; no invented default endpoint.
export function createSiteServices(pathForId: (id: string) => string) {
  const config = parseEnvironment(import.meta.env)
  const repository = createHttpSiteRepository(
    createHttpClient(config.apiBaseUrl),
    pathForId,
  )
  return { getSiteById: createGetSiteById(repository) }
}
