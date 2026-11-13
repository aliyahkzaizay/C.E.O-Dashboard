import { listEvents, type CeoEvent } from "../lib/events";
import { useEffect, useState } from "react";
import type { Club } from "../hooks/useClubs";
import ReportActions from "../components/ReportActions";
import FinanceTrend from "../components/FinanceTrend";
import FinanceForm from "../components/FinanceForm";
import FinanceSetupForm, { type FinanceSettings } from "../components/FinanceSetupForm";
import { financeCategories, loadFinance, saveFinanceSettings, createTransaction, uploadReport, downloadReport, deleteReport as removeReport, money, relationLabel, type PurchaseReport, type FinanceTransaction } from "../lib/finance";
import "./Finance.css";
/** Load persisted club finances; only confirmed responses update the visible records. */
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
     const page = await listEvents(club.organization_id, offset, controller.signal, true, 100);
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
 const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
 const [reports, setReports] = useState<PurchaseReport[]>([]);
 const [form, setForm] = useState<"income" | "expense" | "report" | null>(null);
 const [report, setReport] = useState<PurchaseReport | null>(null);
 const [query, setQuery] = useState("");
 const [kind, setKind] = useState("");
 const [category, setCategory] = useState("");
 const [fromDate, setFromDate] = useState("");
 const [toDate, setToDate] = useState("");
 const [notice, setNotice] = useState("");
 const [loadState, setLoadState] = useState<{key:string; error:string} | null>(null);
 const [attempt, setAttempt] = useState(0);
 const [busy, setBusy] = useState(false);
 const [actionError, setActionError] = useState("");
 const key = `${club.organization_id}:${attempt}`;
 useEffect(()=>{
  const controller = new AbortController();
  void loadFinance(club.organization_id,controller.signal).then(data=>{
   if (controller.signal.aborted) return;
   setSettings(data.settings); setTransactions(data.transactions); setReports(data.reports);
   setLoadState({key,error:""});
  }).catch(error=>{if (!controller.signal.aborted) setLoadState({key,error:error instanceof Error ? error.message : "Unable to load finances."});});
  return ()=>controller.abort();
 },[club.organization_id,key]);
 useEffect(()=>{
  if(!notice)return;
  const timer=window.setTimeout(()=>setNotice(""),4500);
  return ()=>window.clearTimeout(timer);
 },[notice]);
 function refresh() { setForm(null); setSetupOpen(false); setReport(null); setActionError(""); setNotice(""); setAttempt(n=>n+1); }
 const withEvent = <T extends {eventId:string}>(row:T) => ({...row,eventName:clubEvents.find(event=>event.event_id===row.eventId)?.event_name});
 const activeTransactions = transactions.filter(row=>!row.voidedAt).map(withEvent);
 const tracked = settings ? activeTransactions.filter(row=>row.date>=settings.startDate) : activeTransactions;
 const budget = settings?.budget;
 const budgetSpent = budget ? activeTransactions.filter(row=>row.kind === "expense" && row.date>=budget.startDate && row.date<=budget.endDate).reduce((sum,row)=>sum+row.cents,0) : 0;
 const income = tracked.filter(row=>row.kind === "income").reduce((sum,row)=>sum+row.cents,0);
 const expenses = tracked.filter(row=>row.kind === "expense").reduce((sum,row)=>sum+row.cents,0);
 const clubNet = tracked.reduce((sum,row)=>sum+(row.kind === "income" ? row.cents : -row.cents),0);
 const displayedReports = reports.map(withEvent);
 const filtered = transactions.map(withEvent).filter(row=>(category === "legacy" ? !financeCategories.some(value=>value===row.category) : !category || row.category===category) && (!fromDate || row.date>=fromDate) && (!toDate || row.date<=toDate) && (!kind || row.kind===kind) && row.description.toLowerCase().includes(query.toLowerCase())).toSorted((a,b)=>b.date.localeCompare(a.date));
 const invalidDateRange = !!fromDate && !!toDate && fromDate>toDate;
 const hasLegacyCategories = transactions.some(row=>!financeCategories.some(value=>value===row.category));
 const canEdit = club.access_role === "owner" || club.can_edit_finances === true;
 const canDelete = club.access_role === "owner";
 async function deleteReport(target: PurchaseReport) {
  if (!canDelete || busy) return;
  if (!window.confirm(`Delete "${target.title}" and its file? This does not change any transactions.`)) return;
  setBusy(true); setActionError(""); setNotice("");
  try {
   await removeReport(club.organization_id,target.id);
   setReports(rows=>rows.filter(row=>row.id!==target.id));
   setReport(current=>current?.id===target.id ? null : current);
   setNotice("Report deleted.");
  } catch (error) { setActionError(error instanceof Error ? error.message : "Unable to delete report."); }
  finally { setBusy(false); }
 }
 async function getDocument(target: PurchaseReport) {
  if (busy) return;
  setBusy(true); setActionError("");
  try {
   const result = await downloadReport(club.organization_id,target.id);
   const response = await fetch(result.url,{cache:"no-store",credentials:"omit"});
   if (!response.ok) throw new Error("Unable to download this document. Its upload may be incomplete.");
   const url = URL.createObjectURL(await response.blob());
   const link = document.createElement("a"); link.href=url; link.download=target.filename;
   document.body.append(link); link.click(); link.remove();
   window.setTimeout(()=>URL.revokeObjectURL(url),60000);
  } catch (error) { setActionError(error instanceof Error ? error.message : "Unable to download report."); }
  finally { setBusy(false); }
 }
 function open(mode: "income" | "expense" | "report") { setSetupOpen(false); setForm(mode); setReport(null); setNotice(""); }
 if (loadState?.key !== key) return <p role="status">Loading finances…</p>;
 if (loadState.error) return <section className="finance-panel"><p role="alert">{loadState.error}</p><button type="button" onClick={refresh}>Retry finances</button></section>;
 return <div className="finance-page"><div className="finance-heading"><div><p>{club.organization_name}</p></div><div className="finance-actions">{canEdit && <><button type="button" onClick={()=>{setSetupOpen(true);setForm(null);setNotice("");}}>{settings ? "Finance settings" : "Set up finances"}</button><button type="button" disabled={!settings} onClick={()=>open("income")}>+ Income</button><button className="finance-primary" type="button" disabled={!settings} onClick={()=>open("expense")}>+ Expense</button></>}</div></div>

 {!canEdit && <p>You can view finances and upload reports. Finance editing requires permission.</p>}
 {setupOpen && canEdit && <FinanceSetupForm settings={settings} onCancel={()=>setSetupOpen(false)} onSave={async next=>{const saved=await saveFinanceSettings(club.organization_id,next);setSettings(saved);setSetupOpen(false);setNotice("Finance settings saved.");}} />}
 <div className="finance-metrics"><section className="finance-panel"><h2>Club balance</h2><strong>{settings ? money(settings.openingCents+clubNet) : "—"}</strong><p>{settings ? `Opening balance ${money(settings.openingCents)} · tracking from ${settings.startDate}` : canEdit ? "Set an opening balance to get started." : "Waiting for the owner to set up finances."}</p></section>{[["Total income",income],["Total expenses",expenses]].map(([label,value])=><section className="finance-panel" key={label}><h2>{label}</h2><strong>{money(Number(value))}</strong><p>{settings ? `Since ${settings.startDate}` : "All recorded transactions"}</p></section>)}</div>
 {budget && <section className="finance-panel"><div className="finance-heading"><div><h2>Club spending budget</h2><p>{budget.startDate} – {budget.endDate}</p></div><strong>{money(budgetSpent)} / {money(budget.cents)}</strong></div><progress className="finance-budget-progress" aria-label="Budget used" max={budget.cents} value={Math.min(budgetSpent,budget.cents)} /><p>{budgetSpent>budget.cents ? `${money(budgetSpent-budget.cents)} over budget` : `${money(budget.cents-budgetSpent)} remaining`}</p></section>}
 {notice && <p role="status" className="finance-notice">{notice}</p>}
 {actionError && <p role="alert">{actionError}</p>}
 {form && <FinanceForm key={form} mode={form} events={clubEvents.filter(event=>!event.archived_at)} eventsLoading={!currentEvents} eventsError={currentEvents?.error ?? ""} onRetryEvents={()=>setEventAttempt(n=>n+1)} onCancel={()=>setForm(null)} onTransaction={async row=>{const saved=await createTransaction(club.organization_id,row);setTransactions(rows=>[...rows,saved]);setForm(null);setNotice("Transaction saved.");}} onReport={async (row,file)=>{const saved=await uploadReport(club.organization_id,row,file);setReports(rows=>[saved,...rows]);setForm(null);setNotice("Report uploaded.");}} />}
 <FinanceTrend transactions={activeTransactions} />
 <section className="finance-panel"><div className="finance-heading"><div><h2>Purchase reports</h2><p>Receipts and supporting documents</p></div><button type="button" className="finance-primary" onClick={()=>open("report")}>+ Upload report</button></div><div className="finance-table-wrap"><table><thead><tr><th>Report</th><th>Related event</th><th>Uploaded by</th><th><span className="finance-sr">Actions</span></th></tr></thead><tbody>{displayedReports.map(row=><tr key={row.id}><td><button type="button" className="finance-report-title" aria-label={`View ${row.title}`} onClick={()=>setReport(row)}>{row.title}</button><small>{row.filename} · {row.date}</small></td><td>{row.eventId ? relationLabel(row) : "—"}</td><td>{row.uploader}</td><td>{canDelete && <ReportActions title={row.title} disabled={busy} onDelete={()=>void deleteReport(row)} />}</td></tr>)}</tbody></table></div>{!displayedReports.length && <p role="status">No purchase reports yet.</p>}
 {report && <div className="finance-report-detail"><div className="finance-heading"><h3>{report.title}</h3><button type="button" className="finance-close" aria-label="Close report details" onClick={()=>setReport(null)}><span aria-hidden="true">×</span></button></div><p>{report.notes || "No notes"}</p><p>{report.filename}</p><button type="button" disabled={busy} onClick={()=>void getDocument(report)}>{busy ? "Please wait…" : "Download"}</button></div>}</section>
 <section className="finance-panel"><div className="finance-heading"><h2>Transactions</h2><span className="finance-result-count" role="status">{filtered.length} {filtered.length===1 ? "transaction" : "transactions"}</span></div><div className="finance-filters"><label>Category<select value={category} onChange={event=>setCategory(event.target.value)}><option value="">All categories</option>{financeCategories.map(value=><option key={value}>{value}</option>)}{hasLegacyCategories && <option value="legacy">Other previous categories</option>}</select></label><label>Search<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search descriptions…" /></label><label>Income / Expense<select value={kind} onChange={e=>setKind(e.target.value)}><option value="">All types</option><option value="income">Income</option><option value="expense">Expenses</option></select></label><label>From<input type="date" value={fromDate} max={toDate || undefined} onChange={event=>setFromDate(event.target.value)} /></label><label>To<input type="date" value={toDate} min={fromDate || undefined} onChange={event=>setToDate(event.target.value)} /></label><button type="button" disabled={!category && !kind && !query && !fromDate && !toDate} onClick={()=>{setCategory("");setKind("");setQuery("");setFromDate("");setToDate("");}}>Clear filters</button></div>{invalidDateRange && <p role="alert">Choose an end date on or after the start date.</p>}{currentEvents?.error && <p role="alert">{currentEvents.error} <button type="button" onClick={()=>setEventAttempt(n=>n+1)}>Retry events</button></p>}<div className="finance-table-wrap"><table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Related to</th><th>Amount</th></tr></thead><tbody>{filtered.map(row=><tr key={row.id}><td>{row.date}</td><td>{row.description}{row.voidedAt && <small>Voided · {row.voidReason}</small>}</td><td><span className="finance-category-label">{row.category}</span></td><td>{relationLabel(row)}</td><td style={row.voidedAt ? {textDecoration:"line-through"} : undefined} className={row.kind === "income" ? "finance-income" : ""}>{row.kind === "income" ? "+" : "−"}{money(row.cents)}</td></tr>)}</tbody></table></div>{!filtered.length && <p role="status">No transactions match your filters.</p>}</section></div>;
}
