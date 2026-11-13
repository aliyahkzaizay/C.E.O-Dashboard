import { getSupabase } from "./supabase";

export type FinanceSettings = { openingCents: number; startDate: string; budget: { cents: number; startDate: string; endDate: string } | null };
export type FinanceRelation = { eventId: string; eventName?: string; relatedKind?: "meeting" | "other"; relatedLabel?: string };
export type FinanceTransaction = FinanceRelation & { id: string; date: string; description: string; category: string; kind: "income" | "expense"; cents: number; voidedAt?: string | null; voidReason?: string | null };
export type PurchaseReport = FinanceRelation & { id: string; title: string; filename: string; date: string; uploader: string; notes: string };
type SettingsRecord = { opening_balance_cents: number; tracking_start_date: string; budget_cents: number | null; budget_start_date: string | null; budget_end_date: string | null };
type TransactionRecord = { transaction_id: string; transaction_date: string; description: string; category: string; kind: "income" | "expense"; amount_cents: number; event_id: string | null; related_kind: "meeting" | "other" | null; related_label: string | null; voided_at: string | null; void_reason: string | null };
type ReportRecord = { report_id: string; title: string; filename: string; created_at: string; uploaded_by: string; uploaded_by_name?: string | null; event_id: string | null; notes: string | null };

/** Use the officer session for every request. Never automatically retry financial writes. */
async function request<T>(organizationId: string, path: string, options: RequestInit = {}): Promise<T> {
 const { data, error } = await getSupabase().auth.getSession();
 if (error || !data.session) throw new Error("Please sign in again.");
 const writing = !!options.method && options.method !== "GET";
 let response: Response;
 try {
  response = await fetch(`/api/finance${path}`, { ...options, cache: "no-store", headers: {
   Authorization: `Bearer ${data.session.access_token}`, "X-Org-Id": organizationId,
   ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
  } });
 } catch (error) {
  if (error instanceof DOMException && error.name === "AbortError") throw error;
  throw new Error(writing ? "Could not confirm the change. Refresh Finance before trying again." : "Unable to load finances. Please try again.");
 }
 if (response.ok && response.status === 204) return undefined as T;
 const body = await response.json().catch(() => undefined);
 if (!response.ok) throw new Error(typeof body?.detail === "string" ? body.detail : typeof body?.detail?.message === "string" ? body.detail.message : response.status === 422 ? "Please check the fields and try again." : "Unable to complete the request. Refresh Finance before trying again.");
 if (body === undefined) throw new Error("Unexpected finance response. Refresh Finance before trying again.");
 return body as T;
}
function settingsFromRecord(row: SettingsRecord): FinanceSettings {
 return { openingCents: row.opening_balance_cents, startDate: row.tracking_start_date, budget: row.budget_cents !== null && row.budget_start_date && row.budget_end_date ? { cents: row.budget_cents, startDate: row.budget_start_date, endDate: row.budget_end_date } : null };
}
function transactionFromRecord(row: TransactionRecord): FinanceTransaction {
 return { id: row.transaction_id, date: row.transaction_date, description: row.description, category: row.category, kind: row.kind, cents: row.amount_cents, eventId: row.event_id ?? "", relatedKind: row.related_kind ?? undefined, relatedLabel: row.related_label ?? undefined, voidedAt: row.voided_at, voidReason: row.void_reason };
}
function reportFromRecord(row: ReportRecord): PurchaseReport {
 return { id: row.report_id, title: row.title, filename: row.filename, date: new Date(row.created_at).toLocaleDateString(), uploader: row.uploaded_by_name?.trim() || "Name unavailable", eventId: row.event_id ?? "", notes: row.notes ?? "" };
}
/** Load all pages before calculating totals; a failed page never produces a partial balance. */
async function allRecords<T>(org: string, path: string, signal: AbortSignal): Promise<T[]> {
 const rows: T[] = [];
 while (!signal.aborted) {
  const page = await request<{ items: T[]; total: number }>(org, `${path}?limit=100&offset=${rows.length}`, { signal });
  if (!Array.isArray(page.items) || !Number.isInteger(page.total)) throw new Error("Invalid finance list response.");
  rows.push(...page.items);
  if (rows.length >= page.total) return rows;
  if (!page.items.length) throw new Error("Finance records changed while loading. Please refresh.");
 }
 throw new DOMException("Aborted", "AbortError");
}
/** Retrieve settings and complete record lists for one authorized club. */
export async function loadFinance(org: string, signal: AbortSignal) {
 const [settings, transactions, reports] = await Promise.all([
  request<SettingsRecord | null>(org, "/settings", { signal }),
  allRecords<TransactionRecord>(org, "/transactions", signal),
  allRecords<ReportRecord>(org, "/reports", signal),
 ]);
 return { settings: settings ? settingsFromRecord(settings) : null, transactions: transactions.map(transactionFromRecord), reports: reports.map(reportFromRecord) };
}
/** Persist the opening balance and optional budget. */
export async function saveFinanceSettings(org: string, settings: FinanceSettings) {
 return settingsFromRecord(await request<SettingsRecord>(org, "/settings", { method: "PUT", body: JSON.stringify({ opening_balance_cents: settings.openingCents, tracking_start_date: settings.startDate, budget_cents: settings.budget?.cents ?? null, budget_start_date: settings.budget?.startDate ?? null, budget_end_date: settings.budget?.endDate ?? null }) }));
}
/** Save one income or expense using integer cents. */
export async function createTransaction(org: string, row: FinanceTransaction) {
 return transactionFromRecord(await request<TransactionRecord>(org, "/transactions", { method: "POST", body: JSON.stringify({ kind: row.kind, amount_cents: row.cents, transaction_date: row.date, description: row.description, category: row.category, event_id: row.eventId || null, related_kind: row.relatedKind ?? null, related_label: row.relatedLabel ?? null }) }));
}
/** Upload the actual document with optional same-club event metadata. */
export async function uploadReport(org: string, row: PurchaseReport, file: File) {
 const body = new FormData();
 body.set("file", file); body.set("title", row.title);
 if (row.eventId) body.set("event_id", row.eventId);
 if (row.notes) body.set("notes", row.notes);
 return reportFromRecord(await request<ReportRecord>(org, "/reports", { method: "POST", body }));
}
/** Obtain a short-lived link; files stay in the private bucket. */
export function downloadReport(org: string, id: string) { return request<{ url: string; expires_in: number }>(org, `/reports/${encodeURIComponent(id)}/download`); }
/** Delete the file and metadata. The server requires owner access. */
export function deleteReport(org: string, id: string) { return request<void>(org, `/reports/${encodeURIComponent(id)}`, { method: "DELETE" }); }
/** Format stored cents in the currently supported currency. */
export function money(cents: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100); }
/** Explain optional event or general-club associations. */
export function relationLabel(row: FinanceRelation) { return row.eventId ? row.eventName || "Linked event" : row.relatedLabel ? `${row.relatedKind === "meeting" ? "Meeting" : "Other"}: ${row.relatedLabel}` : "General club"; }
/** Use the local calendar date rather than a UTC date near midnight. */
export function today() { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`; }

/** Load report metadata for an event using the same club-scoped API as Finance. */
export async function listEventReports(org: string, eventId: string, signal: AbortSignal) {
 const rows = await allRecords<ReportRecord>(org, "/reports", signal);
 return rows.filter(row=>row.event_id === eventId).map(reportFromRecord);
}

/** Shared labels for new income and expense entries. Older labels remain intact. */
export const financeCategories = ["General Club", "Donations", "General Body Meeting", "Event", "Fundraiser"] as const;
