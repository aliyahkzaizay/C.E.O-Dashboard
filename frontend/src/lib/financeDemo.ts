/** Synthetic preview records only; never used as a database fallback. Amounts are cents. */
export type FinanceRelation = { eventId: string; eventName?: string; relatedKind?: "meeting" | "other"; relatedLabel?: string };
export type FinanceTransaction = FinanceRelation & { id: string; date: string; description: string; category: string; kind: "income" | "expense"; cents: number; eventId: string };
export type PurchaseReport = FinanceRelation & { id: string; title: string; filename: string; date: string; uploader: string; eventId: string; notes: string };
export const demoEvents = [{ id: "workshop", name: "Workshop" }, { id: "welcome", name: "Welcome meeting" }];
export const demoTransactions: FinanceTransaction[] = [
 { id: "1", date: "2026-06-12", description: "Club supplies", category: "Supplies", kind: "expense", cents: 5000, eventId: "" },
 { id: "2", date: "2026-07-15", description: "Printing", category: "Other", kind: "expense", cents: 10000, eventId: "" },
 { id: "3", date: "2026-08-09", description: "Materials", category: "Supplies", kind: "expense", cents: 7500, eventId: "" },
 { id: "4", date: "2026-09-02", description: "Decorations", category: "Supplies", kind: "expense", cents: 6000, eventId: "welcome" },
 { id: "5", date: "2026-09-18", description: "Club registration", category: "Other", kind: "expense", cents: 16000, eventId: "" },
 { id: "6", date: "2026-10-20", description: "Food", category: "Food", kind: "expense", cents: 8500, eventId: "welcome" },
 { id: "7", date: "2026-11-08", description: "Art supplies", category: "Supplies", kind: "expense", cents: 12000, eventId: "workshop" },
 { id: "8", date: "2026-11-10", description: "Room rental", category: "Venue", kind: "expense", cents: 10000, eventId: "workshop" },
 { id: "9", date: "2026-09-01", description: "Fundraiser", category: "Fundraising", kind: "income", cents: 100000, eventId: "" },
 { id: "10", date: "2026-11-06", description: "Donations", category: "Donations", kind: "income", cents: 20000, eventId: "" },
];
export const demoReports: PurchaseReport[] = [{ id: "r1", title: "Workshop supplies", filename: "supplies.pdf", date: "2026-11-08", uploader: "Aliyah", eventId: "workshop", notes: "Sample report; no file attached." }];
/** Format exact preview cents as US dollars. Currency settings are not connected yet. */
export function money(cents: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100); }
export function eventName(id: string) { return demoEvents.find(event => event.id === id)?.name ?? "General club"; }

/** Display a named meeting or other association without treating it as a stored event. */
export function relationLabel(row: FinanceRelation) {
 return row.eventId ? (row.eventName || eventName(row.eventId)) : row.relatedLabel ? `${row.relatedKind === "meeting" ? "Meeting" : "Other"}: ${row.relatedLabel}` : "General club";
}
