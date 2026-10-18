import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { DOCUMENTED_DRAFT } from '@/core/scenario/scenario-draft'
import { ThermalScenarioForm } from './ThermalScenarioForm'
const save = vi.fn()
vi.mock('@/core/scenario/ScenarioProvider', () => ({
  useScenario: () => ({
    draft: DOCUMENTED_DRAFT,
    ready: true,
    replaceDraft: save,
  }),
}))
beforeEach(() => save.mockReset().mockResolvedValue(undefined))
it('converts humidity percent and saves before requesting simulation', async () => {
  const run = vi.fn()
  render(<ThermalScenarioForm onRun={run} />)
  fireEvent.change(screen.getByLabelText('Relative humidity (%)'), {
    target: { value: '72' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Apply & Simulate' }))
  await waitFor(() => expect(run).toHaveBeenLastCalledWith(true))
  expect(save).toHaveBeenCalledWith(
    expect.objectContaining({ relativeHumidity: 0.72, sourceTemperatureC: 43 }),
  )
})
it('rejects inverted temperature constraints without saving', () => {
  render(<ThermalScenarioForm onRun={vi.fn()} />)
  fireEvent.change(screen.getByLabelText('Minimum drying temperature (°C)'), {
    target: { value: '80' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Apply & Simulate' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Minimum temperature')
  expect(save).not.toHaveBeenCalled()
})
it('retries failed saves and restores the entire demo draft', async () => {
  save.mockRejectedValueOnce(new Error('Offline'))
  const run = vi.fn()
  render(<ThermalScenarioForm onRun={run} />)
  fireEvent.click(screen.getByRole('button', { name: 'Reset to Demo' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Offline')
  expect(run).not.toHaveBeenCalledWith(true)
  fireEvent.click(screen.getByRole('button', { name: 'Retry save & simulate' }))
  await waitFor(() => expect(run).toHaveBeenLastCalledWith(true))
  expect(save).toHaveBeenLastCalledWith(DOCUMENTED_DRAFT)
})
