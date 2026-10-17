import type { ReactNode } from 'react'
import {
  AlertCircle,
  ArrowUpRight,
  FlaskConical,
  LoaderCircle,
  Unplug,
} from 'lucide-react'
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'green' | 'amber' | 'red'
}) {
  return <span className={'badge ' + tone}>{children}</span>
}
export function PreviewLabel() {
  return (
    <Badge tone="amber">
      <FlaskConical size={11} />
      SYNTHETIC / UI PREVIEW
    </Badge>
  )
}
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  )
}
export function Panel({
  title,
  subtitle,
  children,
  action,
  className = '',
}: {
  title: string
  subtitle?: string
  children: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <section className={'panel ' + className}>
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
export function Stat({
  label,
  value,
  unit,
  detail,
  icon,
}: {
  label: string
  value: string
  unit?: string
  detail: string
  icon: ReactNode
}) {
  return (
    <div className="stat">
      <div className="stat-top">
        <span>{label}</span>
        {icon}
      </div>
      <div className="stat-value">
        {value}
        <span>{unit}</span>
      </div>
      <p>{detail}</p>
    </div>
  )
}
export function EmptyState({
  title = 'Backend disconnected',
  children,
}: {
  title?: string
  children?: ReactNode
}) {
  return (
    <div className="empty-state">
      <Unplug size={25} />
      <h3>{title}</h3>
      <p>
        {children ??
          'No live data is available. Backend integration is pending; preview data is never used as a fallback.'}
      </p>
    </div>
  )
}
export function RequestState({
  pending,
  error,
  retry,
}: {
  pending: boolean
  error: Error | null
  retry: () => void
}) {
  if (pending)
    return (
      <div className="request-state" role="status">
        <LoaderCircle className="spin" size={18} /> Loading workspace data·
      </div>
    )
  if (error)
    return (
      <div className="request-state" role="alert">
        <Unplug size={18} />
        <div>
          <strong>Backend disconnected</strong>
          <p>{error.message}</p>
        </div>
        <button className="button secondary" onClick={retry}>
          Retry
        </button>
      </div>
    )
  return null
}
export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="notice">
      <AlertCircle size={16} />
      <span>{children}</span>
    </div>
  )
}
export function Status({
  value,
}: {
  value: 'NEED_MORE_DATA' | 'NO_FEASIBLE_PLAN' | 'NOT_VALIDATED'
}) {
  return (
    <Badge tone={value === 'NO_FEASIBLE_PLAN' ? 'red' : 'amber'}>{value}</Badge>
  )
}
export function TextLink({ children }: { children: ReactNode }) {
  return (
    <span className="text-link">
      {children}
      <ArrowUpRight size={14} />
    </span>
  )
}
