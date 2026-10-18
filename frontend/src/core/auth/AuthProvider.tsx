import { useEffect, useState, type ReactNode } from 'react'
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth'
import { auth } from '@/core/firebase/client'
import { AuthContext } from './context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(Boolean(auth))
  const [error, setError] = useState('')
  useEffect(() => {
    if (!auth) return
    const unsubscribe = onAuthStateChanged(
      auth,
      (u) => {
        setUser(u)
        setLoading(false)
      },
      () => {
        setError('Unable to restore authentication. Reload to retry.')
        setLoading(false)
      },
    )
    void getRedirectResult(auth).catch(() =>
      setError('Google redirect sign-in failed. Please retry.'),
    )
    return unsubscribe
  }, [])
  async function login(redirect = false) {
    if (!auth) {
      setError('Firebase web configuration is missing.')
      return
    }
    setError('')
    try {
      await setPersistence(auth, browserLocalPersistence)
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      if (redirect) await signInWithRedirect(auth, provider)
      else await signInWithPopup(auth, provider)
    } catch (e) {
      const code = (e as { code?: string }).code
      setError(
        code === 'auth/popup-blocked'
          ? 'Popup blocked. Use Continue with redirect.'
          : 'Google sign-in did not complete. Please retry.',
      )
    }
  }
  async function logout() {
    try {
      if (auth) await signOut(auth)
    } catch {
      setError('Logout failed. Please retry.')
    }
  }
  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
