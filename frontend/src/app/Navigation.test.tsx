import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, expect, it } from 'vitest'
import { App } from './App'
beforeEach(() => window.history.replaceState({}, '', '/'))
it('navigates to all eight workspace pages', () => {
  render(<App />)
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
it('keeps the not-found route', () => {
  window.history.replaceState({}, '', '/not-a-page')
  render(<App />)
  expect(
    screen.getByRole('heading', { name: 'Page not found' }),
  ).toBeInTheDocument()
  fireEvent.click(screen.getByRole('link', { name: 'Return home' }))
  expect(
    screen.getByRole('heading', { level: 1, name: 'Br — AI Thermal Engineer' }),
  ).toBeInTheDocument()
})
it('opens and dismisses mobile navigation with Escape', () => {
  render(<App />)
  const button = screen.getByRole('button', { name: 'Open menu' })
  fireEvent.click(button)
  expect(button).toHaveAttribute('aria-expanded', 'true')
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(button).toHaveAttribute('aria-expanded', 'false')
  expect(button).toHaveFocus()
})
