// Generic WhatsApp template submission — accepts any template payload
// POST body: { name, body_text, footer_text, example_param_value }
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405 })
  }

  try {
    const body = await req.json()
    const { name, body_text, footer_text, example_param_value } = body

    if (!name || !body_text) {
      return new Response(JSON.stringify({ error: 'name and body_text required' }), { status: 400 })
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const { data: cfg } = await admin
      .from('whatsapp_config')
      .select('key, value')
      .in('key', ['access_token', 'waba_id'])
    const config = Object.fromEntries((cfg || []).map((c: { key: string; value: string }) => [c.key, c.value]))

    if (!config.access_token || !config.waba_id) {
      return new Response(JSON.stringify({ error: 'missing meta credentials' }), { status: 500 })
    }

    const hasPlaceholder = /\{\{1\}\}/.test(body_text)
    const bodyComponent: Record<string, unknown> = { type: 'BODY', text: body_text }
    if (hasPlaceholder) {
      bodyComponent.example = { body_text: [[example_param_value || 'أحمد']] }
    }

    const components: Array<Record<string, unknown>> = [bodyComponent]
    if (footer_text) components.push({ type: 'FOOTER', text: footer_text })

    const payload = { name, language: 'ar', category: 'MARKETING', components }

    const r = await fetch(`https://graph.facebook.com/v21.0/${config.waba_id}/message_templates`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${config.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await r.json()

    if (!r.ok) {
      return new Response(JSON.stringify({ ok: false, status: r.status, meta_error: data, payload_sent: payload }),
        { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    await admin.from('whatsapp_config').upsert([
      { key: `template_${name}_id`, value: data.id || 'unknown' },
      { key: `template_${name}_status`, value: data.status || 'PENDING' },
      { key: `template_${name}_submitted_at`, value: new Date().toISOString() },
    ])

    return new Response(JSON.stringify({
      ok: true,
      template_name: name,
      template_id: data.id,
      status: data.status,
      category: data.category,
      meta_response: data,
    }), { headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'exception', details: String(e) }), { status: 500 })
  }
})
