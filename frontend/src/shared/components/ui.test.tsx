import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { Status } from './ui'
it.each(['NEED_MORE_DATA', 'NO_FEASIBLE_PLAN', 'NOT_VALIDATED'] as const)(
  'renders %s without implying success',
  (value) => {
    render(<Status value={value} />)
    expect(screen.getByText(value)).toBeInTheDocument()
  },
)
