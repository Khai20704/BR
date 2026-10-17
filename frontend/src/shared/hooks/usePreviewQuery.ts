import { useQuery } from '@tanstack/react-query'
export function usePreviewQuery<T>(key: string, load: () => Promise<T>) {
  return useQuery({ queryKey: ['workspace', key, load], queryFn: load })
}
