import { useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { createEvent, updateEvent } from "../lib/events";
import type { CeoEvent } from "../lib/events";

/** ISO string -> value for <input type="datetime-local"> in local time. */
function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Collect event details, preserving entered values when saving fails. */
export default function EventForm({ event, organizationId, onCancel, onSaved }: { event?: CeoEvent; organizationId: string; onCancel: () => void; onSaved: () => void }) {
  const [name, setName] = useState(event?.event_name ?? "");
  const [type, setType] = useState(event?.event_type ?? "");
  const [startsAt, setStartsAt] = useState(event ? toLocalInput(event.starts_at) : "");
  const [description, setDescription] = useState(event?.description ?? "");
  const submitting = useRef(false);
  const headingId = useId();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (submitting.current) return;
    if (!name.trim() || !startsAt) { setError("Name and start time are required."); return; }
    submitting.current = true;
    setSaving(true);
    setError("");
    try {
      const values = {
        event_name: name.trim(),
        event_type: type.trim() || null,
        description: description.trim() || null,
        starts_at: new Date(startsAt).toISOString(),
      };
      if (event) await updateEvent(organizationId, event.event_id, values);
      else await createEvent(organizationId, values);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save event.");
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return <form className="event-form" onSubmit={submit} aria-labelledby={headingId}>
    <div className="event-form-heading"><h3 id={headingId}>{event ? "Edit event" : "Create event"}</h3><p>Name and date/time are required.</p></div>
    <fieldset disabled={saving}>
      <label className="event-field-wide">Event name<input value={name} maxLength={200} onChange={e => setName(e.target.value)} required autoFocus placeholder="e.g. Fall welcome meeting" /></label>
      <label>Date &amp; time<input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} required aria-describedby={`${headingId}-timezone`} /><small id={`${headingId}-timezone`}>{timezone}</small></label>
      <label>Event type <span>Optional</span><input value={type} maxLength={50} onChange={e => setType(e.target.value)} placeholder="e.g. Workshop" /></label>
      <label className="event-field-wide">Description <span>Optional</span><textarea value={description} maxLength={2000} rows={3} onChange={e => setDescription(e.target.value)} placeholder="What should officers know about this event?" /></label>
    </fieldset>
    {error && <p className="event-notice event-error" role="alert">{error}</p>}
    <div className="event-form-footer">
      <button type="button" onClick={onCancel} disabled={saving}>Cancel</button>
      <button className="event-primary" type="submit" disabled={saving}>{saving ? "Saving…" : event ? "Save changes" : "Create event"}</button>
    </div>
  </form>;
}
