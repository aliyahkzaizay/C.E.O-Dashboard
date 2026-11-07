import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Club } from "../hooks/useClubs";
import { createEvent, eventAction, listEvents, updateEvent } from "../lib/events";
import type { CeoEvent, EventAction, EventPage } from "../lib/events";
import "./Members.css";

const PAGE_SIZE = 20;

/** ISO string -> value for <input type="datetime-local"> in local time. */
function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EventForm({ event, organizationId, onCancel, onSaved }: { event?: CeoEvent; organizationId: string; onCancel: () => void; onSaved: () => void }) {
  const [name, setName] = useState(event?.event_name ?? "");
  const [type, setType] = useState(event?.event_type ?? "");
  const [startsAt, setStartsAt] = useState(event ? toLocalInput(event.starts_at) : "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!name.trim() || !startsAt) { setError("Name and start time are required."); return; }
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
      setSaving(false);
    }
  }

  return <form className="member-card" onSubmit={submit} aria-label={event ? "Edit event" : "Add event"}>
    <h3>{event ? "Edit event" : "Add event"}</h3>
    <label>Name<input value={name} maxLength={200} onChange={e => setName(e.target.value)} required autoFocus /></label>
    <label>Starts at<input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} required /></label>
    <label>Type (optional)<input value={type} maxLength={50} onChange={e => setType(e.target.value)} /></label>
    <label>Description (optional)<textarea value={description} maxLength={2000} rows={3} onChange={e => setDescription(e.target.value)} /></label>
    {error && <p role="alert">{error}</p>}
    <div className="member-roster-actions">
      <button type="button" onClick={onCancel} disabled={saving}>Cancel</button>
      <button className="member-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save event"}</button>
    </div>
  </form>;
}

/** Display only the selected club's events; parent keys this page by club ID. */
export default function Events({ club }: { club: Club }) {
  const [offset, setOffset] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [showArchived, setShowArchived] = useState(false);
  const [result, setResult] = useState<{ key: string; data?: EventPage; error?: string } | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<CeoEvent | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const addButton = useRef<HTMLButtonElement>(null);

  const key = JSON.stringify([offset, attempt, showArchived]);
  const current = result?.key === key ? result : null;
  const data = current?.data;
  const loading = !current;

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void listEvents(club.organization_id, offset, controller.signal, showArchived, PAGE_SIZE).then(page => {
      if (!active) return;
      if (offset > 0 && offset >= page.total) { setOffset(Math.max(0, Math.ceil(page.total / PAGE_SIZE) - 1) * PAGE_SIZE); return; }
      setResult({ key, data: page });
    }).catch(error => {
      if (active) setResult({ key, error: error instanceof Error ? error.message : "Unable to load events." });
    });
    return () => { active = false; controller.abort(); };
  }, [club.organization_id, offset, key, showArchived]);

  function closeForm() { setAdding(false); setEditing(null); addButton.current?.focus(); }

  async function run(event: CeoEvent, action: EventAction, message: string) {
    setBusyId(event.event_id);
    setActionError("");
    try {
      await eventAction(club.organization_id, event.event_id, action);
      setNotice(message);
      setAttempt(n => n + 1);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  function statusLabel(e: CeoEvent) {
    if (e.archived_at) return "Archived";
    if (e.status === "cancelled") return "Cancelled";
    if (e.attendance_finalized_at) return "Attendance finalized";
    return e.check_in_open ? "Check-in open" : "Scheduled";
  }

  return <div className="members-page">
    <section className="member-card member-roster" aria-labelledby="events-heading">
      <div className="member-section-heading">
        <div><h2 id="events-heading">Events</h2><p>{club.organization_name}</p></div>
        <div className="member-roster-actions">
          <label><input type="checkbox" checked={showArchived} onChange={e => { setShowArchived(e.target.checked); setOffset(0); }} /> Show archived</label>
          <button ref={addButton} className="member-primary" type="button" aria-expanded={adding} onClick={() => { setEditing(null); setAdding(true); setNotice(""); }}>+ Add event</button>
        </div>
      </div>

      {(adding || editing) && <EventForm key={editing?.event_id ?? "new"} event={editing ?? undefined} organizationId={club.organization_id} onCancel={closeForm} onSaved={() => { const wasEditing = !!editing; closeForm(); setAttempt(n => n + 1); setNotice(wasEditing ? "Event updated." : "Event added."); }} />}
      {notice && <p className="member-success" role="status">{notice}</p>}
      {actionError && <p role="alert">{actionError}</p>}

      <div aria-busy={loading}>
        {loading ? <p className="member-empty" role="status">Loading events…</p>
          : current?.error ? <div className="member-empty"><p role="alert">{current.error}</p><button type="button" onClick={() => setAttempt(n => n + 1)}>Retry</button></div>
          : data && data.total === 0 ? <div className="member-empty"><h3>No events yet</h3><p>Add your first event to start tracking attendance.</p></div>
          : data && <>
            <div className="member-table-scroll" tabIndex={0} role="region" aria-label="Events table">
              <table>
                <thead><tr><th>Name</th><th>Date</th><th>Type</th><th>Status</th><th scope="col">Actions</th></tr></thead>
                <tbody>{data.items.map(e => {
                  const busy = busyId === e.event_id;
                  const locked = !!e.archived_at;
                  const canCheckIn = !locked && e.status !== "cancelled" && !e.attendance_finalized_at;
                  return <tr key={e.event_id}>
                    <td className="member-name">{e.event_name}</td>
                    <td>{new Date(e.starts_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</td>
                    <td>{e.event_type ?? "—"}</td>
                    <td><span className="member-badge">{statusLabel(e)}</span></td>
                    <td>
                      {!locked && <button type="button" disabled={busy} onClick={() => { setAdding(false); setEditing(e); setNotice(""); }}>Edit</button>}
                      {canCheckIn && (e.check_in_open
                        ? <button type="button" disabled={busy} onClick={() => run(e, "close-checkin", "Check-in closed.")}>Close check-in</button>
                        : <button type="button" disabled={busy} onClick={() => run(e, "open-checkin", "Check-in opened.")}>Open check-in</button>)}
                      {canCheckIn && !e.check_in_open && <button type="button" disabled={busy} onClick={() => run(e, "finalize-attendance", "Attendance finalized.")}>Finalize attendance</button>}
                      {!locked && e.status !== "cancelled" && <button type="button" disabled={busy} onClick={() => { if (window.confirm(`Cancel "${e.event_name}"?`)) void run(e, "cancel", "Event cancelled."); }}>Cancel event</button>}
                      {!locked && <button type="button" disabled={busy} onClick={() => { if (window.confirm(`Archive "${e.event_name}"? It can't be edited afterward.`)) void run(e, "archive", "Event archived."); }}>Archive</button>}
                    </td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
            <div className="member-pagination">
              <p>{offset + 1}–{offset + data.items.length} of {data.total} events</p>
              <div>
                <button type="button" disabled={offset === 0} onClick={() => setOffset(n => Math.max(0, n - PAGE_SIZE))}>Previous</button>
                <span>Page {Math.floor(offset / PAGE_SIZE) + 1} of {Math.ceil(data.total / PAGE_SIZE)}</span>
                <button type="button" disabled={offset + PAGE_SIZE >= data.total} onClick={() => setOffset(n => n + PAGE_SIZE)}>Next</button>
              </div>
            </div>
          </>}
      </div>
    </section>
  </div>;
}
