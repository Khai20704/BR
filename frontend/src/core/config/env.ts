import { z } from 'zod'
const schema = z.object({
  VITE_API_BASE_URL: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z
      .url()
      .refine((value) => {
        let url: URL
        try {
          url = new URL(value)
        } catch {
          return false
        }
        return (
          ['http:', 'https:'].includes(url.protocol) &&
          !url.username &&
          !url.password &&
          !url.search &&
          !url.hash
        )
      }, 'Use a public HTTP(S) backend URL without credentials, query or fragment')
      .optional(),
  ),
})
export function parseEnvironment(input: unknown) {
  const result = schema.safeParse(input)
  if (!result.success)
    throw new Error(
      'Invalid VITE_API_BASE_URL. Use a public HTTP(S) backend URL.',
    )
  return { apiBaseUrl: result.data.VITE_API_BASE_URL }
}
