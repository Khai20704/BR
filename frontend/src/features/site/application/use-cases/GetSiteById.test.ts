import { describe, expect, it, vi } from 'vitest'
import { createGetSiteById } from './GetSiteById'
describe('GetSiteById', () => {
  it('delegates the normalized ID and signal to the injected repository', async () => {
    const site = { id: 'site-test', name: 'Test site' }
    const repository = { getById: vi.fn().mockResolvedValue(site) }
    const signal = new AbortController().signal
    await expect(
      createGetSiteById(repository)(' site-test ', signal),
    ).resolves.toEqual(site)
    expect(repository.getById).toHaveBeenCalledWith('site-test', signal)
  })
  it('rejects empty IDs before calling the repository', async () => {
    const repository = { getById: vi.fn() }
    await expect(createGetSiteById(repository)(' ')).rejects.toThrow(
      'Site ID is required.',
    )
    expect(repository.getById).not.toHaveBeenCalled()
  })
  it('propagates repository failures without fabricating a site', async () => {
    const error = new Error('Unavailable')
    const repository = { getById: vi.fn().mockRejectedValue(error) }
    await expect(createGetSiteById(repository)('site-test')).rejects.toBe(error)
  })
})
