import { describe, expect, it } from 'vitest'
import { resolveDataMode } from './data-mode'
describe('data adapter selection', () => {
  it('requires explicit development fixture selection', () => {
    expect(resolveDataMode(undefined, true)).toBe('http')
    expect(resolveDataMode('fixture', true)).toBe('fixture')
  })
  it('never enables fixtures in production', () => {
    expect(resolveDataMode('fixture', false)).toBe('http')
    expect(resolveDataMode('http', false)).toBe('http')
  })
  it('rejects unknown modes', () => {
    expect(() => resolveDataMode('fake', true)).toThrow(
      'Invalid VITE_DATA_MODE',
    )
  })
})
