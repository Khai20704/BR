import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { it, expect, vi } from 'vitest'
import { AuthContext } from '@/core/auth/context'
import { LoginPage } from './LoginPage'
vi.mock('@/core/firebase/client', () => ({ firebaseConfigured: true }))
it('exposes popup and explicit redirect login, errors, and loading state', () => {
  const login = vi.fn().mockResolvedValue(undefined)
  const state = {
    user: null,
    loading: false,
    error: 'Sign-in failed',
    login,
    logout: vi.fn(),
  }
  const view = render(
    <MemoryRouter>
      <AuthContext.Provider value={state}>
        <LoginPage />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }))
  expect(login).toHaveBeenCalledWith()
  fireEvent.click(
    screen.getByRole('button', { name: 'Continue with redirect' }),
  )
  expect(login).toHaveBeenCalledWith(true)
  expect(screen.getByRole('alert')).toHaveTextContent('Sign-in failed')
  view.rerender(
    <MemoryRouter>
      <AuthContext.Provider value={{ ...state, loading: true }}>
        <LoginPage />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
  expect(screen.getByRole('status')).toHaveTextContent('Restoring')
})
