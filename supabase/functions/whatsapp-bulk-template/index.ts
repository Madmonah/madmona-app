// whatsapp-bulk-template v2 — use x-agent-secret header (Authorization is for Supabase JWT)
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
    const phones: string[] = body.phones || []
    const templateName: string = body.template_name || 'partnership_intro_v2'
    const languageCode: string = body.language_code || 'ar'
    const param1: string = body.param1 || 'حضرتك'
    const agentName: string = body.agent_name || 'bulk-supplier-outreach'
    const dryRun: boolean = !!body.dry_run

    if (!Array.isArray(phones) || phones.length === 0) {
      return new Response(JSON.stringify({ error: 'phones array required' }), { status: 400, headers: { 'Content-Type': 'application/json', ...CORS } })
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
      return new Response(JSON.stringify({ dry_run: true, would_send: phones.length, template: templateName, param1 }), { headers: { 'Content-Type': 'application/json', ...CORS } })
    }

    const results: Array<{ phone: string; ok: boolean; wa_id?: string; error?: string }> = []
    for (const rawPhone of phones) {
      const phone = normalizePhone(rawPhone)
      if (!phone) {
        results.push({ phone: rawPhone, ok: false, error: 'invalid phone' })
        continue
      }
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
          // Update cold_leads.contact_count + last_contacted
          await sb.from('cold_leads').update({
            last_contacted: new Date().toISOString(),
            status: 'contacted'
          }).eq('phone', fullPhone)
        }
        results.push({ phone, ok, wa_id: waId, error: err })
      } catch (e) {
        results.push({ phone, ok: false, error: e instanceof Error ? e.message : 'unknown' })
      }
      await new Promise((res) => setTimeout(res, 200))
    }

    const okCount = results.filter(r => r.ok).length
    return new Response(JSON.stringify({
      total: phones.length,
      sent: okCount,
      failed: phones.length - okCount,
      results: results.slice(0, 10),
      first_errors: results.filter(r => !r.ok).slice(0, 5).map(r => r.error)
    }, null, 2), { headers: { 'Content-Type': 'application/json', ...CORS } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'unknown' }), { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } })
  }
})
