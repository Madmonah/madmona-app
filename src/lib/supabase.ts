import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// Server-side admin client (for API routes and server components only)
// IMPORTANT: Never expose this to the client - uses service role key
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

// Client-side client (for components - uses anon key + RLS)
// Returns a typed client so all .from('table') calls have proper TypeScript types
export const createSupabaseClient = () =>
  createClient<Database>(
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

// Helper function to get session (client-side)
export async function getSession() {
  const supabaseClient = createSupabaseClient()
  const { data: { session } } = await supabaseClient.auth.getSession()
  return session
}

// Helper function to get user profile (uses admin client - server-side only)
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }

  return data
}
