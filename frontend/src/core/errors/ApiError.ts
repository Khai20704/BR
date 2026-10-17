export type ApiErrorKind =
  | 'unconfigured'
  | 'network'
  | 'timeout'
  | 'cancelled'
  | 'http'
  | 'invalid-response'
  | 'unknown'
export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | undefined
  constructor(kind: ApiErrorKind, message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
  }
}
