import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useParams } from 'react-router'
import { getCheckInInfo, submitCheckIn } from '../lib/checkinAPI'
import { ApiError } from '../types/checkin'
import type { CheckInInfo, CheckInResult } from '../types/checkin'

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; info: CheckInInfo }
  | { kind: 'invalid-link' }
  | { kind: 'error'; message: string }

export default function CheckInPage() {
  const { token = '' } = useParams()
  const [load, setLoad] = useState<LoadState>({ kind: 'loading' })
  const [identifier, setIdentifier] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [result, setResult] = useState<CheckInResult | null>(null)

  useEffect(() => {
    let cancelled = false
    getCheckInInfo(token)
      .then((info) => !cancelled && setLoad({ kind: 'ready', info }))
      .catch((err: ApiError) => {
        if (cancelled) return
        if (err.status === 404) setLoad({ kind: 'invalid-link' })
        else setLoad({ kind: 'error', message: err.message })
      })
    return () => { cancelled = true }
  }, [token])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    const value = identifier.trim()
    if (!value) { setFieldError('Please enter this field.'); return }
    setFieldError(null)
    setSubmitting(true)
    try {
      setResult(await submitCheckIn(token, value))
    } catch (err) {
      const e = err as ApiError
      if (e.code === 'CHECK_IN_CLOSED') setLoad({ kind: 'ready', info: { ...(load as any).info, is_open: false } })
      else if (e.status === 422) setFieldError(e.message)
      else if (e.status === 429) setFormError('Too many attempts. Please wait a moment and try again.')
      else if (e.code === 'NETWORK_ERROR') setFormError('Network error. Check your connection and try again.')
      else setFormError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      {load.kind === 'loading' && <p role="status">Loading…</p>}
      {load.kind === 'invalid-link' && <p>This check-in link isn’t valid. Ask an officer for a new one.</p>}
      {load.kind === 'error' && <p role="alert">{load.message}</p>}

      {load.kind === 'ready' && result && (
        <section role="status">
          <h1 className="text-2xl font-bold">{load.info.display_name}</h1>
          <p className="mt-4">{result.message}</p>
        </section>
      )}

      {load.kind === 'ready' && !result && !load.info.is_open && (
        <section>
          <h1 className="text-2xl font-bold">{load.info.display_name}</h1>
          <p className="mt-4">Check-in is currently closed.</p>
        </section>
      )}

      {load.kind === 'ready' && !result && load.info.is_open && (
        <form onSubmit={handleSubmit} noValidate>
          <h1 className="text-2xl font-bold">{load.info.display_name}</h1>
          <label htmlFor="identifier" className="mt-6 block font-medium">
            {load.info.identifier_label}
          </label>
          <input
            id="identifier"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="mt-1 w-full rounded border p-2"
            aria-invalid={!!fieldError}
            aria-describedby={fieldError ? 'identifier-error' : undefined}
            disabled={submitting}
          />
          {fieldError && <p id="identifier-error" className="mt-1 text-red-600">{fieldError}</p>}
          {formError && <p role="alert" className="mt-3 text-red-600">{formError}</p>}
          <button type="submit" disabled={submitting} className="mt-4 w-full rounded bg-blue-600 p-2 text-white disabled:opacity-50">
            {submitting ? 'Submitting…' : 'Check in'}
          </button>
        </form>
      )}
    </main>
  )
}