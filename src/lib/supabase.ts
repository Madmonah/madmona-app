import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// Module-level singleton — TypeScript preserves the full generic types
// when the client is declared at module level (vs. returned from a function).
// This is the key to making `from('users').insert({...})` type-check correctly.

// Browser/anon client (subject to RLS — safe to use in client components)
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

// Admin client (bypasses RLS — server-side only, never expose to client)
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

// Backward-compatible factory — returns the singleton.
// Existing code that calls createSupabaseClient() keeps working,
// but now gets full type safety because the singleton's types are preserved.
export const createSupabaseClient = () => supabaseBrowser

// Helper: get current session
export async function getSession() {
  const { data: { session } } = await supabaseBrowser.auth.getSession()
  return session
}

// Helper: get user profile (admin client — server-side only)
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
