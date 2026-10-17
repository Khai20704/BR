import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { ReplanningPage } from './ReplanningPage'
it('does not submit on slider input and exposes loading and disconnected errors', async () => {
  const load = vi.fn().mockRejectedValue(new Error('Backend not configured'))
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { mutations: { retry: false } } })
      }
    >
      <ReplanningPage load={load} preview={false} />
    </QueryClientProvider>,
  )
  fireEvent.change(screen.getByRole('slider'), { target: { value: '50' } })
  expect(load).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Replan' }))
  expect(
    await screen.findByRole('button', { name: 'Requesting…' }),
  ).toBeDisabled()
  expect(
    await screen.findByRole('alert', {}, { timeout: 2000 }),
  ).toHaveTextContent('Backend not configured')
  expect(load).toHaveBeenCalledOnce()
})
