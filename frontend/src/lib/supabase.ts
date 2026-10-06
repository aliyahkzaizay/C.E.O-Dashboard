import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

function validateConfig(): string | null {
  if (!url || !key || url.includes('your-project-ref') || key === 'your-publishable-key') {
    return 'Add your Supabase project URL and publishable key to .env.local, then restart the dev server.'
  }
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))) {
      return 'Use an HTTPS Supabase project URL (HTTP is allowed for local development).'
    }
  } catch {
    return 'VITE_SUPABASE_URL must be a valid project URL.'
  }
  if (!key.startsWith('sb_publishable_')) {
    return 'Use a Supabase publishable key beginning with sb_publishable_. Never use a secret or service-role key in React.'
  }
  return null
}

export const supabaseConfigError = validateConfig()

// One shared browser client. Configuration is not proof of network connectivity.
export const supabase = supabaseConfigError ? null : createClient(url!, key!)

export function getSupabase() {
  if (!supabase) throw new Error(supabaseConfigError ?? 'Supabase is not configured.')
  return supabase
}
