import { BrowserRouter, useRoutes } from 'react-router'
import { AppProviders } from './providers/AppProviders'
import { ErrorBoundary } from './providers/ErrorBoundary'
import { routes } from './router/routes'
function AppRoutes() {
  return useRoutes(routes)
}
export function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AppProviders>
    </ErrorBoundary>
  )
}
