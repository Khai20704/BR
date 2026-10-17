import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { App } from './App'
it('renders the placeholder without a backend', () => {
  render(<App />)
  expect(
    screen.getByRole('heading', { name: 'Br — AI Thermal Engineer' }),
  ).toBeInTheDocument()
})
