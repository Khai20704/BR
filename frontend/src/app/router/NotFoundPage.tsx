import { Link } from 'react-router'
export function NotFoundPage() {
  return (
    <main className="p-6">
      <h1>Page not found</h1>
      <Link to="/">Return home</Link>
    </main>
  )
}
