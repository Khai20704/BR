import { useQuery } from '@tanstack/react-query'
/**
 * One query per workspace page. `revision` is part of the key so the request is
 * re-issued when the edited scenario changes, rather than whenever a callback
 * identity happens to change.
 */
export function usePreviewQuery<T>(
  key: string,
  load: () => Promise<T>,
  revision = 0,
) {
  return useQuery({ queryKey: ['workspace', key, revision], queryFn: load, staleTime: Infinity })
}
