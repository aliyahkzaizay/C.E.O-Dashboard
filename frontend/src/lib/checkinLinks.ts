// The only place the public check-in URL is built.
// Confirm the path format with Teammate 3 before finalizing.
export function buildCheckInUrl(token: string): string {
  const base = import.meta.env.VITE_PUBLIC_APP_URL ?? window.location.origin
  return `${base}/check-in/${encodeURIComponent(token)}`
}

export type Reachability = 'this-device' | 'same-network' | 'public'

/** Best-effort guess of who can open a link. localhost only works on the computer that made it. */
export function urlReachability(url: string): Reachability {
  let host: string
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    return 'this-device'
  }
  if (host === 'localhost' || host.endsWith('.localhost') || host === '[::1]' || host === '0.0.0.0' || /^127\./.test(host)) {
    return 'this-device'
  }
  if (/^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host) || host.endsWith('.local')) {
    return 'same-network'
  }
  return 'public'
}