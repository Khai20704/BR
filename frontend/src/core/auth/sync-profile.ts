import type { User } from 'firebase/auth'

type Profile = { email: string; displayName: string; photoURL: string }

// Mirror the signed token, never editable User/providerData fields. Refresh at
// login so legitimate Auth profile changes can replace an older stored mirror.
export async function syncAuthProfile(
  user: Pick<User, 'getIdTokenResult'>,
  write: (profile: Profile) => Promise<void>,
  isActive: () => boolean,
) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const { claims } = await user.getIdTokenResult(true)
    if (!isActive()) return
    const claim = (key: string) => {
      const value = claims[key]
      if (value == null) return ''
      if (typeof value !== 'string') throw new Error('Invalid identity claim.')
      return value
    }
    try {
      await write({
        email: claim('email'),
        displayName: claim('name'),
        photoURL: claim('picture'),
      })
      return
    } catch (error) {
      // A token refreshed concurrently by the SDK can invalidate our mirror.
      // Retry once with fresh claims; never fall back to untrusted identity.
      if (attempt || (error as { code?: string }).code !== 'permission-denied')
        throw error
    }
  }
}
