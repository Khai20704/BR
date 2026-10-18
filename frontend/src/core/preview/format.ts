/** Formatting helpers shared by the preview pages. */

/** Elapsed-time label. The backend reports minutes, not wall-clock time. */
export function formatMinute(minute: number): string {
  const hours = Math.floor(minute / 60)
  const minutes = minute % 60
  if (minutes === 0) return `${hours} h`
  return `${hours} h ${minutes} min`
}

export function formatMeasurement(
  value: number | null,
  unit: string,
  digits = 1,
): string {
  if (value === null) return '—'
  return `${value.toFixed(digits)} ${unit}`
}

export function range(values: readonly number[]): {
  min: number
  max: number
} | null {
  if (values.length === 0) return null
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  }
}

export function formatRange(
  bounds: { min: number; max: number } | null,
  digits = 0,
): string {
  if (!bounds) return '—'
  return `${bounds.min.toFixed(digits)}–${bounds.max.toFixed(digits)}`
}
