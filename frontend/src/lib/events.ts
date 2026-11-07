import { getSupabase } from "./supabase";

export type EventStatus = "scheduled" | "cancelled";
export type EventInput = { event_name: string; description: string | null; starts_at: string; event_type: string | null };
export type CeoEvent = EventInput & {
  event_id: string;
  organization_id: string;
  status: EventStatus;
  check_in_token: string;
  check_in_open: boolean;
  attendance_finalized_at: string | null;
  archived_at: string | null;
};
export type EventSettings = Pick<CeoEvent, "event_id" | "status" | "check_in_open" | "attendance_finalized_at" | "archived_at">;
export type EventPage = { items: CeoEvent[]; total: number; limit: number; offset: number };
export type EventAction = "open-checkin" | "close-checkin" | "cancel" | "archive" | "finalize-attendance";

/**
 * Send the current session token to Python; never retry a write automatically.
 * NOTE: the events router has no organization in the URL. It resolves the org
 * via get_officer_org_id, which reads the X-Org-Id header (currently a stub).
 */
async function request<T>(organizationId: string, options: RequestInit, path = ""): Promise<T> {
  const { data, error } = await getSupabase().auth.getSession();
  if (error || !data.session) throw new Error("Please sign in again.");
  const writing = options.method === "POST" || options.method === "PATCH";
  let response: Response;
  try {
    response = await fetch(`/api/events${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.session.access_token}`,
        "X-Org-Id": organizationId,
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new Error(writing ? "Couldn't confirm the change was saved. Refresh events before trying again." : "Unable to load events. Please try again.");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(typeof body?.detail === "string" ? body.detail : response.status === 422 ? "Please check the event fields and try again." : writing ? "Couldn't confirm the change was saved. Refresh events before trying again." : "Unable to load events. Please try again.");
  }
  if (!body) throw new Error("Invalid events response. Please try again.");
  return body as T;
}

export function listEvents(organizationId: string, offset: number, signal: AbortSignal, includeArchived = false, limit = 20) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset), include_archived: String(includeArchived) });
  return request<EventPage>(organizationId, { signal }, `?${params}`);
}
export function createEvent(organizationId: string, event: EventInput) {
  return request<CeoEvent>(organizationId, { method: "POST", body: JSON.stringify(event) });
}
/** Send only changed fields. event_name and starts_at cannot be null. */
export function updateEvent(organizationId: string, eventId: string, changes: Partial<EventInput>) {
  return request<CeoEvent>(organizationId, { method: "PATCH", body: JSON.stringify(changes) }, `/${encodeURIComponent(eventId)}`);
}
export function eventAction(organizationId: string, eventId: string, action: EventAction) {
  return request<EventSettings>(organizationId, { method: "POST" }, `/${encodeURIComponent(eventId)}/${action}`);
}
