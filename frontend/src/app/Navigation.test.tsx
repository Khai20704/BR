import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { App } from './App'
vi.mock('@/core/auth/context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/core/auth/context')>()),
  useAuth: () => ({
    user: {
      uid: 'test-user',
      getIdTokenResult: async () => ({
        claims: { name: 'Test', email: 'test@example.test' },
      }),
      displayName: 'Test',
      email: 'test@example.test',
      photoURL: '',
    },
    loading: false,
    error: '',
    logout: async () => {},
  }),
}))
vi.mock('@/core/workspace/repository', () => ({
  createWorkspaceRepository: () => ({
    load: async () => null,
    profile: async () => {},
    save: async () => 1,
  }),
}))
beforeEach(() => window.history.replaceState({}, '', '/'))
it('navigates to all eight workspace pages', async () => {
  render(<App />)
  await screen.findByRole('navigation')
  const nav = within(screen.getByRole('navigation'))
  const pages = [
    ['Site setup', 'Site setup'],
    ['Batch setup', 'Batch setup'],
    ['Thermal profile', 'Thermal profile'],
    ['Thermal digital twin', 'Thermal digital twin'],
    ['AI planning', 'AI planning'],
    ['Adaptive replanning', 'Adaptive replanning'],
    ['Benchmark', 'Benchmark'],
    ['Overview', 'Br — AI Thermal Engineer'],
  ]
  for (const [link, title] of pages) {
    fireEvent.click(nav.getByRole('link', { name: link }))
    expect(
      screen.getByRole('heading', { level: 1, name: title }),
    ).toBeInTheDocument()
  }
})
it('keeps the not-found route', async () => {
  window.history.replaceState({}, '', '/not-a-page')
  render(<App />)
  await screen.findByRole('navigation')
  expect(
    screen.getByRole('heading', { name: 'Page not found' }),
  ).toBeInTheDocument()
  fireEvent.click(screen.getByRole('link', { name: 'Return home' }))
  expect(
    screen.getByRole('heading', { level: 1, name: 'Br — AI Thermal Engineer' }),
  ).toBeInTheDocument()
})
it('opens and dismisses mobile navigation with Escape', async () => {
  render(<App />)
  await screen.findByRole('navigation')
  const button = screen.getByRole('button', { name: 'Open menu' })
  fireEvent.click(button)
  expect(button).toHaveAttribute('aria-expanded', 'true')
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(button).toHaveAttribute('aria-expanded', 'false')
  expect(button).toHaveFocus()
})
