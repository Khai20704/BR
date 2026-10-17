import { useState } from 'react'
import { z } from 'zod'
import { Check, Save } from 'lucide-react'
import { Notice } from './ui'
export interface DraftField {
  name: string
  label: string
  placeholder?: string
  unit?: string
  type?: 'text' | 'number'
  options?: string[]
  help?: string
}
export function DraftForm({
  fields,
  schema,
  initialValues,
  onReview,
}: {
  fields: DraftField[]
  schema: z.ZodType<Record<string, unknown>>
  initialValues: Record<string, string>
  onReview: (values: Record<string, unknown>) => Promise<void>
}) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [failure, setFailure] = useState('')
  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    setFailure('')
    const result = schema.safeParse(values)
    if (!result.success) {
      setErrors(
        result.error.issues.reduce<Record<string, string>>(
          (messages, issue) => {
            const key = String(issue.path[0])
            messages[key] ??= issue.message
            return messages
          },
          {},
        ),
      )
      setState('idle')
      return
    }
    setErrors({})
    setState('saving')
    try {
      await onReview(result.data)
      setState('saved')
    } catch (error) {
      setFailure(
        error instanceof Error ? error.message : 'Unable to review draft.',
      )
      setState('idle')
    }
  }
  return (
    <form onSubmit={submit} noValidate>
      <div className="form-grid">
        {fields.map((field) => (
          <div className="field" key={field.name}>
            <label htmlFor={field.name}>
              {field.label}
              {field.unit && <span>{field.unit}</span>}
            </label>
            {field.options ? (
              <select
                id={field.name}
                value={values[field.name] ?? ''}
                onChange={(e) => {
                  setValues({ ...values, [field.name]: e.target.value })
                  setState('idle')
                }}
                aria-invalid={!!errors[field.name]}
                aria-describedby={field.name + '-help'}
              >
                {field.options.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            ) : (
              <input
                id={field.name}
                type={field.type ?? 'text'}
                step="any"
                value={values[field.name] ?? ''}
                placeholder={field.placeholder}
                onChange={(e) => {
                  setValues({ ...values, [field.name]: e.target.value })
                  setState('idle')
                }}
                aria-invalid={!!errors[field.name]}
                aria-describedby={field.name + '-help'}
              />
            )}
            <small
              id={field.name + '-help'}
              className={errors[field.name] ? 'field-error' : ''}
            >
              {errors[field.name] ?? field.help}
            </small>
          </div>
        ))}
      </div>
      <div className="form-footer">
        <span>Local draft only · no backend submission</span>
        <button className="button primary" disabled={state === 'saving'}>
          <Save size={15} />
          {state === 'saving' ? 'Reviewing…' : 'Review draft'}
        </button>
      </div>
      {state === 'saved' && (
        <div className="saved" role="status">
          <Check size={16} />
          Draft reviewed locally. Inputs are not engineering-validated or saved
          to a server.
        </div>
      )}
      {failure && (
        <div role="alert">
          <Notice>{failure}</Notice>
        </div>
      )}
    </form>
  )
}
