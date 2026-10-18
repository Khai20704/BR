import { expect, it, vi } from 'vitest'
import { syncAuthProfile } from './sync-profile'
it('refreshes token and mirrors only signed claims, normalizing null and missing attributes', async () => {
  const user = {
    getIdTokenResult: vi
      .fn()
      .mockResolvedValue({
        claims: { email: 'real@example.test', name: null },
      }),
  }
  const write = vi.fn().mockResolvedValue(undefined)
  await syncAuthProfile(user, write, () => true)
  expect(user.getIdTokenResult).toHaveBeenCalledWith(true)
  expect(write).toHaveBeenCalledWith({
    email: 'real@example.test',
    displayName: '',
    photoURL: '',
  })
})
it('retries a claim race once with refreshed claims', async () => {
  const user = {
    getIdTokenResult: vi
      .fn()
      .mockResolvedValueOnce({ claims: { name: 'Old' } })
      .mockResolvedValueOnce({ claims: { name: 'New' } }),
  }
  const write = vi
    .fn()
    .mockRejectedValueOnce({ code: 'permission-denied' })
    .mockResolvedValueOnce(undefined)
  await syncAuthProfile(user, write, () => true)
  expect(write).toHaveBeenLastCalledWith({
    email: '',
    displayName: 'New',
    photoURL: '',
  })
  expect(write).toHaveBeenCalledTimes(2)
})
it('does not write after logout and propagates persistent failures', async () => {
  const user = { getIdTokenResult: vi.fn().mockResolvedValue({ claims: {} }) },
    write = vi.fn().mockRejectedValue({ code: 'permission-denied' })
  await syncAuthProfile(user, write, () => false)
  expect(write).not.toHaveBeenCalled()
  await expect(syncAuthProfile(user, write, () => true)).rejects.toEqual({
    code: 'permission-denied',
  })
  expect(write).toHaveBeenCalledTimes(2)
})
