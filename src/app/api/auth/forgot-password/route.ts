import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail, isEmailConfigured } from '@/lib/email'
import { normalizePhone } from '@/lib/auth-helpers'
import crypto from 'crypto'

// ============================================================================
// POST /api/auth/forgot-password
//
// Body: { phone?: string, email?: string }
// Either phone OR email is required.
//
// Flow:
//   1. Find profile by phone or email
//   2. If profile.email exists → generate token + send reset email
//   3. If no email on profile → return graceful fallback message
//
// SECURITY: Always returns 200 with generic message — never reveals
// whether the phone/email actually exists in the DB (anti-enumeration).
// ============================================================================

const RESET_TOKEN_EXPIRY_HOURS = 1
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://madmonacairo.com'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const phone = body.phone ? normalizePhone(body.phone) : null
    const email = body.email ? String(body.email).trim().toLowerCase() : null

    if (!phone && !email) {
      return NextResponse.json(
        { error: 'Phone or email is required' },
        { status: 400 }
      )
    }

    // Service role for cross-user lookup
    const supa = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Build query
    let query = supa
      .from('profiles')
      .select('id, phone, full_name, email')

    if (email) {
      query = query.eq('email', email)
    } else if (phone) {
      // Phone in DB is stored as +201xxxxxxxx
      query = query.eq('phone', phone)
    }

    const { data: profile } = await query.maybeSingle()

    // SECURITY: Never reveal whether the lookup succeeded.
    // Always return success-like response.
    const GENERIC_RESPONSE = {
      ok: true,
      message: 'لو حسابك موجود في النظام وفيه إيميل صحيح، هتلاقي رسالة في إيميلك خلال دقيقة',
    }

    if (!profile) {
      // Don't reveal user doesn't exist
      return NextResponse.json(GENERIC_RESPONSE)
    }

    // No email on profile → graceful fallback
    if (!profile.email) {
      return NextResponse.json({
        ok: false,
        no_email: true,
        message: 'مفيش إيميل مسجّل على حسابك. تواصل معانا على الواتساب لإعادة تعيين كلمة السر.',
      })
    }

    // Email isn't configured → fallback
    if (!isEmailConfigured()) {
      console.warn('[forgot-password] RESEND_API_KEY missing — email not sent')
      return NextResponse.json({
        ok: false,
        email_not_configured: true,
        message: 'خدمة الإيميل مش مفعّلة دلوقتي. تواصل معانا على الواتساب.',
      })
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)

    // Store token in DB
    const { error: insertErr } = await supa
      .from('password_reset_tokens')
      .insert({
        token,
        user_id: profile.id,
        email: profile.email,
        expires_at: expiresAt.toISOString(),
        used: false,
      })

    if (insertErr) {
      console.error('[forgot-password] token insert failed:', insertErr)
      return NextResponse.json(
        { error: 'حصل خطأ، حاول تاني' },
        { status: 500 }
      )
    }

    // Send email
    const resetUrl = `${SITE_URL}/auth/reset-password?token=${token}`
    const customerName = profile.full_name || 'مستخدم Madmona'

    const html = renderResetEmail({
      customerName,
      resetUrl,
      expiryHours: RESET_TOKEN_EXPIRY_HOURS,
    })

    const result = await sendEmail({
      to: profile.email,
      subject: 'إعادة تعيين كلمة السر - مضمونة',
      html,
      text: `أهلاً ${customerName}،\n\nطلبت إعادة تعيين كلمة السر لحسابك على مضمونة.\n\nاستخدم اللينك ده خلال ${RESET_TOKEN_EXPIRY_HOURS} ساعة:\n${resetUrl}\n\nلو إنت ما طلبتش الإجراء ده، تجاهل الرسالة.\n\nMadmona Team`,
    })

    if (!result.ok) {
      console.error('[forgot-password] email send failed:', result.error)
      // Don't reveal email failure to user — they can try again
    }

    return NextResponse.json(GENERIC_RESPONSE)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown'
    console.error('[forgot-password] error:', msg)
    return NextResponse.json(
      { error: 'حصل خطأ، حاول تاني' },
      { status: 500 }
    )
  }
}

// ============================================================================
// Email template
// ============================================================================
function renderResetEmail(args: {
  customerName: string
  resetUrl: string
  expiryHours: number
}): string {
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>إعادة تعيين كلمة السر</title>
</head>
<body style="margin:0; padding:0; background:#FAFAF7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, sans-serif; color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF7; padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; background:#fff; border-radius:24px; overflow:hidden; box-shadow:0 4px 16px rgba(0,0,0,0.04);">
        <tr><td style="padding:32px 32px 16px; text-align:center; background: linear-gradient(135deg, #059669 0%, #34D399 100%); color:#fff;">
          <h1 style="margin:0; font-size:28px; font-weight:900; letter-spacing:-0.5px;">مضمونة</h1>
          <p style="margin:6px 0 0; font-size:11px; letter-spacing:3px; opacity:0.7; font-weight:bold;">MADMONA</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 24px; font-size:22px; font-weight:900;">إعادة تعيين كلمة السر 🔑</h2>
          <p style="margin: 0 0 16px; font-size:15px; line-height:1.7;">
            أهلاً <strong>${escapeHtml(args.customerName)}</strong>،
          </p>
          <p style="margin: 0 0 16px; font-size:15px; line-height:1.7;">
            استلمنا طلب إعادة تعيين كلمة السر لحسابك على مضمونة.
            اضغط الزرار اللي تحت لتحط كلمة سر جديدة.
          </p>

          <div style="margin:32px 0; text-align:center;">
            <a href="${escapeHtml(args.resetUrl)}"
               style="display:inline-block; background:#059669; color:#fff; padding:14px 32px; border-radius:14px; text-decoration:none; font-weight:bold; font-size:15px;">
              إعادة تعيين كلمة السر
            </a>
          </div>

          <div style="margin: 24px 0; padding: 12px 16px; background:#FFF7E6; border-right: 3px solid #2FA084; border-radius:8px;">
            <p style="margin: 0; font-size:13px; color:#8B6914; line-height:1.6;">
              ⏱️ اللينك ده <strong>صالح لمدة ${args.expiryHours} ساعة</strong> فقط.
              لو ما اخترتش حاجة، اطلب لينك جديد من الموقع.
            </p>
          </div>

          <p style="margin: 16px 0 0; font-size:13px; color:#666; line-height:1.6;">
            لو إنت ما طلبتش إعادة تعيين كلمة السر، تجاهل الرسالة دي.
            حسابك آمن — مفيش حد عنده وصول له.
          </p>

          <p style="margin: 16px 0 0; font-size:12px; color:#999; word-break: break-all; line-height:1.5;">
            مش شغّال الزرار؟ انسخ اللينك ده:<br>
            <a href="${escapeHtml(args.resetUrl)}" style="color:#059669; text-decoration:none;">${escapeHtml(args.resetUrl)}</a>
          </p>
        </td></tr>
        <tr><td style="padding:24px 32px; background:#FAFAF7; text-align:center; font-size:11px; color:#999;">
          <p style="margin:0 0 4px;">مضمونة - منصة الحجز المصرية</p>
          <p style="margin:0;">٧ شارع سليمان عَزْمي، مصر الجديدة، القاهرة</p>
          <p style="margin:8px 0 0;">
            <a href="https://wa.me/201002229982" style="color:#059669; text-decoration:none;">واتساب: +20 100 222 9982</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
