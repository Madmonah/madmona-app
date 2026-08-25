// ============================================================================
// financeRpc — نداء RPC مباشر لشاشات لوحة business-finance
// ============================================================================
// (٢٥ أغسطس ٢٠٢٦) ليه مش supabase-js؟ المكتبة بتاخد قفل navigator.locks
// قبل أي نداء عشان تجيب الجلسة — ولو تاب PWA قديم مات ماسك القفل، كل
// نداءاتها بتعلّق للأبد من غير خطأ (ده اللي حصل مع محمد في صفحة الجدول:
// السيرفر بيرد في ثانية والشاشة «مش راضية تتحمّل»).
//
// وليه p_token؟ اللوحة ليها نظامين دخول: جلسة Supabase (موظفي مضمونة)
// **وتوكن واتساب** madmona_token (محمد وأصحاب البيزنس — من غير جلسة
// Supabase خالص). كل نداء بيبعت التوكن، والدوال بتقبل النظامين عن طريق
// schedule_access_ok / schedule_edit_ok.
//
// أي شاشة جديدة جوّه اللوحة تستخدم الدالة دي — متعملش عميل جديد.
// ============================================================================
import { safeStorage } from '@/lib/safe-storage'

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function sessionBearer(): string {
  try {
    const ref = new URL(SUPA_URL).hostname.split('.')[0]
    const raw = safeStorage.get(`sb-${ref}-auth-token`)
    if (raw) {
      const j = JSON.parse(raw)
      const at = j?.access_token || j?.currentSession?.access_token
      if (typeof at === 'string' && at.length > 20) return at
    }
  } catch { /* جلسة بايظة = المفتاح العام، وp_token هو الهوية */ }
  return ANON_KEY
}

export type RpcResult = { data: any; error: { message: string } | null }

export async function financeRpc(fn: string, args?: Record<string, unknown>): Promise<RpcResult> {
  const token = typeof window !== 'undefined' ? safeStorage.get('madmona_token') : null
  const body = JSON.stringify({ ...(args || {}), p_token: token || null })
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 15000)
  const post = (bearer: string) => fetch(`${SUPA_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
    body, signal: ctrl.signal,
  })
  try {
    let res = await post(sessionBearer())
    // جلسة متخزنة بس منتهية → إعادة بالمفتاح العام (p_token لسه موجود)
    if (res.status === 401) res = await post(ANON_KEY)
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      return { data: null, error: { message: (data && (data.message || data.error)) || `خطأ من السيرفر (${res.status})` } }
    }
    return { data, error: null }
  } catch (e: any) {
    return {
      data: null,
      error: { message: e?.name === 'AbortError' ? 'النداء اتأخر ١٥ ثانية — الشبكة بطيئة أو مقطوعة' : (e?.message || 'خطأ في الشبكة') },
    }
  } finally {
    clearTimeout(timer)
  }
}
