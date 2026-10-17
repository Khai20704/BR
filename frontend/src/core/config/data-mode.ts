export type DataMode = 'fixture' | 'http'
export function resolveDataMode(
  value: unknown,
  development: boolean,
): DataMode {
  if (
    value !== undefined &&
    value !== '' &&
    value !== 'fixture' &&
    value !== 'http'
  )
    throw new Error('Invalid VITE_DATA_MODE. Use fixture or http.')
  // A production build can never activate fixture adapters, even if misconfigured.
  return development && value === 'fixture' ? 'fixture' : 'http'
}
