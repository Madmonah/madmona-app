import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Server-side admin client (service role)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

function normEgPhone(raw?: string): string | null {
  if (!raw) return null
  const p = String(raw).replace(/[^\d+]/g, '')
  if (p.startsWith('+20')) return p
  if (p.startsWith('20') && p.length === 12) return '+' + p
  if (p.startsWith('0') && p.length === 11) return '+2' + p
  if (p.startsWith('1') && p.length === 10) return '+20' + p
  return null
}

// =====================================================
// POST /api/auth/complete-phone
// Links a WhatsApp-verified phone to the currently logged-in
// (social-login) user. Headers: Authorization: Bearer <access_token>
// Body: { phone, code }
// Flow: validate session -> verify OTP -> ensure phone not taken
//       -> save phone on profile -> claim drafts by phone.
// =====================================================
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!token) {
      return NextResponse.json(
        { ok: false, error: 'no_session', message: 'لازم تكون داخل بحسابك' },
        { status: 401 }
      )
    }

    // Validate the session token -> resolve the user
    const { data: userData, error: userErr } = await supabase.auth.getUser(token)
    if (userErr || !userData?.user) {
      return NextResponse.json(
        { ok: false, error: 'invalid_session', message: 'الجلسة مش صالحة، سجّل دخول تاني' },
        { status: 401 }
      )
    }
    const userId = userData.user.id

    const body = await req.json()
    const phone = normEgPhone(body.phone)
    const code = String(body.code || '').trim()
    if (!phone) {
      return NextResponse.json(
        { ok: false, error: 'invalid_phone', message: 'رقم تليفون مش صحيح' },
        { status: 400 }
      )
    }
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { ok: false, error: 'invalid_code', message: 'الكود لازم يكون 6 أرقام' },
        { status: 400 }
      )
    }

    // 1) Verify the OTP via the same RPC the normal flow uses
    const { data: otpRes, error: otpErr } = await supabase.rpc('verify_phone_otp', {
      p_phone: phone,
      p_code: code,
      p_listing_id: null,
    })
    if (otpErr) {
      console.error('[auth/complete-phone] otp rpc error:', otpErr)
      return NextResponse.json(
        { ok: false, error: 'rpc_error', message: otpErr.message },
        { status: 500 }
      )
    }
    const r = otpRes as { ok: boolean; message?: string; attempts_left?: number }
    if (!r?.ok) {
      return NextResponse.json(r, { status: 400 })
    }

    // 2) Make sure this phone isn't already linked to ANOTHER account
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .neq('id', userId)
      .maybeSingle()
    if (existing) {
      return NextResponse.json(
        {
          ok: false,
          error: 'phone_taken',
          message: 'الرقم ده مربوط بحساب تاني. لو الحساب بتاعك، سجّل دخول بالرقم وكلمة السر.',
        },
        { status: 409 }
      )
    }

    // 3) Save the verified phone on the profile (replaces the oauth:<id> placeholder)
    const { error: updErr } = await supabase
      .from('profiles')
      .update({ phone })
      .eq('id', userId)
    if (updErr) {
      console.error('[auth/complete-phone] profile update error:', updErr)
      return NextResponse.json(
        { ok: false, error: 'update_failed', message: 'حصلت مشكلة وإحنا بنحفظ الرقم، حاول تاني' },
        { status: 500 }
      )
    }

    // Mirror to legacy users table if it exists (best-effort)
    try {
      await supabase.from('users').update({ phone_number: phone }).eq('id', userId)
    } catch {
      /* table may not exist — ignore */
    }

    // 4) Claim any listing drafts tied to this phone (same as signup)
    try {
      await fetch(new URL('/api/listing-drafts/claim-by-phone', req.url).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, profile_id: userId }),
      })
    } catch (e) {
      console.warn('[auth/complete-phone] claim-by-phone failed:', e)
    }

    return NextResponse.json({ ok: true, message: 'تم تأكيد رقمك ✅' })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown'
    console.error('[auth/complete-phone] exception:', e)
    return NextResponse.json(
      { ok: false, error: 'server_error', message: msg },
      { status: 500 }
    )
  }
}
