import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { buildCheckInUrl } from '../lib/checkinLinks'
import "./CheckInSharePanel.css";

type Props = {
  token: string
  isOpen: boolean
  onSetOpen: (open: boolean) => Promise<void>  // parent saves; rejects on failure
}

export default function CheckInSharePanel({ token, isOpen, onSetOpen }: Props) {
  const url = buildCheckInUrl(token)
  const [qr, setQr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Generate the QR from the URL only
  useEffect(() => {
    let active = true
    QRCode.toDataURL(url, { width: 1024, margin: 2 }).then((d) => active && setQr(d))
    return () => { active = false }
  }, [url])

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Could not copy. Select the link and copy it manually.')
    }
  }

  function downloadQr() {
    if (!qr) return
    const a = document.createElement('a')
    a.href = qr
    a.download = 'check-in-qr.png'
    a.click()
  }

  async function toggle() {
    setSaving(true)
    setError(null)
    try {
      await onSetOpen(!isOpen)        // parent updates isOpen only after success
    } catch {
      setError('Could not update check-in. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="share-panel" aria-labelledby="share-heading">
      <h2 id="share-heading" className="share-panel-title">Check-in link</h2>

      <div className="share-panel-status">
        <span className={`share-panel-badge share-panel-badge--${isOpen ? 'open' : 'closed'}`}>
          {isOpen ? 'Open' : 'Closed'}
        </span>
        <button
          className={`share-panel-button ${isOpen ? 'share-panel-button--danger' : 'share-panel-button--primary'}`}
          onClick={toggle}
          disabled={saving}
        >
          {saving ? 'Saving…' : isOpen ? 'Close check-in' : 'Open check-in'}
        </button>
      </div>

      <div>
        <label htmlFor="share-link" className="share-panel-field-label">Public link</label>
        <div className="share-panel-link-row">
          <input id="share-link" className="share-panel-input" readOnly value={url}
                onFocus={(e) => e.target.select()} />
          <button className="share-panel-button" onClick={copyLink}>{copied ? 'Copied!' : 'Copy link'}</button>
        </div>
      </div>

      <div className="share-panel-actions">
        <a className="share-panel-link-button" href={url} target="_blank" rel="noopener noreferrer">Preview form</a>
      </div>

      <div className="share-panel-qr">
        {qr
          ? <img src={qr} alt="QR code for the check-in link" />
          : <div className="share-panel-qr-placeholder">Generating QR…</div>}
        <button className="share-panel-button" onClick={downloadQr} disabled={!qr}>Download QR PNG</button>
      </div>

      {error && <p role="alert" className="share-panel-error">{error}</p>}
    </section>
  )
}