// ============================================================================
// email-sender — Madmona email dispatcher
//
// v6 (Aug 2026):
//   • Provider: Brevo (Resend account closed)
//   • ADMIN EMAILS SILENCED — internal cron-to-cron alert emails are now
//     auto-cancelled instead of sent (owner request). Customer emails
//     (OTP, bookings, receipts...) keep flowing normally.
//     To re-enable admin emails: set secret ADMIN_EMAILS_ENABLED=true.
//
// Required secrets: BREVO_API_KEY, MADMONA_FROM_EMAIL (optional)
// ============================================================================

// @ts-ignore Deno-specific import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

// @ts-ignore — Deno env
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
// @ts-ignore — Deno env
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
// @ts-ignore — Deno env
const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY') ?? ''
// @ts-ignore — Deno env
const FROM_CUSTOMER = Deno.env.get('MADMONA_FROM_EMAIL') ?? 'noreply@madmonacairo.com'
// @ts-ignore — Deno env
const FROM_ADMIN = Deno.env.get('MADMONA_ADMIN_FROM_EMAIL') ?? 'alerts@madmonacairo.com'
// @ts-ignore — Deno env
const ADMIN_EMAILS_ENABLED = (Deno.env.get('ADMIN_EMAILS_ENABLED') ?? 'false') === 'true'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

function parseSender(from: string): { name?: string; email: string } {
  const m = from.match(/^(.*)<([^>]+)>\s*$/)
  if (m) return { name: m[1].trim().replace(/^"|"$/g, '') || undefined, email: m[2].trim() }
  return { email: from.trim() }
}

async function sendViaBrevo(args: {
  from: string
  to: string
  subject: string
  html?: string | null
  text?: string | null
  reply_to?: string | null
  cc?: string[] | null
}): Promise<{ ok: boolean; message_id?: string; error?: string; response?: any }> {
  if (!BREVO_API_KEY) {
    return { ok: false, error: 'BREVO_API_KEY not configured in Supabase secrets' }
  }
  if (!args.html && !args.text) {
    return { ok: false, error: 'Email requires either html or text body' }
  }

  const payload: Record<string, any> = {
    sender: parseSender(args.from),
    to: [{ email: args.to }],
    subject: args.subject,
  }
  if (args.html) payload.htmlContent = args.html
  if (args.text) payload.textContent = args.text
  if (args.reply_to) payload.replyTo = { email: args.reply_to }
  if (args.cc && Array.isArray(args.cc) && args.cc.length > 0) {
    payload.cc = args.cc.map((e) => ({ email: e }))
  }

  try {
    const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': BREVO_API_KEY },
      body: JSON.stringify(payload),
    })
    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) {
      return { ok: false, error: `Brevo ${resp.status}: ${data?.message || JSON.stringify(data)}`, response: data }
    }
    return { ok: true, message_id: data?.messageId, response: data }
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) }
  }
}

// ---------------------------------------------------------------------------
// Drain customer_email_outbox (unchanged — real customer emails)
// ---------------------------------------------------------------------------
async function drainCustomer(limit = 20) {
  const { data: rows, error } = await supabase
    .from('customer_email_outbox')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .lt('attempts', 3)
    .order('priority', { ascending: false })
    .order('scheduled_at', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('[customer] query error', error)
    return { sent: 0, failed: 0, errors: [error.message] }
  }
  if (!rows || rows.length === 0) return { sent: 0, failed: 0, errors: [] }

  let sent = 0, failed = 0
  const errors: string[] = []

  for (const row of rows) {
    const r = await sendViaBrevo({
      from: `${row.from_name} <${row.from_email || FROM_CUSTOMER}>`,
      to: row.to_email,
      subject: row.subject,
      html: row.body_html,
      text: row.body_text,
      reply_to: row.reply_to,
      cc: row.cc,
    })

    if (r.ok) {
      await supabase
        .from('customer_email_outbox')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          provider: 'brevo',
          provider_message_id: r.message_id,
          provider_response: r.response,
          attempts: (row.attempts || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id)
      sent++
    } else {
      const newAttempts = (row.attempts || 0) + 1
      const willFail = newAttempts >= (row.max_attempts || 3)
      await supabase
        .from('customer_email_outbox')
        .update({
          status: willFail ? 'failed' : 'pending',
          attempts: newAttempts,
          error: r.error,
          failed_at: willFail ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id)
      failed++
      errors.push(`${row.id}: ${r.error}`)
    }
  }

  return { sent, failed, errors }
}

// ---------------------------------------------------------------------------
// Admin outbox — SILENCED: auto-cancel pending rows instead of sending.
// Agents can keep writing rows (audit trail), nothing ever gets emailed.
// ---------------------------------------------------------------------------
async function cancelAdmin(limit = 100) {
  const { data: rows, error } = await supabase
    .from('admin_email_outbox')
    .update({
      status: 'cancelled',
      error: 'silenced: internal cron-to-cron admin emails disabled by owner (Aug 2026)',
    })
    .eq('status', 'pending')
    .select('id')
    .limit(limit)

  if (error) {
    console.error('[admin-silencer] error', error)
    return { cancelled: 0 }
  }
  return { cancelled: rows?.length || 0 }
}

// Legacy admin drain — only runs if ADMIN_EMAILS_ENABLED=true
async function drainAdmin(limit = 20) {
  const { data: rows, error } = await supabase
    .from('admin_email_outbox')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .lt('attempts', 3)
    .order('scheduled_at', { ascending: true })
    .limit(limit)

  if (error) return { sent: 0, failed: 0, errors: [error.message] }
  if (!rows || rows.length === 0) return { sent: 0, failed: 0, errors: [] }

  let sent = 0, failed = 0
  const errors: string[] = []

  for (const row of rows) {
    const r = await sendViaBrevo({
      from: row.from_label ? `${row.from_label} <${FROM_ADMIN}>` : `Madmona Alerts <${FROM_ADMIN}>`,
      to: row.to_email,
      subject: row.subject,
      html: row.body_html,
      text: row.body_text,
      reply_to: row.reply_to,
      cc: row.cc,
    })

    if (r.ok) {
      await supabase.from('admin_email_outbox').update({
        status: 'sent', sent_at: new Date().toISOString(), attempts: (row.attempts || 0) + 1,
      }).eq('id', row.id)
      sent++
    } else {
      const newAttempts = (row.attempts || 0) + 1
      await supabase.from('admin_email_outbox').update({
        status: newAttempts >= 3 ? 'failed' : 'pending', attempts: newAttempts, error: r.error,
      }).eq('id', row.id)
      failed++
      errors.push(`${row.id}: ${r.error}`)
    }
  }
  return { sent, failed, errors }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
// @ts-ignore — Deno.serve
Deno.serve(async (_req: Request) => {
  const startedAt = Date.now()
  try {
    const customer = await drainCustomer(20)
    const admin = ADMIN_EMAILS_ENABLED ? await drainAdmin(20) : await cancelAdmin(100)

    const result = {
      success: true,
      provider: 'brevo',
      admin_emails: ADMIN_EMAILS_ENABLED ? 'enabled' : 'silenced',
      duration_ms: Date.now() - startedAt,
      customer: { sent: customer.sent, failed: customer.failed },
      admin,
      errors: (customer.errors || []).slice(0, 10),
    }

    console.log('[email-sender]', JSON.stringify(result))
    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } })
  } catch (e: any) {
    const result = { success: false, error: e?.message || String(e), duration_ms: Date.now() - startedAt }
    console.error('[email-sender] fatal', result)
    return new Response(JSON.stringify(result), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
