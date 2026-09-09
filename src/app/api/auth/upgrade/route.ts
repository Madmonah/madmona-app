// src/app/api/auth/upgrade/route.ts
// =====================================================================
// 🚪🚪 (٩/٩/٢٠٢٦) ترقية جلسة التوكن → جلسة Supabase (الباب التاني) بدون خروج
//
// محمد: «حساب محمد على مضمونة مش ظاهر بالشكل الصح ولا تاب شغلي ظاهر عنده
// صح… ولما بيعمل تسجيل دخول أنا مش عارف بيسجل دخول إزاي لحد دلوقتي!؟»
//
// الجذر (من الداتا مش تخمين): تليفون محمد عبدالجابر ماسك madmona_token صالح
// (آخر جلسة ٩/٩ ١٢:٥٦) بينما auth.users.last_sign_in_at بتاعه من ٢٩/٧ —
// يعني كل دخلاته فتحت **باب واحد**، و«شغلي» (get_my_work_home → auth.uid())
// وكل شاشات RLS بتشوفه «مش داخل». إصلاح /login (token_hash) بيصلّح الدخلات
// **الجاية** بس؛ الجهاز اللي داخل خلاص محتاج طريق يترقّى بيه من غير ما يطلع.
//
// المنطق: توكن صالح = هوية الرقم مثبتة (واتساب أو باسورد) → نفس الرقم →
// مستخدم Supabase (موظف الأول، وإلا أي حساب بنفس الرقم) → magiclink
// token_hash → الواجهة تعمل verifyOtp. مفيش حساب بيتعمل هنا — لو مفيش
// مستخدم بالرقم بنرجّع found:false والواجهة تكمّل بالتوكن زي قبل.
// =====================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimitOk, clientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: NextRequest) {
  const db = admin()
  if (!(await rateLimitOk(db, `auth-upgrade:${clientIp(req)}`, 20, 60))) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 })
  }
  let token = ''
  try { const b = await req.json(); token = typeof b?.token === 'string' ? b.token.trim() : '' } catch { /* */ }
  if (!UUID_RE.test(token)) return NextResponse.json({ ok: false, error: 'bad_token' }, { status: 400 })

  const { data: who } = await (db.rpc as unknown as (
    fn: string, args: Record<string, unknown>,
  ) => Promise<{ data: { authenticated?: boolean; phone?: string } | null }>)('madmona_resolve', { p_token: token })
  if (!who?.authenticated || !who.phone) {
    return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 401 })
  }

  const { data: found } = await (db.rpc as unknown as (
    fn: string, args: Record<string, unknown>,
  ) => Promise<{ data: { found?: boolean; email?: string; via?: string } | null }>)(
    'auth_user_for_account_phone', { p_phone: who.phone },
  )
  if (!found?.found || !found.email) {
    return NextResponse.json({ ok: true, found: false })
  }
  const { data: link, error } = await db.auth.admin.generateLink({ type: 'magiclink', email: found.email })
  if (error || !link?.properties?.hashed_token) {
    console.error('[auth/upgrade] generateLink failed:', error?.message)
    return NextResponse.json({ ok: false, error: 'link_failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, found: true, via: found.via || null, token_hash: link.properties.hashed_token })
}
