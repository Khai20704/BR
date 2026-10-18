import { z } from 'zod'
const INVALID_CONFIG_MESSAGE =
  'Invalid VITE_API_BASE_URL. Use a public HTTP(S) backend URL.'
// Pure, non-throwing check: an unparsable string must fail validation, not throw a TypeError.
function isPublicHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      url.username === '' &&
      url.password === '' &&
      url.search === '' &&
      url.hash === ''
    )
  } catch {
    return false
  }
}
const schema = z.object({
  VITE_API_BASE_URL: z.preprocess(
    value => (value === '' ? undefined : value),
    z
      .string()
      .refine(
        isPublicHttpUrl,
        'Use a public HTTP(S) backend URL without credentials, query or fragment',
      )
      .optional(),
  ),
})
export function parseEnvironment(input: unknown) {
  const result = schema.safeParse(input)
  if (!result.success) throw new Error(INVALID_CONFIG_MESSAGE)
  return { apiBaseUrl: result.data.VITE_API_BASE_URL }
}
