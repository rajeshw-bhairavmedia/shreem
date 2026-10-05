import { createClient } from '@supabase/supabase-js'
import { env } from './http.js'

/** Server-only client with the service role key (bypasses row-level security). */
export const adminDb = () =>
  createClient(process.env.SUPABASE_URL || env('VITE_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
