import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// ============================================================
// Browser-side Supabase client (uses ANON key, respects RLS)
// Use this in client components for user-authenticated queries.
// Sessions are persisted in localStorage automatically.
// ============================================================
export const supabaseBrowser = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)
