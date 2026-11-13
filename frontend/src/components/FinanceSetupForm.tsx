import { useState, type FormEvent } from "react";
import { today, type FinanceSettings } from "../lib/finance";
export type { FinanceSettings } from "../lib/finance";
/** Collect opening balance and budget, awaiting the authorized save operation. */
export default function FinanceSetupForm({ settings, onSave, onCancel }: { settings: FinanceSettings | null; onSave: (settings: FinanceSettings) => Promise<void>; onCancel: () => void }) {
 const [withBudget, setWithBudget] = useState(!!settings?.budget);
 const [error, setError] = useState("");
 const [saving, setSaving] = useState(false);
 async function submit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault(); if (saving) return; const data = new FormData(event.currentTarget);
  const openingCents = Math.round(Number(data.get("opening"))*100);
  const startDate = String(data.get("start"));
  if (!Number.isSafeInteger(openingCents) || !startDate) { setError("Enter a valid opening balance and start date."); return; }
  let budget: FinanceSettings["budget"] = null;
  if (withBudget) {
   const cents = Math.round(Number(data.get("budget"))*100), start = String(data.get("budgetStart")), end = String(data.get("budgetEnd"));
   if (!Number.isSafeInteger(cents) || cents<=0 || !start || !end || end<start) { setError("Enter a positive budget and an end date on or after its start date."); return; }
   budget = { cents, startDate: start, endDate: end };
  }
  setSaving(true); setError("");
  try { await onSave({openingCents,startDate,budget}); }
  catch (error) { setError(error instanceof Error ? error.message : "Unable to save settings."); }
  finally { setSaving(false); }
 }
 return <section className="finance-panel finance-form" aria-labelledby="finance-setup-title"><div className="finance-heading"><h2 id="finance-setup-title">Finance settings</h2><button type="button" className="finance-close" aria-label="Close form" disabled={saving} onClick={onCancel}><span aria-hidden="true">×</span></button></div><p>Enter the balance before transactions on your tracking start date.</p><form onSubmit={submit}><fieldset disabled={saving} style={{border:0,padding:0,margin:0,minWidth:0}}>
 <div className="finance-fields"><label>Opening balance (USD)<input name="opening" type="number" step="0.01" min="-9999999" max="9999999" required autoFocus defaultValue={settings ? settings.openingCents/100 : ""} /></label><label>Tracking start date<input name="start" type="date" required defaultValue={settings?.startDate ?? today()} /></label></div>
 <label className="finance-budget-toggle"><input type="checkbox" checked={withBudget} onChange={event=>setWithBudget(event.target.checked)} />Add a spending budget</label>
 {withBudget && <div className="finance-fields"><label>Spending budget (USD)<input name="budget" type="number" min="0.01" max="9999999" step="0.01" required defaultValue={settings?.budget ? settings.budget.cents/100 : ""} /></label><label>Budget start date<input name="budgetStart" type="date" required defaultValue={settings?.budget?.startDate ?? today()} /></label><label>Budget end date<input name="budgetEnd" type="date" required defaultValue={settings?.budget?.endDate ?? today()} /></label></div>}
 <p>A budget is a spending limit; it does not add money to your balance.</p>
 {error && <p role="alert">{error}</p>}<div className="finance-actions"><button type="button" disabled={saving} onClick={onCancel}>Cancel</button><button type="submit" className="finance-primary">{saving ? "Saving…" : "Save"}</button></div></fieldset></form></section>;
}
