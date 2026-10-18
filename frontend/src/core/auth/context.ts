import { createContext, useContext } from 'react'
import type { User } from 'firebase/auth'
export interface AuthState {
  user: User | null
  loading: boolean
  error: string
  login: (redirect?: boolean) => Promise<void>
  logout: () => Promise<void>
}
export const AuthContext = createContext<AuthState>({
  user: null,
  loading: false,
  error: '',
  login: async () => {},
  logout: async () => {},
})
export const useAuth = () => useContext(AuthContext)
