import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { ScenarioProvider } from '@/core/scenario/ScenarioProvider'
import { ReplanningPage } from './ReplanningPage'
it('does not submit on slider input and exposes loading and disconnected errors', async () => {
  let rejectRequest!: (error: Error) => void
  const load = vi.fn(() => new Promise<never>((_resolve, reject) => { rejectRequest = reject }))
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { mutations: { retry: false } } })
      }
    >
      <ScenarioProvider>
        <ReplanningPage replan={load} preview={false} />
      </ScenarioProvider>
    </QueryClientProvider>,
  )
  fireEvent.change(screen.getByRole('slider'), { target: { value: '50' } })
  expect(load).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Replan' }))
  expect(
    await screen.findByRole('button', { name: 'Requesting…' }),
  ).toBeDisabled()
  await act(async () => rejectRequest(new Error('Backend not configured')))
  expect(
    await screen.findByRole('alert', {}, { timeout: 2000 }),
  ).toHaveTextContent('Backend not configured')
  expect(load).toHaveBeenCalledOnce()
})
