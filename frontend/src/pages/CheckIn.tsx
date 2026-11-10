import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useParams } from 'react-router'
import { getCheckInInfo, submitCheckIn } from '../lib/checkinAPI'
import { ApiError } from '../types/checkin'
import type { CheckInInfo, CheckInResult } from '../types/checkin'
import "./CheckIn.css";

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; info: CheckInInfo }
  | { kind: 'invalid-link' }
  | { kind: 'error'; message: string }

// Our own wording for each status; the server's message (if any) is used first.
const STATUS_COPY: Record<CheckInResult['status'], { icon: string; title: string; body: string }> = {
  accepted: { icon: '✓', title: 'You’re checked in', body: 'Thanks! Your check-in was recorded.' },
  already_checked_in: { icon: '✓', title: 'Already checked in', body: 'You’ve already checked in for this event.' },
  pending_review: { icon: '!', title: 'Sent for review', body: 'An officer will review your check-in.' },
}

export default function CheckInPage() {
  const { token = '' } = useParams()
  const [load, setLoad] = useState<LoadState>({ kind: 'loading' })
  const [identifier, setIdentifier] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [result, setResult] = useState<CheckInResult | null>(null)
  const [attempt, setAttempt] = useState(0)

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
  }, [token, attempt])

  function retryLoad() {
    setLoad({ kind: 'loading' })
    setAttempt((n) => n + 1)
  }

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
    <main className="checkin-page">
      <div className="checkin-card">
        {load.kind === 'loading' && (
          <p className="checkin-loading" role="status">
            <span className="checkin-spinner" aria-hidden="true" />
            Loading…
          </p>
        )}

        {load.kind === 'invalid-link' && (
          <section className="checkin-status checkin-status--invalid">
            <div className="checkin-status-icon" aria-hidden="true">?</div>
            <h1 className="checkin-title">Link not valid</h1>
            <p className="checkin-text">This check-in link isn’t valid. Ask an officer for a new one.</p>
          </section>
        )}

        {load.kind === 'error' && (
          <section>
            <p className="checkin-alert" role="alert">{load.message}</p>
            <button type="button" className="checkin-button checkin-button--secondary" onClick={retryLoad}>
              Try again
            </button>
          </section>
        )}

        {load.kind === 'ready' && result && (
          <section className={`checkin-status checkin-status--${result.status}`} role="status">
            <div className="checkin-status-icon" aria-hidden="true">{STATUS_COPY[result.status].icon}</div>
            <h1 className="checkin-title">{STATUS_COPY[result.status].title}</h1>
            <p className="checkin-text">{result.message || STATUS_COPY[result.status].body}</p>
            <p className="checkin-eyebrow">{load.info.display_name}</p>
          </section>
        )}

        {load.kind === 'ready' && !result && !load.info.is_open && (
          <section className="checkin-status checkin-status--closed">
            <div className="checkin-status-icon" aria-hidden="true">–</div>
            <h1 className="checkin-title">Check-in is closed</h1>
            <p className="checkin-text">Check-in for {load.info.display_name} isn’t open right now.</p>
          </section>
        )}

        {load.kind === 'ready' && !result && load.info.is_open && (
          <form onSubmit={handleSubmit} noValidate>
            <p className="checkin-eyebrow">Check in</p>
            <h1 className="checkin-title">{load.info.display_name}</h1>
            <div className="checkin-form">
              <label htmlFor="identifier" className="checkin-label">
                {load.info.identifier_label}
              </label>
              <input
                id="identifier"
                className="checkin-input"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                aria-invalid={!!fieldError}
                aria-describedby={fieldError ? 'identifier-error' : undefined}
                disabled={submitting}
                autoComplete="off"
              />
              {fieldError && <p id="identifier-error" className="checkin-field-error">{fieldError}</p>}
              {formError && <p role="alert" className="checkin-alert">{formError}</p>}
              <button type="submit" disabled={submitting} className="checkin-button">
                {submitting ? 'Submitting…' : 'Check in'}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  )
}