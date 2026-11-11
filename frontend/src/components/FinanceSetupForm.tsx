import { useState, type FormEvent } from "react";
export type FinanceSettings = { openingCents: number; startDate: string; budget: { cents: number; startDate: string; endDate: string } | null };
/** Collect owner-only preview settings; this form does not persist financial data. */
export default function FinanceSetupForm({ settings, onSave, onCancel }: { settings: FinanceSettings | null; onSave: (settings: FinanceSettings) => void; onCancel: () => void }) {
 const [withBudget, setWithBudget] = useState(!!settings?.budget);
 const [error, setError] = useState("");
 function submit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault(); const data = new FormData(event.currentTarget);
  const openingCents = Math.round(Number(data.get("opening"))*100);
  const startDate = String(data.get("start"));
  if (!Number.isSafeInteger(openingCents) || !startDate) { setError("Enter a valid opening balance and start date."); return; }
  let budget: FinanceSettings["budget"] = null;
  if (withBudget) {
   const cents = Math.round(Number(data.get("budget"))*100), start = String(data.get("budgetStart")), end = String(data.get("budgetEnd"));
   if (!Number.isSafeInteger(cents) || cents<=0 || !start || !end || end<start) { setError("Enter a positive budget and an end date on or after its start date."); return; }
   budget = { cents, startDate: start, endDate: end };
  }
  onSave({openingCents,startDate,budget});
 }
 return <section className="finance-panel finance-form" aria-labelledby="finance-setup-title"><div className="finance-heading"><h2 id="finance-setup-title">Set up finances · preview</h2><button type="button" className="finance-close" aria-label="Close form" onClick={onCancel}><span aria-hidden="true">×</span></button></div><p>Enter the balance before transactions on your tracking start date. Settings reset when you leave Finance.</p><form onSubmit={submit}>
 <div className="finance-fields"><label>Opening balance (USD)<input name="opening" type="number" step="0.01" min="-9999999" max="9999999" required autoFocus defaultValue={settings ? settings.openingCents/100 : ""} /></label><label>Tracking start date<input name="start" type="date" required defaultValue={settings?.startDate ?? "2026-06-01"} /></label></div>
 <label className="finance-budget-toggle"><input type="checkbox" checked={withBudget} onChange={event=>setWithBudget(event.target.checked)} />Add a spending budget</label>
 {withBudget && <div className="finance-fields"><label>Spending budget (USD)<input name="budget" type="number" min="0.01" max="9999999" step="0.01" required defaultValue={settings?.budget ? settings.budget.cents/100 : ""} /></label><label>Budget start date<input name="budgetStart" type="date" required defaultValue={settings?.budget?.startDate ?? "2026-06-01"} /></label><label>Budget end date<input name="budgetEnd" type="date" required defaultValue={settings?.budget?.endDate ?? "2026-11-30"} /></label></div>}
 <p>A budget is a spending limit; it does not add money to your balance. Demo transactions cover June–November 2026.</p>
 {error && <p role="alert">{error}</p>}<div className="finance-actions"><button type="button" onClick={onCancel}>Cancel</button><button type="submit" className="finance-primary">Apply to preview</button></div></form></section>;
}
