// import { useEffect, useState } from 'react'
// import QRCode from 'qrcode'
// import { buildCheckInUrl } from '../lib/checkinLinks'
// import "./CheckInSharePanel.css";

// type Props = {
//   token: string
//   eventName?: string
//   isOpen: boolean

//   canToggle?: boolean
//   disabledReason?: string

//   onSetOpen: (open: boolean) => Promise<void>  // parent saves; rejects on failure
// }

// function fileSafe(name: string) {
//   return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
// }

// export default function CheckInSharePanel({ token, eventName, isOpen, canToggle=true, disabledReason, onSetOpen }: Props) {
//   const url = buildCheckInUrl(token)
//   const reach = urlReachability(url)
//   const [qrState, setQrState] = useState<string | null>(null)
//   const current = qrState?.url === url ? qrState : null
//   const qr = current?.data ?? null
//   const qrFailed = !!current && current.data === null
//   const [saving, setSaving] = useState(false)
//   const [error, setError] = useState<string | null>(null)
//   const [copied, setCopied] = useState(false)

//   // Generate the QR from the URL only
//   useEffect(() => {
//     let active = true
//     QRCode.toDataURL(url, { width: 1024, margin: 2 })
//       .then((data) => active && setQrState({ url, data: }))
//       .catch(() => active && setQrState({ url, data: null }))
//     return () => { active = false }
//   }, [url])

//   async function copyLink() {
//     try {
//       await navigator.clipboard.writeText(url)
//       setCopied(true)
//       setTimeout(() => setCopied(false), 2000)
//     } catch {
//       setError('Could not copy. Select the link and copy it manually.')
//     }
//   }

//   function downloadQr() {
//     if (!qr) return
//     const a = document.createElement('a')
//     a.href = qr
//     a.download = 'check-in-qr.png'
//     a.click()
//   }

//   async function toggle() {
//     setSaving(true)
//     setError(null)
//     try {
//       await onSetOpen(!isOpen)        // parent updates isOpen only after success
//     } catch {
//       setError('Could not update check-in. Please try again.')
//     } finally {
//       setSaving(false)
//     }
//   }

//   return (
//     <section className="share-panel" aria-labelledby="share-heading">
//       <h2 id="share-heading" className="share-panel-title">Check-in link</h2>

//       <div className="share-panel-status">
//         <span className={`share-panel-badge share-panel-badge--${isOpen ? 'open' : 'closed'}`}>
//           {isOpen ? 'Open' : 'Closed'}
//         </span>
//         <button
//           className={`share-panel-button ${isOpen ? 'share-panel-button--danger' : 'share-panel-button--primary'}`}
//           onClick={toggle}
//           disabled={saving}
//         >
//           {saving ? 'Saving…' : isOpen ? 'Close check-in' : 'Open check-in'}
//         </button>
//       </div>

//       <div>
//         <label htmlFor="share-link" className="share-panel-field-label">Public link</label>
//         <div className="share-panel-link-row">
//           <input id="share-link" className="share-panel-input" readOnly value={url}
//                 onFocus={(e) => e.target.select()} />
//           <button className="share-panel-button" onClick={copyLink}>{copied ? 'Copied!' : 'Copy link'}</button>
//         </div>
//       </div>

//       <div className="share-panel-actions">
//         <a className="share-panel-link-button" href={url} target="_blank" rel="noopener noreferrer">Preview form</a>
//       </div>

//       <div className="share-panel-qr">
//         {qr
//           ? <img src={qr} alt="QR code for the check-in link" />
//           : <div className="share-panel-qr-placeholder">Generating QR…</div>}
//         <button className="share-panel-button" onClick={downloadQr} disabled={!qr}>Download QR PNG</button>
//       </div>

//       {error && <p role="alert" className="share-panel-error">{error}</p>}
//     </section>
//   )
// }
import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { buildCheckInUrl, urlReachability } from '../lib/checkinLinks'
import './CheckInSharePanel.css'

type Props = {
  token: string
  eventName?: string
  isOpen: boolean
  /** False when the backend will refuse to open check-in (cancelled or finalized events). */
  canToggle?: boolean
  disabledReason?: string
  /** Parent saves; it must reject on failure so the panel can show the error. */
  onSetOpen: (open: boolean) => Promise<void>
}

