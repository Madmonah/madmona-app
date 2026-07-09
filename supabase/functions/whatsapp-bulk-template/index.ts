// whatsapp-bulk-template v4 (2026-07-06) — 🛡️ TEMPLATE-AUDIENCE GUARD:
// every recipient is checked against template_audience_rules (check_template_audience RPC)
// BEFORE sending — sector templates can never reach the wrong sector again.
// Incident 6 Jul: restaurant template went to cars/apartments leads via revive. Never again.
// v3 (2026-07-05) — per-recipient params: body.recipients = [{ phone, param1?, template_name? }]
// (A/B + per-name). Legacy body.phones + single param1 still fully supported.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-agent-secret'
}

function normalizePhone(raw: string): string {
  let digits = (raw || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('0') && digits.length === 11) digits = '20' + digits.slice(1)
  return digits
}

type Recipient = { phone: string; param1?: string; template_name?: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })

  try {
    const expectedSecret = Deno.env.get('AGENT_SECRET') || 'c9aade438b57204664c496dcd43ab8a640af5061273abc6591522bf96065d0c7'
    const agentSecret = req.headers.get('x-agent-secret') || ''
    if (agentSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: 'unauthorized', hint: 'send x-agent-secret header' }), { status: 401, headers: { 'Content-Type': 'application/json', ...CORS } })
    }

    const body = await req.json()
    const defaultTemplate: string = body.template_name || 'partnership_intro_v2'
    const languageCode: string = body.language_code || 'ar'
    const defaultParam1: string = body.param1 || 'حضرتك'
    const agentName: string = body.agent_name || 'bulk-supplier-outreach'
    const dryRun: boolean = !!body.dry_run

    // Unified recipients list: new shape first, legacy phones[] fallback.
    let recipients: Recipient[] = []
    if (Array.isArray(body.recipients) && body.recipients.length > 0) {
      recipients = body.recipients.filter((r: Recipient) => r && r.phone)
    } else if (Array.isArray(body.phones) && body.phones.length > 0) {
      recipients = body.phones.map((p: string) => ({ phone: p }))
    }
    if (recipients.length === 0) {
      return new Response(JSON.stringify({ error: 'recipients or phones array required' }), { status: 400, headers: { 'Content-Type': 'application/json', ...CORS } })
    }

    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: configRows } = await sb.from('whatsapp_config').select('key, value').in('key', ['phone_number_id', 'access_token'])
    const config = Object.fromEntries((configRows || []).map((r: { key: string; value: string }) => [r.key, r.value]))
    const phoneId = config.phone_number_id
    const accessToken = config.access_token
    if (!phoneId || !accessToken) {
      return new Response(JSON.stringify({ error: 'WhatsApp config missing' }), { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } })
    }

    if (dryRun) {
      return new Response(JSON.stringify({ dry_run: true, would_send: recipients.length, template: defaultTemplate }), { headers: { 'Content-Type': 'application/json', ...CORS } })
    }

    let blockedCount = 0
    const results: Array<{ phone: string; ok: boolean; wa_id?: string; template?: string; error?: string }> = []
    for (const rec of recipients) {
      const phone = normalizePhone(rec.phone)
      const templateName = rec.template_name || defaultTemplate
      const param1 = (rec.param1 || '').trim() || defaultParam1
      if (!phone) {
        results.push({ phone: rec.phone, ok: false, error: 'invalid phone' })
        continue
      }

      // 🛡️ AUDIENCE GUARD — hard data-layer check before ANY send.
      // Rules live in template_audience_rules; unknown templates default to 'all'.
      try {
        const { data: gate } = await sb.rpc('check_template_audience', { p_phone: phone, p_template: templateName })
        const g = gate as { allowed?: boolean; reason?: string } | null
        if (g && g.allowed === false) {
          blockedCount++
          results.push({ phone, ok: false, template: templateName, error: 'blocked_by_audience_guard: ' + (g.reason || '') })
          try {
            await sb.from('whatsapp_policy_violations').insert({
              attempted_recipient: '+' + phone,
              attempted_message: `[template: ${templateName} | param1: ${param1}]`,
              agent_name: agentName,
              campaign: 'bulk_template',
              violation_type: 'template_audience_mismatch',
              matched_pattern: g.reason || 'audience_rule'
            })
          } catch (_e) { /* audit best-effort */ }
          continue
        }
      } catch (_e) { /* guard RPC unavailable → generic templates pass (default rule = all) */ }

      try {
        const r = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: phone,
            type: 'template',
            template: {
              name: templateName,
              language: { code: languageCode },
              components: [{ type: 'body', parameters: [{ type: 'text', text: param1 }] }]
            }
          })
        })
        const data = await r.json()
        const ok = r.ok
        const waId = data?.messages?.[0]?.id
        const err = data?.error?.message || (ok ? undefined : `HTTP ${r.status}`)

        if (ok && waId) {
          const fullPhone = '+' + phone
          let convId: string | null = null
          const { data: existing } = await sb.from('whatsapp_conversations').select('id').eq('contact_phone', fullPhone).maybeSingle()
          if (existing) {
            convId = (existing as { id: string }).id
            await sb.from('whatsapp_conversations').update({
              last_message_at: new Date().toISOString(),
              last_message_direction: 'outbound',
              last_outbound_at: new Date().toISOString(),
              status: 'active'
            }).eq('id', convId)
          } else {
            const { data: newConv } = await sb.from('whatsapp_conversations').insert({
              contact_phone: fullPhone,
              contact_type: 'unknown',
              agent_name: agentName,
              status: 'active',
              last_message_at: new Date().toISOString(),
              last_message_direction: 'outbound',
              last_outbound_at: new Date().toISOString(),
              message_count: 1
            }).select('id').single()
            convId = (newConv as { id: string } | null)?.id || null
          }
          if (convId) {
            await sb.from('whatsapp_messages').insert({
              conversation_id: convId,
              direction: 'outbound',
              wa_message_id: waId,
              body: `[template: ${templateName} | param1: ${param1}]`,
              message_type: 'template',
              template_name: templateName,
              template_params: { 1: param1 },
              status: 'sent',
              status_updated_at: new Date().toISOString(),
              ai_generated: false,
              agent_name: agentName,
              metadata: { bulk_send: true, template_name: templateName }
            })
          }
          await sb.from('cold_leads').update({
            last_contacted: new Date().toISOString(),
            status: 'contacted'
          }).eq('phone', fullPhone)
        }
        results.push({ phone, ok, wa_id: waId, template: templateName, error: err })
      } catch (e) {
        results.push({ phone, ok: false, error: e instanceof Error ? e.message : 'unknown' })
      }
      await new Promise((res) => setTimeout(res, 200))
    }

    const okCount = results.filter(r => r.ok).length
    return new Response(JSON.stringify({
      total: recipients.length,
      sent: okCount,
      failed: recipients.length - okCount,
      blocked_by_guard: blockedCount,
      results: results.slice(0, 10),
      sent_phones: results.filter(r => r.ok).map(r => r.phone),
      first_errors: results.filter(r => !r.ok).slice(0, 5).map(r => r.error)
    }, null, 2), { headers: { 'Content-Type': 'application/json', ...CORS } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'unknown' }), { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } })
  }
})
