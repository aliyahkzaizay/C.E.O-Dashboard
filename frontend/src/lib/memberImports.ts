import { getSupabase } from "./supabase";
import type { MemberInput } from "./members";

export type ImportMapping = Partial<Record<keyof MemberInput, string>>;
export type ImportIssue = { row: number | null; field: string | null; code: string; message: string; severity?: string };
export type ImportPreview = {
  headers: string[]; suggested_mapping: ImportMapping; mapping_issues: ImportIssue[];
  summary: { total: number; ready: number; skipped: number; failed: number };
  rows: { row_number: number; status: string; member: MemberInput | null; source_values: Partial<Record<keyof MemberInput, string>>; issues: ImportIssue[] }[];
  preview_limit: number; issues: ImportIssue[];
};
export type ImportResult = { summary: { created: number; skipped: number; failed: number }; interrupted: boolean; issues: ImportIssue[] };

/** Keep session lookup, multipart encoding, and HTTP errors out of the import screen. */
async function requestImport<T>(organizationId: string, file: File, mapping: ImportMapping | undefined, preview: boolean, signal: AbortSignal): Promise<T> {
  const { data, error } = await getSupabase().auth.getSession();
  if (error || !data.session) throw new Error("Please sign in again.");
  const body = new FormData();
  body.append("file", file);
  if (mapping) body.append("mapping", JSON.stringify(mapping));
  let response: Response;
  try {
    response = await fetch(`/api/organizations/${encodeURIComponent(organizationId)}/member-imports${preview ? "/preview" : ""}`, {
      method: "POST", headers: { Authorization: `Bearer ${data.session.access_token}` }, body, signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new Error(preview ? "Unable to preview the file. Please try again." : "Could not confirm the import. Refresh the roster and preview the file again before retrying.");
  }
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.error?.message ?? (typeof result?.detail === "string" ? result.detail : "Import request failed. Please try again."));
  if (!result?.summary) throw new Error(preview ? "Invalid preview response." : "Could not confirm the import. Refresh the roster and preview again.");
  return result as T;
}

/** Validate without saving; supplying no mapping asks the server to suggest one. */
export function previewMemberImport(organizationId: string, file: File, mapping: ImportMapping | undefined, signal: AbortSignal) {
  return requestImport<ImportPreview>(organizationId, file, mapping, true, signal);
}

/** Save after confirmation; never automatically retry a write. */
export function saveMemberImport(organizationId: string, file: File, mapping: ImportMapping, signal: AbortSignal) {
  return requestImport<ImportResult>(organizationId, file, mapping, false, signal);
}
