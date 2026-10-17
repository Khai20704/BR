import { expect, it } from 'vitest'
import { createHttpClient } from '@/core/api/http-client'
import { createHttpSiteRepository } from './HttpSiteRepository'

it('rejects malformed site responses at the infrastructure boundary', async () => {
  const client = createHttpClient('https://example.invalid')
  client.defaults.adapter = async (config) => ({
    data: { id: 42 },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  })
  const repository = createHttpSiteRepository(client, () => '/test-only')
  await expect(repository.getById('test')).rejects.toMatchObject({
    kind: 'invalid-response',
  })
})
