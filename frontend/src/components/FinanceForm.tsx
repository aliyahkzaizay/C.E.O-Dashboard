import { useState, type FormEvent } from "react";
import { demoEvents, money, relationLabel, type FinanceRelation, type FinanceTransaction, type PurchaseReport } from "../lib/financeDemo";
type Props = { mode: "income" | "expense" | "report"; transactions: FinanceTransaction[]; onTransaction: (row: FinanceTransaction) => void; onReport: (row: PurchaseReport) => void; onCancel: () => void };
/** Preview form only: validates entries locally and never uploads files or sends writes. */
export default function FinanceForm({ mode, transactions, onTransaction, onReport, onCancel }: Props) {
 const [expenseId, setExpenseId] = useState("");
 const [eventId, setEventId] = useState("");
 const [relatedTo, setRelatedTo] = useState<"" | "meeting" | "event" | "other">("");
 const [relatedLabel, setRelatedLabel] = useState("");
 const [error, setError] = useState("");
 const expense = transactions.find(row => row.id === expenseId);
 function submit(e: FormEvent<HTMLFormElement>) {
  e.preventDefault(); const data = new FormData(e.currentTarget); const title = String(data.get("description") ?? "").trim();
  if (!title) { setError("Enter a description or report title."); return; }
  let relation: FinanceRelation = { eventId: "" };
  if (expense) relation = { eventId: expense.eventId, relatedKind: expense.relatedKind, relatedLabel: expense.relatedLabel };
  else if (relatedTo === "event") {
   if (!demoEvents.some(event => event.id === eventId)) { setError("Select an event."); return; }
   relation = { eventId };
  } else if (relatedTo === "meeting" || relatedTo === "other") {
   if (!relatedLabel.trim()) { setError(relatedTo === "meeting" ? "Enter a meeting name." : "Enter what this relates to."); return; }
   relation = { eventId: "", relatedKind: relatedTo, relatedLabel: relatedLabel.trim() };
  }
  const id = crypto.randomUUID();
  if (mode === "report") {
   const file = data.get("file");
   if (!(file instanceof File) || !file.size || !/\.(pdf|jpe?g|png)$/i.test(file.name) || file.size > 10*1024*1024) { setError("Choose a PDF, JPG, or PNG up to 10 MB for this preview."); return; }
   onReport({ id, title, filename: file.name, date: new Date().toLocaleDateString("en-CA"), uploader: "You (preview)", ...relation, expenseId, notes: String(data.get("notes") ?? "").trim() });
  } else {
   const cents = Math.round(Number(data.get("amount"))*100);
   if (!Number.isSafeInteger(cents) || cents <= 0) { setError("Enter a valid positive amount."); return; }
   onTransaction({ id, description: title, cents, date: String(data.get("date")), category: String(data.get("category")), kind: mode, ...relation });
  }
 }
 return <section className="finance-panel finance-form" aria-labelledby="finance-form-title"><div className="finance-heading"><h2 id="finance-form-title">{mode === "report" ? "Upload purchase report" : `Add ${mode}`} · preview</h2><button type="button" className="finance-close" aria-label="Close form" onClick={onCancel}><span aria-hidden="true">×</span></button></div><p>Nothing is saved or uploaded. Preview entries reset when you leave Finance.</p><form onSubmit={submit}>
 <label>{mode === "report" ? "Report title" : "Description"}<input name="description" required maxLength={200} autoFocus /></label>
 {mode === "report" ? <><label>File · PDF, JPG or PNG<input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png" required /></label><label>Related expense · optional<select value={expenseId} onChange={e=>setExpenseId(e.target.value)}><option value="">No expense linked</option>{transactions.filter(row=>row.kind === "expense").map(row=><option key={row.id} value={row.id}>{row.description} · {money(row.cents)}</option>)}</select></label></> : <div className="finance-fields"><label>Amount (USD)<input name="amount" type="number" min="0.01" max="9999999" step="0.01" required /></label><label>Date<input name="date" type="date" min="2026-06-01" max="2026-11-30" defaultValue="2026-11-10" required /></label><label>Category<select name="category">{(mode === "income" ? ["Donations", "Fundraising", "Dues", "Other"] : ["Supplies", "Food", "Venue", "Travel", "Other"]).map(value=><option key={value}>{value}</option>)}</select></label></div>}
 {expense ? <div><label>Related to<input readOnly value={relationLabel(expense)} /></label><p>Uses the linked expense’s association.</p></div> : <>
 <label>Related to · optional<select value={relatedTo} onChange={e=>{setRelatedTo(e.target.value as typeof relatedTo);setEventId("");setRelatedLabel("");setError("");}}><option value="">None</option><option value="meeting">General club meeting</option><option value="event">Event</option><option value="other">Other</option></select></label>
 {relatedTo === "event" && <label>Event<select required value={eventId} onChange={e=>setEventId(e.target.value)}><option value="">Select an event</option>{demoEvents.map(event=><option key={event.id} value={event.id}>{event.name}</option>)}</select></label>}
 {(relatedTo === "meeting" || relatedTo === "other") && <label>{relatedTo === "meeting" ? "Meeting name" : "What is this related to?"}<input required maxLength={200} value={relatedLabel} onChange={e=>setRelatedLabel(e.target.value)} placeholder={relatedTo === "meeting" ? "e.g. November general meeting" : "e.g. Club equipment"} /></label>}
 </>}
 {mode === "report" ? <><label>Notes · optional<textarea name="notes" rows={2} maxLength={1000} /></label><p>Reports do not change the balance. Only the selected filename is kept in this preview.</p></> : <p>Demo dates are limited to June–November 2026 to match the chart.</p>}
 {error && <p role="alert">{error}</p>}<div className="finance-actions"><button type="button" onClick={onCancel}>Cancel</button><button className="finance-primary" type="submit">Add to preview</button></div></form></section>;
}
