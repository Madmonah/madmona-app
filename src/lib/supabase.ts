import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// ============================================================
// Server-side admin client (used only inside API routes)
// IMPORTANT: This uses the SERVICE_ROLE_KEY which bypasses RLS.
// Never import this from a client component.
// ============================================================
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
)
