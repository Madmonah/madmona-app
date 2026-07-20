// src/app/api/auth/otp/route.ts
// OTP عبر المارد (Baileys) بدل WhatsApp Cloud API الميت.
//
// منطق الداتابيز زي ما هو — نفس الـ RPCs:
//   madmona_request_otp(p_phone)  → { success, code, phone, known_name }
//   madmona_verify_otp(p_phone, p_code) → { success, ... }
//
// اللي اتغيّر: الإرسال بقى بـ sendText (المارد) بدل template على Cloud API.

import { NextRequest, NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { sendText, normalizePhone } from '@/lib/whatsapp'

export const runtime = 'nodejs'
export const maxDuration = 30

interface RequestOtpResult {
  success?: boolean
  code?: string
  phone?: string
  known_name?: string | null
  error?: string
}

export async function POST(request: NextRequest) {
  let body: { action?: string; phone?: string; code?: string; purpose?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'bad_json' }, { status: 400 })
  }

  const phone = normalizePhone(body.phone || '')
  if (!phone) {
    return NextResponse.json({ success: false, error: 'رقم الموبايل مش صح' }, { status: 400 })
  }

  // ── إرسال الكود ────────────────────────────────────────────────────────
  // الافتراضي = send، عشان يبقى متوافق مع النداءات القديمة اللي مابتبعتش action
  if (!body.action || body.action === 'send') {
    const { data, error } = await supabaseAdmin.rpc('madmona_request_otp', { p_phone: phone } as never)

    if (error) {
      console.error('[otp] rpc madmona_request_otp:', error.message)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    const otp = data as RequestOtpResult | null
    if (!otp?.success) {
      // الـ RPC نفسه رفض (rate limit / رقم محظور / ...) — نمرر رسالته زي ما هي
      return NextResponse.json(otp ?? { success: false, error: 'فشل توليد الكود' }, { status: 400 })
    }

    const name = otp.known_name ? ` ${otp.known_name}` : ''
    const sent = await sendText({
      to: otp.phone || phone,
      body:
        `أهلاً${name} 👋\n\n` +
        `كود الدخول بتاعك في مضمونة: *${otp.code}*\n` +
        `صالح ٥ دقايق.\n\n` +
        `لو مش انت اللي طلبته، تجاهل الرسالة دي.`,
      agentName: 'المارد',
    })

    if (!sent.ok) {
      console.error('[otp] send failed:', sent.error)
      return NextResponse.json(
        { success: false, error: 'فشل إرسال الكود على واتساب. حاول تاني بعد شوية.', detail: sent.error },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      phone: otp.phone ?? phone,
      known_name: otp.known_name ?? null,
    })
  }

  // ── التحقق من الكود ────────────────────────────────────────────────────
  if (body.action === 'verify') {
    const code = (body.code || '').trim()
    if (!/^\d{4,8}$/.test(code)) {
      return NextResponse.json({ success: false, error: 'الكود مش صح' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin.rpc('madmona_verify_otp', { p_phone: phone, p_code: code } as never)

    if (error) {
      console.error('[otp] rpc madmona_verify_otp:', error.message)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json(data ?? { success: false, error: 'فشل التحقق' })
  }

  return NextResponse.json({ success: false, error: 'action مش معروف' }, { status: 400 })
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'madmona otp via marid' })
}
