import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { parseEnvironment } from '@/core/config/env'
import { AuthProvider } from '@/core/auth/AuthProvider'
import { useAuth } from '@/core/auth/context'
import { ScenarioProvider } from '@/core/scenario/ScenarioProvider'
function SessionProviders({ children }: { children: ReactNode }) {
  parseEnvironment(import.meta.env)
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: false,
            refetchOnWindowFocus: false,
          },
          mutations: { retry: false },
        },
      }),
  )
  return (
    <QueryClientProvider client={queryClient}>
      <ScenarioProvider>{children}</ScenarioProvider>
    </QueryClientProvider>
  )
}

function Session({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  return (
    <SessionProviders key={user?.uid ?? 'signed-out'}>
      {children}
    </SessionProviders>
  )
}
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <Session>{children}</Session>
    </AuthProvider>
  )
}
