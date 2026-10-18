import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { App } from './App'
it('requires login before opening private workspace', () => {
  render(<App />)
  expect(
    screen.getByRole('heading', { name: 'Your heat. Your workspace.' }),
  ).toBeInTheDocument()
})
