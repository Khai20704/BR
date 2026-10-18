import { FlaskConical, Unplug } from 'lucide-react'
import type { DataMode } from '@/core/config/data-mode'

/**
 * States the provenance of everything on the page. Synthetic preview data is
 * only ever reachable in development and is always labelled as such.
 */
export function ProvenanceBar({ mode }: { mode: DataMode }) {
  if (mode === 'fixture')
    return (
      <div className="provenance-bar" role="note">
        <FlaskConical size={13} aria-hidden="true" />
        <span>SYNTHETIC / UI PREVIEW</span>
        <span className="provenance-phase">
          Preview data · not an engineering prediction
        </span>
      </div>
    )

  return (
    <div className="provenance-bar offline" role="note">
      <Unplug size={13} aria-hidden="true" />
      <span>BACKEND DISCONNECTED</span>
      <span className="provenance-phase">No live data · no fallback</span>
    </div>
  )
}