function fileSafe(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
}

export default function CheckInSharePanel({ token, eventName, isOpen, canToggle = true, disabledReason, onSetOpen }: Props) {
  const url = buildCheckInUrl(token)
  const reach = urlReachability(url)
  // Keyed by URL so a stale QR is never shown for a different link.
  const [qrState, setQrState] = useState<{ url: string; data: string | null } | null>(null)
  const current = qrState?.url === url ? qrState : null
  const qr = current?.data ?? null
  const qrFailed = !!current && current.data === null
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<number | undefined>(undefined)

  // The QR encodes the same URL as "Copy link" and nothing else: no IDs, no credentials.
  useEffect(() => {
    let active = true
    QRCode.toDataURL(url, { width: 1024, margin: 2 })
      .then((data) => { if (active) setQrState({ url, data }) })
      .catch(() => { if (active) setQrState({ url, data: null }) })
    return () => { active = false }
  }, [url])

  useEffect(() => () => window.clearTimeout(copyTimer.current), [])

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setError(null)
      setCopied(true)
      window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Could not copy. Select the link and copy it manually.')
    }
  }

  function downloadQr() {
    if (!qr) return
    const a = document.createElement('a')
    a.href = qr
    const slug = eventName ? fileSafe(eventName) : ''
    a.download = slug ? `check-in-qr-${slug}.png` : 'check-in-qr.png'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  async function toggle() {
    setSaving(true)
    setError(null)
    try {
      await onSetOpen(!isOpen) // the parent changes isOpen only after the backend confirms
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Could not update check-in. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="share-panel" aria-labelledby="share-heading">
      <h2 id="share-heading" className="share-panel-title">Check-in link{eventName ? `: ${eventName}` : ''}</h2>

      <div className="share-panel-status">
        <span className={`share-panel-badge share-panel-badge--${isOpen ? 'open' : 'closed'}`} role="status">
          {isOpen ? 'Open' : 'Closed'}
        </span>
        <button
          type="button"
          className={`share-panel-button ${isOpen ? 'share-panel-button--danger' : 'share-panel-button--primary'}`}
          onClick={toggle}
          disabled={saving || (!canToggle && !isOpen)}
        >
          {saving ? 'Saving…' : isOpen ? 'Close check-in' : 'Open check-in'}
        </button>
      </div>
      {!canToggle && !isOpen && disabledReason && <p className="share-panel-hint">{disabledReason}</p>}

      {reach === 'this-device' && (
        <p className="share-panel-note" role="note">
          This link points to <strong>localhost</strong>, so it only works on this computer. Set
          VITE_PUBLIC_APP_URL to an address other devices can reach before putting the QR code on slides.
        </p>
      )}
      {reach === 'same-network' && (
        <p className="share-panel-note" role="note">
          This link uses a local-network address, so it only works for devices on the same network.
        </p>
      )}

      <div>
        <label htmlFor="share-link" className="share-panel-field-label">Public link</label>
        <div className="share-panel-link-row">
          <input id="share-link" className="share-panel-input" readOnly value={url} onFocus={(e) => e.target.select()} />
          <button type="button" className="share-panel-button" onClick={copyLink}>{copied ? 'Copied!' : 'Copy link'}</button>
        </div>
      </div>

      <div className="share-panel-actions">
        <a className="share-panel-link-button" href={url} target="_blank" rel="noopener noreferrer">Preview form</a>
      </div>

      <div className="share-panel-qr">
        {qr
          ? <img src={qr} alt="QR code for the check-in link" />
          : <div className="share-panel-qr-placeholder">{qrFailed ? 'QR code unavailable' : 'Generating QR…'}</div>}
        <button type="button" className="share-panel-button" onClick={downloadQr} disabled={!qr}>Download QR PNG</button>
        <p className="share-panel-hint">Closing and reopening check-in never changes this link, so QR codes you already shared keep working.</p>
      </div>

      {error && <p role="alert" className="share-panel-error">{error}</p>}
    </section>
  )
}