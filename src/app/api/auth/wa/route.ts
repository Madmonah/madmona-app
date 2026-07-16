import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { normalizePhone, phoneToEmail } from '@/lib/auth-helpers'

// =====================================================================
// 🔑 الدخول بالواتساب — «ابعت الكود للمارد» (عكس الـOTP)
// ليه معكوس؟ التمبلتس مبلوكة من ميتا (131042) فمفيش كود بيوصل للعميل.
// هنا العميل هو اللي بيبعت — والوارد شغال دايماً، ورقمه بيتأكد من
// مصدر الرسالة نفسها (مفيش حد يقدر يبعت من رقم غيره).
//
// POST { action: 'start' }            → { code, wa_url }
// GET  ?code=MADxxxxx                 → { verified, expired }
// POST { action: 'finish', code }     → { token_hash, email }  → verifyOtp في المتصفح
// POST { action: 'magic', token }     → { token_hash, email, next } (لينكات المارد /l/)
//
// الويبهوك (whatsapp-webhook) بيأكّد الأكواد أصلاً — صيغة MADxxxxx
// بتاعة wa_inbound_verifications نفسها. صفر تعديل مطلوب هناك للدخول.
// =====================================================================

export const dynamic = 'force-dynamic'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

const MARID_WA = '201002229982'
// من غير حروف/أرقام لبس (0/O · 1/I/L) — العميل ممكن يكتبه بإيده
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function genCode(): string {
  const a = new Uint32Array(5)
  crypto.getRandomValues(a)
  return 'MAD' + Array.from(a, (n) => ALPHABET[n % ALPHABET.length]).join('')
}

/** رقم واتساب (2010xxxxxxxx) → Supabase session عبر magiclink hash.
 *  بيلاقي المستخدم أو يعمله، ويضمن صف profiles برقمه. */
async function mintSession(rawPhone: string) {
  const sb = admin()
  const normalized = normalizePhone(rawPhone)
  if (!normalized) throw new Error('bad_phone')
  const email = phoneToEmail(normalized)
  const local = '0' + normalized.slice(3) // +2010... → 010...

  // اعمل المستخدم لو مش موجود (لو موجود بيرجع email_exists وده تمام)
  const { data: created, error: createErr } = await sb.auth.admin.createUser({
    email, email_confirm: true, user_metadata: { phone: local, via: 'whatsapp' },
  })
  let userId = created?.user?.id
  if (createErr && !/already|exists/i.test(createErr.message)) throw createErr

  const { data: linkData, error: linkErr } = await sb.auth.admin.generateLink({
    type: 'magiclink', email,
  })
  if (linkErr || !linkData?.properties?.hashed_token) throw (linkErr || new Error('no_token_hash'))
  userId = userId || linkData.user?.id

  // profiles: كمّل الرقم لو ناقص من غير ما تلمس اسم/دور موجودين
  if (userId) {
    const { data: prof } = await sb.from('profiles').select('id, phone').eq('id', userId).maybeSingle()
    if (!prof) {
      await sb.from('profiles').insert({ id: userId, phone: local, role: 'customer' } as never)
    } else if (!prof.phone) {
      await sb.from('profiles').update({ phone: local } as never).eq('id', userId)
    }
  }

  return { token_hash: linkData.properties.hashed_token, email }
}

// ---------------------------------------------------------------- GET (poll)
export async function GET(req: NextRequest) {
  const code = (req.nextUrl.searchParams.get('code') || '').toUpperCase()
  if (!/^MAD[A-Z0-9]{5}$/.test(code)) {
    return NextResponse.json({ error: 'bad_code' }, { status: 400 })
  }
  const { data } = await admin()
    .from('wa_inbound_verifications')
    .select('verified, expires_at, session_minted_at')
    .eq('code', code)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data) return NextResponse.json({ verified: false, expired: true })
  return NextResponse.json({
    verified: !!data.verified && !data.session_minted_at,
    expired: new Date(data.expires_at) < new Date(),
  })
}

// ---------------------------------------------------------------- POST
export async function POST(req: NextRequest) {
  let body: Record<string, string>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }
  const sb = admin()

  // ---- start: ولّد كود يبعته العميل للمارد
  if (body.action === 'start') {
    const code = genCode()
    const { error } = await sb.from('wa_inbound_verifications').insert({
      code, purpose: 'app_login', expected_phone: null,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    } as never)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const text = encodeURIComponent(code)
    return NextResponse.json({
      code,
      wa_url: `https://wa.me/${MARID_WA}?text=${text}`,
    })
  }

  // ---- finish: الكود اتأكد من الويبهوك → سيشن
  if (body.action === 'finish') {
    const code = (body.code || '').toUpperCase()
    const { data: row } = await sb
      .from('wa_inbound_verifications')
      .select('id, verified, verified_phone, expires_at, session_minted_at')
      .eq('code', code)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!row?.verified || !row.verified_phone) {
      return NextResponse.json({ error: 'not_verified' }, { status: 400 })
    }
    if (row.session_minted_at) {
      return NextResponse.json({ error: 'already_used' }, { status: 400 })
    }
    if (new Date(row.expires_at) < new Date()) {
      return NextResponse.json({ error: 'expired' }, { status: 400 })
    }
    try {
      const minted = await mintSession(row.verified_phone)
      await sb.from('wa_inbound_verifications')
        .update({ session_minted_at: new Date().toISOString() } as never)
        .eq('id', row.id)
      return NextResponse.json(minted)
    } catch (e) {
      console.error('[wa-auth] mint error:', e)
      return NextResponse.json({ error: 'mint_failed' }, { status: 500 })
    }
  }

  // ---- magic: لينك المارد المُغلّف /l/<token>
  if (body.action === 'magic') {
    const token = body.token || ''
    if (!/^[0-9a-f-]{36}$/.test(token)) {
      return NextResponse.json({ error: 'bad_token' }, { status: 400 })
    }
    const { data: row } = await sb
      .from('wa_login_tokens')
      .select('token, phone, next_path, expires_at, use_count, max_uses')
      .eq('token', token)
      .maybeSingle()
    if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    if (new Date(row.expires_at) < new Date() || row.use_count >= row.max_uses) {
      // اللينك خلص — نوصله لوجهته برضه بس من غير دخول (أحسن من صفحة خطأ)
      return NextResponse.json({ error: 'expired', next: row.next_path }, { status: 410 })
    }
    try {
      const minted = await mintSession(row.phone)
      await sb.from('wa_login_tokens')
        .update({ use_count: row.use_count + 1 } as never)
        .eq('token', token)
      return NextResponse.json({ ...minted, next: row.next_path || '/' })
    } catch (e) {
      console.error('[wa-auth] magic mint error:', e)
      return NextResponse.json({ error: 'mint_failed', next: row.next_path }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 })
}
