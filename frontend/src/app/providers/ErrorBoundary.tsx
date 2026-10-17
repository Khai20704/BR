import { Component, type ReactNode } from 'react'
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError)
      return (
        <main className="p-6" role="alert">
          <h1>Br could not start</h1>
          <p>Please check the application configuration and reload.</p>
          <button type="button" onClick={() => window.location.reload()}>
            Reload
          </button>
        </main>
      )
    return this.props.children
  }
}
