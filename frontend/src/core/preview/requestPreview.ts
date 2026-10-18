import type { AxiosInstance } from 'axios'
import type { z } from 'zod'
import { toApiError } from '@/core/api/http-client'
import { ApiError } from '@/core/errors/ApiError'

/**
 * Shared transport for preview endpoints. No route is assumed: the caller must
 * inject an agreed relative path, and an absent path fails before any request
 * is sent instead of inventing a default endpoint.
 */
export async function requestPreview<T>(options: {
  readonly client: AxiosInstance
  readonly path: string | undefined
  readonly featureLabel: string
  readonly schema: z.ZodType<T>
  readonly signal?: AbortSignal
}): Promise<T> {
  const { client, path, featureLabel, schema, signal } = options

  if (!path)
    throw new ApiError(
      'unconfigured',
      `No ${featureLabel} endpoint is configured yet.`,
    )

  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\'))
    throw new ApiError(
      'unconfigured',
      `The ${featureLabel} route must be a relative backend path.`,
    )

  try {
    const response = await client.get<unknown>(path, { signal })
    const parsed = schema.safeParse(response.data)
    if (!parsed.success)
      throw new ApiError(
        'invalid-response',
        `The backend returned an invalid ${featureLabel} response.`,
      )
    return parsed.data
  } catch (error) {
    throw toApiError(error)
  }
}
