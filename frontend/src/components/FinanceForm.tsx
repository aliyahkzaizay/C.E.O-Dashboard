import type { CeoEvent } from "../lib/events";
import { useState, type FormEvent } from "react";
import { financeCategories, today, type FinanceRelation, type FinanceTransaction, type PurchaseReport } from "../lib/finance";
type Props = { events: CeoEvent[]; eventsLoading: boolean; eventsError: string; onRetryEvents: () => void; mode: "income" | "expense" | "report"; onTransaction: (row: FinanceTransaction) => Promise<void>; onReport: (row: PurchaseReport, file: File) => Promise<void>; onCancel: () => void };
/** Validate input and await persistence before closing the form. */
export default function FinanceForm({ events, eventsLoading, eventsError, onRetryEvents, mode, onTransaction, onReport, onCancel }: Props) {
 const [eventId, setEventId] = useState("");
 const [error, setError] = useState("");
 const [saving, setSaving] = useState(false);
 async function submit(e: FormEvent<HTMLFormElement>) {
  e.preventDefault(); if (saving) return; const data = new FormData(e.currentTarget); const title = String(data.get("description") ?? "").trim();
  if (!title) { setError("Enter a description or report title."); return; }
  let relation: FinanceRelation = { eventId: "" };
  if (eventId) {
   const selectedEvent = events.find(event => event.event_id === eventId);
   if (eventsLoading || eventsError || !selectedEvent) { setError("Select an event."); return; }
   relation = { eventId, eventName: selectedEvent.event_name };
  }
  const id = crypto.randomUUID();
  setError(""); setSaving(true);
  try {
  if (mode === "report") {
   const file = data.get("file");
   if (!(file instanceof File) || !file.size || !/\.(pdf|jpe?g|png)$/i.test(file.name) || file.size > 10*1024*1024) { setError("Choose a PDF, JPG, or PNG up to 10 MB."); return; }
   await onReport({ id, title, filename: file.name, date: new Date().toLocaleDateString("en-CA"), uploader: "Club officer", ...relation, notes: String(data.get("notes") ?? "").trim() }, file);
  } else {
   const cents = Math.round(Number(data.get("amount"))*100);
   if (!Number.isSafeInteger(cents) || cents <= 0 || cents > 999999999) { setError("Enter a valid positive amount."); return; }
   await onTransaction({ id, description: title, cents, date: String(data.get("date")), category: String(data.get("category")), kind: mode, ...relation });
  }
  } catch (error) { setError(error instanceof Error ? error.message : "Unable to save. Please refresh Finance."); } finally { setSaving(false); }
 }
 return <section className="finance-panel finance-form" aria-labelledby="finance-form-title"><div className="finance-heading"><h2 id="finance-form-title">{mode === "report" ? "Upload purchase report" : `Add ${mode}`}</h2><button type="button" className="finance-close" aria-label="Close form" disabled={saving} onClick={onCancel}><span aria-hidden="true">×</span></button></div><form onSubmit={submit}><fieldset disabled={saving} style={{border:0,padding:0,margin:0,minWidth:0}}>
 <label>{mode === "report" ? "Report title" : "Description"}<input name="description" required maxLength={200} autoFocus /></label>
 {mode === "report" ? <><label>File · PDF, JPG or PNG<input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png" required /></label></> : <div className="finance-fields"><label>Amount (USD)<input name="amount" type="number" min="0.01" max="9999999" step="0.01" required /></label><label>Date<input name="date" type="date" defaultValue={today()} required /></label><label>Category<select name="category">{financeCategories.map(value=><option key={value}>{value}</option>)}</select></label></div>}
 <div><label>Related event · optional<select disabled={eventsLoading || !!eventsError || !events.length} value={eventId} onChange={e=>setEventId(e.target.value)}><option value="">None</option>{events.map(event=><option key={event.event_id} value={event.event_id}>{event.event_name} · {new Date(event.starts_at).toLocaleDateString()}{event.status === "cancelled" ? " (cancelled)" : ""}</option>)}</select></label>
 {eventsLoading ? <p role="status">Loading club events…</p> : eventsError ? <div><p role="alert">{eventsError}</p><button type="button" onClick={onRetryEvents}>Retry events</button></div> : !events.length ? <p>No events yet. Create one in Events, then return here.</p> : null}</div>


 {mode === "report" ? <><label>Notes · optional<textarea name="notes" rows={2} maxLength={1000} /></label><p>Reports do not change the balance. Files are private to club officers.</p></> : null}
 {error && <p role="alert">{error}</p>}<div className="finance-actions"><button type="button" disabled={saving} onClick={onCancel}>Cancel</button><button className="finance-primary" type="submit" disabled={!!eventId && (eventsLoading || !!eventsError || !events.length)}>{saving ? "Saving…" : "Save"}</button></div></fieldset></form></section>;
}
