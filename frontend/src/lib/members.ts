import { getSupabase } from "./supabase";

export type ClassYear = "first_year" | "sophomore" | "junior" | "senior" | "graduate" | "other";
export type MemberInput = { name: string; email: string | null; external_member_id: string | null; date_joined: string | null; class_year: ClassYear | null };
export type Member = MemberInput & { member_id: string; organization_id: string; created_at: string; updated_at: string; archived_at: string | null };
export type MemberPage = { items: Member[]; total: number; limit: number; offset: number };

/** Send the current session token to Python; never retry a creation automatically. */
async function request<T>(organizationId: string, options: RequestInit, query = ""): Promise<T> {
  const { data, error } = await getSupabase().auth.getSession();
  if (error || !data.session) throw new Error("Please sign in again.");
  const creating = options.method === "POST";
  let response: Response;
  try {
    response = await fetch(`/api/organizations/${encodeURIComponent(organizationId)}/members${query}`, {
      ...options,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new Error(creating ? "Couldn't confirm the member was saved. Refresh the roster before trying again." : "Unable to load members. Please try again.");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(typeof body?.detail === "string" ? body.detail : response.status === 422 ? "Please check the member fields and try again." : creating ? "Couldn't confirm the member was saved. Refresh the roster before trying again." : "Unable to load members. Please try again.");
  }
  if (!body) throw new Error(creating ? "Couldn't confirm the member was saved. Refresh the roster before trying again." : "Invalid roster response. Please try again.");
  return body as T;
}

export function listMembers(organizationId: string, offset: number, signal: AbortSignal) {
  return request<MemberPage>(organizationId, { signal }, `?limit=40&offset=${offset}`);
}
export function createMember(organizationId: string, member: MemberInput) {
  return request<Member>(organizationId, { method: "POST", body: JSON.stringify(member) });
}
