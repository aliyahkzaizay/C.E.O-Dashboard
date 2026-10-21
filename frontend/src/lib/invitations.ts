const pendingKey = "ceo.pendingInvitation";

/** Extracts a secret from a copied link or token without visiting the URL. */
export function invitationToken(value: string): string {
  const trimmed = value.trim();
  if (/^[0-9a-f]{64}$/.test(trimmed)) return trimmed;
  try {
    const token = new URLSearchParams(new URL(trimmed).hash.slice(1)).get("invite") ?? "";
    return /^[0-9a-f]{64}$/.test(token) ? token : "";
  } catch { return ""; }
}

/** Restores an invitation in this tab so signing in does not discard it. */
export function readPendingInvitation(): string {
  const fromUrl = invitationToken(window.location.href);
  if (fromUrl) return fromUrl;
  try { return invitationToken(sessionStorage.getItem(pendingKey) ?? ""); }
  catch { return ""; }
}

/** Stores only in this tab; does not log the secret or send it to analytics. */
export function rememberInvitation(token: string) {
  try {
    if (token) sessionStorage.setItem(pendingKey, token);
    else sessionStorage.removeItem(pendingKey);
  } catch { /* The link can still be pasted if browser storage is unavailable. */ }
}

export function clearInvitationFromUrl() {
  if (new URLSearchParams(window.location.hash.slice(1)).has("invite")) {
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }
}

export function invitationLink(token: string): string {
  const url = new URL(import.meta.env.BASE_URL, window.location.origin);
  url.hash = new URLSearchParams({ invite: token }).toString();
  return url.toString();
}

export function requestError(error: unknown): string {
  return error && typeof error === "object" && "message" in error
    ? String(error.message) : "Something went wrong. Please try again.";
}
