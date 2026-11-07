import { useEffect, useId, useRef, useState } from "react";
import type { Club } from "../hooks/useClubs";
import { eventAction, listEvents } from "../lib/events";
import type { CeoEvent, EventAction, EventPage } from "../lib/events";
import EventForm from "../components/EventForm";
import "./Events.css";

const PAGE_SIZE = 20;

type RowActionsProps = {
  event: CeoEvent;
  disabled: boolean;
  onEdit: () => void;
  onAction: (action: EventAction, message: string) => void;
};

/** Keep secondary actions in a keyboard-accessible, light-dismiss popover. */
function EventRowActions({ event, disabled, onEdit, onAction }: RowActionsProps) {
  const id = useId();
  const popover = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const canCheckIn = event.status !== "cancelled" && !event.attendance_finalized_at;

  function close() { popover.current?.hidePopover(); trigger.current?.focus(); }
  function act(action: EventAction, message: string, question?: string) {
    close();
    if (!question || window.confirm(question)) onAction(action, message);
  }
  if (event.archived_at) return <span className="event-muted">—</span>;
  return <>
    <button ref={trigger} type="button" className="event-more" disabled={disabled}
      popoverTarget={id} aria-label={`Actions for ${event.event_name}`}
      onClick={() => {
        const rect = trigger.current?.getBoundingClientRect();
        if (rect && popover.current) {
          popover.current.style.left = `${Math.max(8, Math.min(rect.right - 220, window.innerWidth - 228))}px`;
          popover.current.style.top = `${Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - 290))}px`;
        }
      }}><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg></button>
    <div ref={popover} id={id} popover="auto" className="event-action-popover" aria-label={`Actions for ${event.event_name}`}>
      <button type="button" onClick={() => { close(); onEdit(); }}>Edit event</button>
      {canCheckIn && <button type="button" onClick={() => act(event.check_in_open ? "close-checkin" : "open-checkin", event.check_in_open ? "Check-in closed." : "Check-in opened.")}>{event.check_in_open ? "Close check-in" : "Open check-in"}</button>}
      {canCheckIn && !event.check_in_open && <button type="button" onClick={() => act("finalize-attendance", "Attendance finalized.", `Finalize attendance for "${event.event_name}"? Check-in cannot be reopened with the current controls.`)}>Finalize attendance</button>}
      <hr />
      {event.status !== "cancelled" && <button className="event-danger" type="button" onClick={() => act("cancel", "Event cancelled.", `Cancel "${event.event_name}"? Check-in will close.`)}>Cancel event</button>}
      <button className="event-danger" type="button" onClick={() => act("archive", "Event archived.", `Archive "${event.event_name}"? It will leave the current list and can no longer be edited.`)}>Archive event</button>
    </div>
  </>;
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
  const actionInFlight = useRef(false);
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
    if (actionInFlight.current) return;
    actionInFlight.current = true;
    setBusyId(event.event_id);
    setActionError("");
    try {
      await eventAction(club.organization_id, event.event_id, action);
      setNotice(message);
      setAttempt(n => n + 1);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      actionInFlight.current = false;
      setBusyId(null);
    }
  }

  function statusLabel(e: CeoEvent) {
    if (e.archived_at) return "Archived";
    if (e.status === "cancelled") return "Cancelled";
    if (e.attendance_finalized_at) return "Attendance finalized";
    return e.check_in_open ? "Check-in open" : "Scheduled";
  }

  return <div className="events-page">
    <section className="events-card" aria-labelledby="events-heading">
      <div className="events-heading">
        <div><h2 id="events-heading">Club events</h2><p>{club.organization_name}</p></div>
        <div className="events-toolbar">
          <label className="events-archive-filter"><input type="checkbox" checked={showArchived} onChange={e => { setShowArchived(e.target.checked); setOffset(0); }} /> Show archived</label>
          <button ref={addButton} className="event-primary" type="button" disabled={adding || !!editing || !!busyId} aria-expanded={adding} onClick={() => { setEditing(null); setAdding(true); setNotice(""); }}><span aria-hidden="true">+</span> Create event</button>
        </div>
      </div>

      {(adding || editing) && <EventForm key={editing?.event_id ?? "new"} event={editing ?? undefined} organizationId={club.organization_id} onCancel={closeForm} onSaved={() => { const wasEditing = !!editing; closeForm(); setAttempt(n => n + 1); setNotice(wasEditing ? "Event updated." : "Event added."); }} />}
      {notice && <p className="event-notice event-success" role="status">{notice}</p>}
      {actionError && <p className="event-notice event-error" role="alert">{actionError}</p>}

      <div aria-busy={loading}>
        {loading ? <p className="event-empty" role="status">Loading events…</p>
          : current?.error ? <div className="event-empty"><p role="alert">{current.error}</p><button type="button" onClick={() => setAttempt(n => n + 1)}>Retry</button></div>
          : data && data.total === 0 ? <div className="event-empty"><div className="event-empty-icon" aria-hidden="true">▦</div><h3>No events yet</h3><p>Create your first event to get started.</p></div>
          : data && <>
            <div className="event-table-scroll" tabIndex={0} role="region" aria-label="Events table">
              <table>
                <thead><tr><th scope="col">Event</th><th scope="col">Date &amp; time</th><th scope="col">Type</th><th scope="col">Status</th><th scope="col" className="event-actions-cell"><span className="events-sr-only">Actions</span></th></tr></thead>
                <tbody>{data.items.map(e => {
                  return <tr key={e.event_id}>
                    <td className="event-name">{e.event_name}</td>
                    <td className="event-date"><time dateTime={e.starts_at}>{new Date(e.starts_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}<small>{new Date(e.starts_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" })}</small></time></td>
                    <td>{e.event_type ?? "—"}</td>
                    <td><span className={`event-badge ${e.archived_at ? "archived" : e.status === "cancelled" ? "cancelled" : e.attendance_finalized_at ? "finalized" : e.check_in_open ? "open" : "scheduled"}`}>{statusLabel(e)}</span></td>
                    <td className="event-actions-cell"><EventRowActions event={e} disabled={!!busyId || adding || !!editing}
                      onEdit={() => { setAdding(false); setEditing(e); setNotice(""); }}
                      onAction={(action, message) => { void run(e, action, message); }} /></td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
            <div className="event-pagination">
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
