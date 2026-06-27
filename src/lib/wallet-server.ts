// src/lib/wallet-server.ts
// =====================================================================
// مساعدات المصادقة السيرفر للمحفظة — تُستخدم فقط داخل /api routes.
// ⚠️ بتستورد service-role client (يتخطّى RLS) — ممنوع تستوردها من client component.
// =====================================================================
import { createClient } from '@supabase/supabase-js'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import type { AuthedUser } from '@/lib/wallet'

export type { AuthedUser }

// التحقق من المستخدم عن طريق Bearer token ثم جلب دوره من profiles
export async function verifyUser(
  authHeader: string | null,
): Promise<{ ok: boolean; user?: AuthedUser; reason?: string }> {
  try {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { ok: false, reason: 'no_token' }
    }
    const token = authHeader.replace('Bearer ', '')
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data: { user } } = await sb.auth.getUser(token)
    if (!user) return { ok: false, reason: 'not_authenticated' }

    // @ts-ignore new schema not in generated types
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('role').eq('id', user.id).maybeSingle()

    return { ok: true, user: { id: user.id, role: (profile as { role?: string } | null)?.role ?? null } }
  } catch (e) {
    console.error('[wallet/verifyUser] error:', e)
    return { ok: false, reason: 'auth_error' }
  }
}

export async function verifyAdmin(
  authHeader: string | null,
): Promise<{ ok: boolean; user?: AuthedUser; reason?: string }> {
  const res = await verifyUser(authHeader)
  if (!res.ok) return res
  if (res.user?.role !== 'admin') return { ok: false, reason: 'not_admin' }
  return res
}
