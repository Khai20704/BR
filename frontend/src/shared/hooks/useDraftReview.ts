import { useState } from 'react'
// Draft review is UI state only. It deliberately performs no server mutation.
export function useDraftReview() {
  const [reviewed, setReviewed] = useState<Record<string, unknown> | null>(null)
  return {
    reviewed,
    review: async (values: Record<string, unknown>) => {
      setReviewed(values)
    },
  }
}
