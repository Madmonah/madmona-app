// ============================================================================
// phone-auth — Madmona phone + password authentication flows
//
// v2 (8 Aug 2026): synthetic-email awareness + real-email attach flow
//   • forgot_start(email) refuses synthetic inboxes (digits@madmonacairo.com)
//     → returns no_email_on_account so the UI steers users to WhatsApp
//   • NEW authed actions (require Authorization: Bearer <user JWT>):
//       email_change_start  { new_email }        -> sends 6-digit code via Brevo
//       email_change_verify { new_email, code }  -> sets real, confirmed email
//
// Actions (POST { action, ... }):
//   signup_start  { phone, full_name }
//   signup_verify { phone, code, password, full_name }
//   forgot_start  { phone, channel: 'whatsapp'|'email' }
//   forgot_reset  { phone, code, new_password }
//   email_change_start  { new_email }            [AUTH REQUIRED]
//   email_change_verify { new_email, code }      [AUTH REQUIRED]
//
// Reuses existing rails: madmona_request_otp / madmona_verify_otp RPCs,
// get_wa_bridge_secret vault RPC, Railway OpenWA bridge, Brevo for email,
// email_change_requests table + email_in_use() helper (migration 20260808_04).
// Required secrets: BREVO_API_KEY, MADMONA_FROM_EMAIL (optional).
// verify_jwt = false — pre-auth endpoints; authed actions check JWT manually.
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const BRIDGE_URL = 'https://madmona-app-production.up.railway.app'
const SESSION_ID = '201002229982'
const FROM_EMAIL = Deno.env.get('MADMONA_FROM_EMAIL') ?? 'noreply@madmonacairo.com'
const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY') ?? ''

// إيميل مصطنع = أرقام فقط قبل @madmonacairo.com (حيلة phoneToEmail القديمة)
const SYNTHETIC_EMAIL = /^[0-9]+@madmonacairo\.com$/i
const VALID_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

// Normalize to international digits (Egypt-first): 010... -> 2010...
function intlDigits(phone: string): string {
  let d = (phone || '').replace(/\D/g, '')
  if (d.startsWith('0')) d = '2' + d
  else if (d.length === 10 && d.startsWith('1')) d = '20' + d
  return d
}

function maskEmail(email: string): string {
  const [user, domain] = email.split('@')
  return `${user.slice(0, 2)}***@${domain}`
}

async function requireUser(req: Request) {
  const auth = req.headers.get('Authorization') || ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!token) throw new Error('not_authenticated')
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data?.user) throw new Error('not_authenticated')
  return data.user
}

async function findUserByPhone(phone: string) {
  const { data, error } = await admin.rpc('find_auth_user_by_phone', { p_phone: phone })
  if (error) throw new Error(`lookup_failed: ${error.message}`)
  return (data && data[0]) || null
}

async function issueOtp(phone: string, fullName: string | null) {
  const { data, error } = await admin.rpc('madmona_request_otp', {
    p_phone: phone,
    p_full_name: fullName,
  })
  if (error) throw new Error(error.message)
  if (!data?.success) throw new Error(data?.error || 'otp_request_failed')
  return data as { code: string; wa_to: string; phone: string; known_name: string | null }
}

async function verifyOtp(phone: string, code: string) {
  const { data, error } = await admin.rpc('madmona_verify_otp', {
    p_phone: phone,
    p_code: code,
  })
  if (error) throw new Error(error.message)
  if (!data?.success) throw new Error(data?.error || 'invalid_code')
  return data
}

