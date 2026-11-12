import { listEvents, type CeoEvent } from "../lib/events";
import { useEffect, useState } from "react";
import type { Club } from "../hooks/useClubs";
import FinanceTrend from "../components/FinanceTrend";
import FinanceForm from "../components/FinanceForm";
import FinanceSetupForm, { type FinanceSettings } from "../components/FinanceSetupForm";
import { demoTransactions, demoReports, demoEvents, money, relationLabel, type PurchaseReport } from "../lib/financeDemo";
import "./Finance.css";
/** Frontend-only finance preview. All entries are synthetic and reset on unmount. */
export default function Finance({ club }: { club: Club }) {
 const [eventAttempt, setEventAttempt] = useState(0);
 const [eventResult, setEventResult] = useState<{ key: string; items: CeoEvent[]; error: string } | null>(null);
 const eventKey = `${club.organization_id}:${eventAttempt}`;
 const currentEvents = eventResult?.key === eventKey ? eventResult : null;
 const clubEvents = currentEvents?.items ?? [];
 // Load every page; abort and ignore stale responses when switching clubs or retrying.
 useEffect(() => {
  const controller = new AbortController();
  async function loadEvents() {
   try {
    const items: CeoEvent[] = [];
    let offset = 0;
    while (!controller.signal.aborted) {
     const page = await listEvents(club.organization_id, offset, controller.signal, false, 100);
     items.push(...page.items);
     offset += page.items.length;
     if (offset >= page.total) break;
     if (!page.items.length) throw new Error("The event list changed. Please retry.");
    }
    if (!controller.signal.aborted) setEventResult({ key: eventKey, items, error: "" });
   } catch (error) {
    if (!controller.signal.aborted) setEventResult({ key: eventKey, items: [], error: error instanceof Error ? error.message : "Unable to load events." });
   }
  }
  void loadEvents();
  return () => controller.abort();
 }, [club.organization_id, eventKey]);
 const [settings, setSettings] = useState<FinanceSettings | null>(null);
 const [setupOpen, setSetupOpen] = useState(false);
 const [transactions, setTransactions] = useState(demoTransactions);
 const [reports, setReports] = useState(demoReports);
 const [form, setForm] = useState<"income" | "expense" | "report" | null>(null);
 const [report, setReport] = useState<PurchaseReport | null>(null);
 const [query, setQuery] = useState("");
 const [kind, setKind] = useState("");
 const [event, setEvent] = useState("");
 const [notice, setNotice] = useState("");
 const tracked = settings ? transactions.filter(row=>row.date>=settings.startDate) : transactions;
 const budget = settings?.budget;
 const budgetSpent = budget ? transactions.filter(row=>row.kind === "expense" && row.date>=budget.startDate && row.date<=budget.endDate).reduce((sum,row)=>sum+row.cents,0) : 0;
 const income = tracked.filter(row=>row.kind === "income").reduce((sum,row)=>sum+row.cents,0);
 const expenses = tracked.filter(row=>row.kind === "expense").reduce((sum,row)=>sum+row.cents,0);
 const filtered = transactions.filter(row=>(!kind || row.kind===kind) && (!event || row.eventId===event) && row.description.toLowerCase().includes(query.toLowerCase())).toSorted((a,b)=>b.date.localeCompare(a.date));
 // Owner-only preview controls until explicit officer finance permissions are connected.
 const canEdit = club.access_role === "owner";
 /** Remove preview metadata only. Treasurer permission awaits a stored officer position. */
 function deleteReport(target: PurchaseReport) {
  if (!canEdit) return;
  if (!window.confirm(`Delete "${target.title}" from the report preview? This does not change any transactions.`)) return;
  setReports(rows => rows.filter(row => row.id !== target.id));
  setReport(current => current?.id === target.id ? null : current);
  setNotice("Report removed from this preview only — no stored file was deleted.");
 }
 function open(mode: "income" | "expense" | "report") { setSetupOpen(false); setForm(mode); setReport(null); setNotice(""); }
 return <div className="finance-page"><div className="finance-heading"><div><p>{club.organization_name}</p><span className="finance-demo">Demo data · not connected to club finances</span></div><div className="finance-actions">{canEdit && <><button type="button" onClick={()=>{setSetupOpen(true);setForm(null);setNotice("");}}>{settings ? "Finance settings" : "Set up finances"}</button><button type="button" onClick={()=>open("income")}>+ Income</button><button className="finance-primary" type="button" onClick={()=>open("expense")}>+ Expense</button></>}</div></div>
 <p className="finance-disclaimer">Frontend preview only. No transactions or files are saved. All sample amounts are USD.</p>
 {!canEdit && <p>View-only transaction preview. Officer finance-editing permissions will be connected with the backend.</p>}
 {setupOpen && canEdit && <FinanceSetupForm settings={settings} onCancel={()=>setSetupOpen(false)} onSave={next=>{setSettings(next);setSetupOpen(false);setNotice("Finance settings applied to preview only — not saved.");}} />}
 <div className="finance-metrics"><section className="finance-panel"><h2>Current balance</h2><strong>{settings ? money(settings.openingCents+income-expenses) : "—"}</strong><p>{settings ? `Opening balance ${money(settings.openingCents)} · tracking from ${settings.startDate}` : canEdit ? "Set an opening balance to get started." : "Waiting for the owner to set up finances."}</p></section>{[["Total income",income],["Total expenses",expenses]].map(([label,value])=><section className="finance-panel" key={label}><h2>{label}</h2><strong>{money(Number(value))}</strong><p>{settings ? `Since ${settings.startDate}` : "All preview transactions"}</p></section>)}</div>
 {budget && <section className="finance-panel"><div className="finance-heading"><div><h2>Spending budget</h2><p>{budget.startDate} – {budget.endDate}</p></div><strong>{money(budgetSpent)} / {money(budget.cents)}</strong></div><progress className="finance-budget-progress" aria-label="Budget used" max={budget.cents} value={Math.min(budgetSpent,budget.cents)} /><p>{budgetSpent>budget.cents ? `${money(budgetSpent-budget.cents)} over budget` : `${money(budget.cents-budgetSpent)} remaining`}</p></section>}
 {notice && <p role="status" className="finance-notice">{notice}</p>}
 {form && <FinanceForm key={form} mode={form} events={clubEvents} eventsLoading={!currentEvents} eventsError={currentEvents?.error ?? ""} onRetryEvents={()=>setEventAttempt(n=>n+1)} onCancel={()=>setForm(null)} onTransaction={row=>{setTransactions(rows=>[...rows,row]);setForm(null);setNotice("Added to this preview only — not saved.");}} onReport={row=>{setReports(rows=>[row,...rows]);setForm(null);setNotice("Report details added to preview only — no file uploaded.");}} />}
 <FinanceTrend transactions={transactions} />
 <section className="finance-panel"><div className="finance-heading"><div><h2>Purchase reports</h2><p>Receipts and supporting documents</p></div><button type="button" className="finance-primary" onClick={()=>open("report")}>+ Upload report</button></div><div className="finance-table-wrap"><table><thead><tr><th>Report</th><th>Related event</th><th>Uploaded by</th><th><span className="finance-sr">Actions</span></th></tr></thead><tbody>{reports.map(row=><tr key={row.id}><td><b>{row.title}</b><small>{row.filename} · {row.date}</small></td><td>{row.eventId ? relationLabel(row) : "—"}</td><td>{row.uploader}</td><td><button type="button" aria-label={`View ${row.title}`} onClick={()=>setReport(row)}>View</button>{canEdit && <button type="button" aria-label={`Delete ${row.title}`} onClick={()=>deleteReport(row)}>Delete</button>}</td></tr>)}</tbody></table></div>{!reports.length && <p role="status">No purchase reports yet.</p>}
 {report && <div className="finance-report-detail"><div className="finance-heading"><h3>{report.title}</h3><button type="button" className="finance-close" aria-label="Close report details" onClick={()=>setReport(null)}><span aria-hidden="true">×</span></button></div><p>{report.notes || "No notes"}</p><p>{report.filename} · Preview metadata only. No document is stored or available to download.</p></div>}</section>
 <section className="finance-panel"><h2>Transactions</h2><div className="finance-filters"><label>Search<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search descriptions…" /></label><label>Type<select value={kind} onChange={e=>setKind(e.target.value)}><option value="">All types</option><option value="income">Income</option><option value="expense">Expenses</option></select></label><label>Event<select value={event} onChange={e=>setEvent(e.target.value)}><option value="">All events</option>{demoEvents.map(item=><option key={item.id} value={item.id}>{item.name} (sample)</option>)}{clubEvents.map(item=><option key={item.event_id} value={item.event_id}>{item.event_name}</option>)}</select></label></div><div className="finance-table-wrap"><table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Related to</th><th>Amount</th></tr></thead><tbody>{filtered.map(row=><tr key={row.id}><td>{row.date}</td><td>{row.description}</td><td>{row.category}</td><td>{relationLabel(row)}</td><td className={row.kind === "income" ? "finance-income" : ""}>{row.kind === "income" ? "+" : "−"}{money(row.cents)}</td></tr>)}</tbody></table></div>{!filtered.length && <p role="status">No transactions match your filters.</p>}</section></div>;
}
