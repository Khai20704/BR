import { AxiosError } from 'axios'
import { describe, expect, it, vi } from 'vitest'
import { createHttpClient, toApiError } from './http-client'

describe('HTTP failure handling', () => {
  it('rejects an unconfigured backend before transport', async () => {
    const client = createHttpClient(undefined)
    const adapter = vi.fn()
    client.defaults.adapter = adapter
    await expect(client.get('/test-only')).rejects.toMatchObject({
      kind: 'unconfigured',
    })
    expect(adapter).not.toHaveBeenCalled()
  })
  it('classifies a network failure without returning successful data', async () => {
    const client = createHttpClient('https://example.invalid')
    client.defaults.adapter = () =>
      Promise.reject(new AxiosError('Network Error', 'ERR_NETWORK'))
    await expect(client.get('/test-only')).rejects.toMatchObject({
      kind: 'network',
    })
  })
  it('classifies a timeout', () => {
    expect(toApiError(new AxiosError('timeout', 'ECONNABORTED')).kind).toBe(
      'timeout',
    )
  })
})
