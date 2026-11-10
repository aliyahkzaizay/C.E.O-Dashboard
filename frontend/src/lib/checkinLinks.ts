// The only place the public check-in URL is built.
// Confirm the path format with Teammate 3 before finalizing.
export function buildCheckInUrl(token: string): string {
  const base = import.meta.env.VITE_PUBLIC_APP_URL ?? window.location.origin
  return `${base}/check-in/${encodeURIComponent(token)}`
}