async function sendWhatsapp(to: string, text: string) {
  const { data: secret, error } = await admin.rpc('get_wa_bridge_secret')
  if (error || !secret) throw new Error('bridge_secret_unavailable')
  const res = await fetch(`${BRIDGE_URL}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-madmona-secret': secret as string },
    body: JSON.stringify({ session: SESSION_ID, to, text }),
  })
  // OpenWA bridge sometimes returns 5xx but still delivers; only fail on 4xx
  if (!res.ok && res.status < 500) throw new Error(`wa_send_failed_${res.status}`)
}

async function sendBrevoEmail(to: string, subject: string, html: string, text: string) {
  if (!BREVO_API_KEY) throw new Error('BREVO_API_KEY not configured')
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': BREVO_API_KEY },
    body: JSON.stringify({
      sender: { name: 'مضمونة', email: FROM_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`brevo_${res.status}: ${body.slice(0, 200)}`)
  }
}

const codeEmailHtml = (title: string, code: string, note: string) => `<!doctype html><html dir="rtl" lang="ar"><body
 style="margin:0;background:#f4f8f7;font-family:Tahoma,Arial,sans-serif">
<div style="max-width:480px;margin:24px auto;background:#fff;border-radius:16px;
 padding:32px;text-align:center;border:1px solid #e3ece8">
<h2 style="color:#184138;margin:0 0 8px">مضمونة</h2>
<p style="color:#333;font-size:16px">${title}</p>
<div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#184138;
 background:#f4f8f7;border-radius:12px;padding:16px;margin:16px 0">${code}</div>
<p style="color:#888;font-size:13px">${note}</p>
</div></body></html>`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const body = await req.json()
    const action = body?.action as string

    // ------------------------------------------------ signup_start
    if (action === 'signup_start') {
      const { phone, full_name } = body
      if (!phone) return json({ success: false, error: 'phone_required' }, 400)
      const existing = await findUserByPhone(phone)
      if (existing) return json({ success: false, error: 'phone_exists' })
      const otp = await issueOtp(phone, full_name ?? null)
      await sendWhatsapp(otp.wa_to, [
        'أهلًا بيك في مضمونة!',
        '',
        '🔐 كود تفعيل حسابك:',
        `*${otp.code}*`,
        '',
        '⏱ صالح 10 دقايق',
      ].join('\n'))
      return json({ success: true, phone: otp.phone })
    }

    // ------------------------------------------------ signup_verify
    if (action === 'signup_verify') {
      const { phone, code, password, full_name } = body
      if (!phone || !code || !password) return json({ success: false, error: 'missing_params' }, 400)
      if (String(password).length < 8) return json({ success: false, error: 'weak_password' })
      await verifyOtp(phone, code)
      const existing = await findUserByPhone(phone)
      if (existing) return json({ success: false, error: 'phone_exists' })
      const intl = intlDigits(phone)
      const { data: created, error } = await admin.auth.admin.createUser({
        phone: intl,
        password,
        phone_confirm: true,
        user_metadata: { full_name: full_name ?? null, phone: intl },
      })
      if (error) return json({ success: false, error: error.message })
      return json({ success: true, user_id: created.user?.id, phone: intl })
    }

    // ------------------------------------------------ forgot_start
    if (action === 'forgot_start') {
      const { phone, channel } = body
      if (!phone) return json({ success: false, error: 'phone_required' }, 400)
      const user = await findUserByPhone(phone)
      if (!user) return json({ success: false, error: 'no_account_with_phone' })

      if (channel === 'email') {
        // 🚫 v2: الإيميل المصطنع (2010...@madmonacairo.com) مش صندوق حقيقي —
        //    زمان كنا بنبعت له والكود يضيع في الفراغ. دلوقتي بنرفض بوضوح.
        if (!user.email || SYNTHETIC_EMAIL.test(user.email)) {
          return json({ success: false, error: 'no_email_on_account' })
        }
        const otp = await issueOtp(phone, null)
        await sendBrevoEmail(
          user.email,
          'كود استرجاع كلمة السر — مضمونة',
          codeEmailHtml('كود استرجاع كلمة السر:', otp.code, 'الكود صالح لمدة 10 دقايق. لو مش انت اللي طلبته، تجاهل الرسالة دي.'),
          `كود استرجاع كلمة السر: ${otp.code} (صالح 10 دقايق)`,
        )
        return json({ success: true, channel: 'email', sent_to: maskEmail(user.email) })
      }

      // default: whatsapp via المارد
      const otp = await issueOtp(phone, null)
      await sendWhatsapp(otp.wa_to, [
        '🔐 كود استرجاع كلمة السر في مضمونة:',
        `*${otp.code}*`,
        '',
        'لو مش انت اللي طلبته، تجاهل الرسالة دي.',
        '⏱ صالح 10 دقايق',
      ].join('\n'))
      return json({ success: true, channel: 'whatsapp', sent_to: otp.phone })
    }

    // ------------------------------------------------ forgot_reset
    if (action === 'forgot_reset') {
      const { phone, code, new_password } = body
      if (!phone || !code || !new_password) return json({ success: false, error: 'missing_params' }, 400)
      if (String(new_password).length < 8) return json({ success: false, error: 'weak_password' })
      await verifyOtp(phone, code)
      const user = await findUserByPhone(phone)
      if (!user) return json({ success: false, error: 'no_account_with_phone' })
      const { error } = await admin.auth.admin.updateUserById(user.user_id, {
        password: new_password,
        phone_confirm: true,
      })
      if (error) return json({ success: false, error: error.message })
      return json({ success: true })
    }

    // ------------------------------------------------ email_change_start [AUTH]
    if (action === 'email_change_start') {
      const user = await requireUser(req)
      const newEmail = String(body?.new_email || '').trim().toLowerCase()
      if (!VALID_EMAIL.test(newEmail)) return json({ success: false, error: 'invalid_email' })
      if (SYNTHETIC_EMAIL.test(newEmail)) return json({ success: false, error: 'invalid_email' })

      const { data: taken, error: tErr } = await admin.rpc('email_in_use', {
        p_email: newEmail,
        p_exclude: user.id,
      })
      if (tErr) throw new Error(tErr.message)
      if (taken) return json({ success: false, error: 'email_taken' })

      const code = String(Math.floor(100000 + Math.random() * 900000))
      const { error: upErr } = await admin.from('email_change_requests').upsert({
        user_id: user.id,
        new_email: newEmail,
        code,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        attempts: 0,
        created_at: new Date().toISOString(),
      })
      if (upErr) throw new Error(upErr.message)

      await sendBrevoEmail(
        newEmail,
        'كود تأكيد الإيميل — مضمونة',
        codeEmailHtml('كود تأكيد إيميلك على مضمونة:', code, 'الكود صالح لمدة 10 دقايق. لو مش انت اللي طلب ربط الإيميل ده، تجاهل الرسالة.'),
        `كود تأكيد الإيميل: ${code} (صالح 10 دقايق)`,
      )
      return json({ success: true, sent_to: maskEmail(newEmail) })
    }

    // ------------------------------------------------ email_change_verify [AUTH]
    if (action === 'email_change_verify') {
      const user = await requireUser(req)
      const newEmail = String(body?.new_email || '').trim().toLowerCase()
      const code = String(body?.code || '').trim()
      if (!VALID_EMAIL.test(newEmail) || !code) return json({ success: false, error: 'missing_params' }, 400)

      const { data: rows, error: qErr } = await admin
        .from('email_change_requests')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
      if (qErr) throw new Error(qErr.message)
      const reqRow = rows && rows[0]

      const bad = async () => {
        if (reqRow) {
          await admin.from('email_change_requests')
            .update({ attempts: (reqRow.attempts || 0) + 1 })
            .eq('user_id', user.id)
        }
        return json({ success: false, error: 'invalid_code' })
      }

      if (!reqRow) return json({ success: false, error: 'invalid_code' })
      if ((reqRow.attempts || 0) >= 5) return json({ success: false, error: 'invalid_code' })
      if (new Date(reqRow.expires_at).getTime() < Date.now()) return json({ success: false, error: 'invalid_code' })
      if (reqRow.new_email.toLowerCase() !== newEmail || reqRow.code !== code) return await bad()

      const { error: updErr } = await admin.auth.admin.updateUserById(user.id, {
        email: newEmail,
        email_confirm: true,
      })
      if (updErr) {
        const msg = updErr.message || ''
        if (/already|registered|exists/i.test(msg)) return json({ success: false, error: 'email_taken' })
        return json({ success: false, error: msg })
      }

      await admin.from('profiles').update({ email: newEmail }).eq('id', user.id)
      await admin.from('email_change_requests').delete().eq('user_id', user.id)

      return json({ success: true, email: newEmail })
    }

    return json({ success: false, error: 'unknown_action' }, 400)
  } catch (e) {
    console.error('[phone-auth]', e)
    const msg = String((e as Error)?.message || e)
    const status = msg === 'not_authenticated' ? 401 : 200
    return json({ success: false, error: msg }, status)
  }
})
