import axios from 'axios'
import { ApiError } from '@/core/errors/ApiError'
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (axios.isCancel(error))
    return new ApiError('cancelled', 'Request cancelled.')
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')
      return new ApiError(
        'timeout',
        'The backend request timed out. Please try again.',
      )
    if (!error.response)
      return new ApiError(
        'network',
        'The backend is unreachable. Please try again later.',
      )
    return new ApiError(
      'http',
      'The backend could not complete the request.',
      error.response.status,
    )
  }
  return new ApiError('unknown', 'An unexpected request error occurred.')
}
export function createHttpClient(baseURL: string | undefined) {
  const client = axios.create({
    baseURL,
    timeout: 120_000,
    headers: { Accept: 'application/json' },
  })
  client.interceptors.request.use((config) => {
    if (!baseURL)
      throw new ApiError('unconfigured', 'The backend is not configured yet.')
    return config
  })
  client.interceptors.response.use(
    (response) => response,
    (error: unknown) => Promise.reject(toApiError(error)),
  )
  return client
}
