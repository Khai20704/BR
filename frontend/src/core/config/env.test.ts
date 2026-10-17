import { describe, expect, it } from 'vitest'
import { parseEnvironment } from './env'

describe('public environment', () => {
  it('allows an absent backend', () => {
    expect(parseEnvironment({}).apiBaseUrl).toBeUndefined()
    expect(
      parseEnvironment({ VITE_API_BASE_URL: '' }).apiBaseUrl,
    ).toBeUndefined()
  })
  it('accepts a public HTTP URL', () => {
    expect(
      parseEnvironment({ VITE_API_BASE_URL: 'http://localhost:8000' })
        .apiBaseUrl,
    ).toBe('http://localhost:8000')
  })
  it.each([
    'invalid',
    'ftp://example.com',
    'https://user:secret@example.com',
    'https://example.com?key=secret',
  ])('rejects unsafe or invalid config: %s', (value) => {
    expect(() => parseEnvironment({ VITE_API_BASE_URL: value })).toThrow(
      'Invalid VITE_API_BASE_URL',
    )
  })
})
