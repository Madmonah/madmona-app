// ============================================================================
// email-sender — Madmona dual-outbox email dispatcher
//
// Polls customer_email_outbox + admin_email_outbox, sends via Resend,
// updates status. Triggered every minute by pg_cron `madmona_email_sender`.
//
// Required Supabase secrets:
//   RESEND_API_KEY         — get from https://resend.com/api-keys
//   MADMONA_FROM_EMAIL     — default "noreply@madmonacairo.com" (must be verified in Resend)
//   MADMONA_ADMIN_FROM_EMAIL — default "alerts@madmonacairo.com"
//
// Phase Ω.7 (May 18 2026) — CC + reply_to + from_label support added May 26 2026
// ============================================================================

// @ts-ignore Deno-specific import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

// @ts-ignore — Deno env
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
// @ts-ignore — Deno env
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
// @ts-ignore — Deno env
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
// @ts-ignore — Deno env
const FROM_CUSTOMER = Deno.env.get('MADMONA_FROM_EMAIL') ?? 'noreply@madmonacairo.com'
// @ts-ignore — Deno env
const FROM_ADMIN = Deno.env.get('MADMONA_ADMIN_FROM_EMAIL') ?? 'alerts@madmonacairo.com'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ---------------------------------------------------------------------------
// Send a single email via Resend.
// Returns: { ok: boolean, message_id?: string, error?: string, response?: any }
// ---------------------------------------------------------------------------
async function sendViaResend(args: {
  from: string
  to: string
  subject: string
  html?: string | null
  text?: string | null
  reply_to?: string | null
  cc?: string[] | null
}): Promise<{ ok: boolean; message_id?: string; error?: string; response?: any }> {
  if (!RESEND_API_KEY) {
    return { ok: false, error: 'RESEND_API_KEY not configured in Supabase secrets' }
  }

  const payload: Record<string, any> = {
    from: args.from,
    to: [args.to],
    subject: args.subject,
  }
  if (args.html) payload.html = args.html
  if (args.text) payload.text = args.text
  if (args.reply_to) payload.reply_to = args.reply_to
  if (args.cc && Array.isArray(args.cc) && args.cc.length > 0) payload.cc = args.cc

  // Always include a text body so non-HTML clients don't break
  if (!payload.html && !payload.text) {
    return { ok: false, error: 'Email requires either html or text body' }
  }

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(payload),
    })
    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) {
      return { ok: false, error: `Resend ${resp.status}: ${data?.message || JSON.stringify(data)}`, response: data }
    }
    return { ok: true, message_id: data?.id, response: data }
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) }
  }
}

// ---------------------------------------------------------------------------
// Drain customer_email_outbox
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
    const r = await sendViaResend({
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
          provider: 'resend',
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
// Drain admin_email_outbox
// ---------------------------------------------------------------------------
async function drainAdmin(limit = 20) {
  const { data: rows, error } = await supabase
    .from('admin_email_outbox')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .lt('attempts', 3)
    .order('scheduled_at', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('[admin] query error', error)
    return { sent: 0, failed: 0, errors: [error.message] }
  }
  if (!rows || rows.length === 0) return { sent: 0, failed: 0, errors: [] }

  let sent = 0, failed = 0
  const errors: string[] = []

  for (const row of rows) {
    const r = await sendViaResend({
      from: row.from_label ? `${row.from_label} <${FROM_ADMIN}>` : `Madmona Alerts <${FROM_ADMIN}>`,
      to: row.to_email,
      subject: row.subject,
      html: row.body_html,
      text: row.body_text,
      reply_to: row.reply_to,
      cc: row.cc,
    })

    if (r.ok) {
      await supabase
        .from('admin_email_outbox')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          attempts: (row.attempts || 0) + 1,
        })
        .eq('id', row.id)
      sent++
    } else {
      const newAttempts = (row.attempts || 0) + 1
      const willFail = newAttempts >= 3
      await supabase
        .from('admin_email_outbox')
        .update({
          status: willFail ? 'failed' : 'pending',
          attempts: newAttempts,
          error: r.error,
        })
        .eq('id', row.id)
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
Deno.serve(async (req: Request) => {
  const startedAt = Date.now()

  try {
    const customer = await drainCustomer(20)
    const admin = await drainAdmin(20)

    const result = {
      success: true,
      duration_ms: Date.now() - startedAt,
      customer: { sent: customer.sent, failed: customer.failed },
      admin: { sent: admin.sent, failed: admin.failed },
      errors: [...customer.errors, ...admin.errors].slice(0, 10),
    }

    console.log('[email-sender]', JSON.stringify(result))
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    const result = { success: false, error: e?.message || String(e), duration_ms: Date.now() - startedAt }
    console.error('[email-sender] fatal', result)
    return new Response(JSON.stringify(result), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
