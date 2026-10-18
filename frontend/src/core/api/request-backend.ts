import type { AxiosInstance } from 'axios'
import type { z } from 'zod'
import { ApiError } from '@/core/errors/ApiError'
import { toApiError } from './http-client'

/**
 * One validated call against the FastAPI backend. A missing or unsafe path
 * fails before any request is sent, and an unexpected payload never reaches a
 * component: it becomes an `invalid-response` error instead.
 */
export async function requestBackend<T>(options: {
  readonly client: AxiosInstance
  readonly path: string
  readonly schema: z.ZodType<T>
  readonly featureLabel: string
  readonly method?: 'GET' | 'POST'
  readonly body?: unknown
  readonly params?: Record<string, string | number>
  readonly signal?: AbortSignal
}): Promise<T> {
  const { client, path, schema, featureLabel, method = 'GET' } = options

  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\'))
    throw new ApiError(
      'unconfigured',
      `The ${featureLabel} route must be a relative backend path.`,
    )

  try {
    const response = await client.request<unknown>({
      url: path,
      method,
      data: options.body,
      params: options.params,
      signal: options.signal,
    })
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
