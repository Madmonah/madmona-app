import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

type UserRow = Database['public']['Tables']['users']['Row']
type UserInsert = Database['public']['Tables']['users']['Insert']

// Module-level singletons — TypeScript preserves the full generic types
// when the client is declared at module level (vs. returned from a function).

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
export const createSupabaseClient = () => supabaseBrowser

// ============================================================
// Typed helpers — wrap raw .from() calls so call sites stay clean.
// The @ts-ignore is isolated here because supabase-js v2 generic
// types don't survive certain module-boundary scenarios.
// When we migrate to @supabase/ssr we can remove these directives.
// ============================================================

/** Find a user by their phone number (E.164 format). Returns null if not found. */
export async function findUserByPhone(phone: string): Promise<UserRow | null> {
  // @ts-ignore - Database generic preserved at runtime; types lost in inference
  const { data } = await supabaseBrowser
    .from('users')
    .select('*')
    .eq('phone_number', phone)
    .maybeSingle()
  return (data as UserRow | null) ?? null
}

/** Create a new user row. Used right after first-time OTP verification. */
export async function insertUser(user: UserInsert) {
  // @ts-ignore - Database generic preserved at runtime; types lost in inference
  return await supabaseBrowser.from('users').insert(user)
}

// ============================================================
// Auth & profile helpers
// ============================================================

export async function getSession() {
  const { data: { session } } = await supabaseBrowser.auth.getSession()
  return session
}

export async function getUserProfile(userId: string): Promise<UserRow | null> {
  // @ts-ignore - admin client; same generic-loss issue
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }

  return (data as UserRow | null) ?? null
}
