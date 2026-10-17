import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { BatchSetupPage } from './BatchSetupPage'
it('requires numeric inputs, rejects contradictory moisture and reviews only a valid local draft', async () => {
  render(<BatchSetupPage />)
  fireEvent.click(screen.getByRole('button', { name: 'Review draft' }))
  expect(screen.getAllByText('This value is required.').length).toBe(4)
  fireEvent.change(screen.getByLabelText(/Mass after pressing/), {
    target: { value: '12' },
  })
  fireEvent.change(screen.getByLabelText(/Initial moisture/), {
    target: { value: '62' },
  })
  fireEvent.change(screen.getByLabelText(/Target moisture/), {
    target: { value: '70' },
  })
  fireEvent.change(screen.getByLabelText(/Maximum duration/), {
    target: { value: '8' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Review draft' }))
  expect(
    screen.getByText('Target moisture must be lower than initial moisture.'),
  ).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText(/Target moisture/), {
    target: { value: '12' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Review draft' }))
  expect(await screen.findByRole('status')).toHaveTextContent(
    'not engineering-validated or saved to a server',
  )
})
