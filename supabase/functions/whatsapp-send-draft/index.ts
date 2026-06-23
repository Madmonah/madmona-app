// whatsapp-send-draft: send a pending_review draft & update its status
// Body: { draft_id: string, edited_body?: string }
// or:   { draft_ids: string[] } for batch send
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey'
}

function enforceBrandName(t: string): string {
  if (!t) return t
  return t
    .replace(/مدمونة/g, 'مضمونة')
    .replace(/مدمونه/g, 'مضمونة')
    .replace(/مظمونة/g, 'مضمونة')
    .replace(/مذمونة/g, 'مضمونة')
    .replace(/متمونة/g, 'مضمونة')
    .replace(/Madmoonah?/gi, 'Madmona')
    .replace(/\/categories\//g, '/marketplace/')
}

function normalizePhone(raw: string): string {
  let d = (raw || '').replace(/\D/g, '')
  if (!d) return ''
  if (d.startsWith('0') && d.length === 11) d = '20' + d.slice(1)
  return d
}

async function sendOne(draft_id: string, edited_body: string | undefined, sb: any) {
  // Load draft + conversation
  const { data: draft, error } = await sb
    .from('whatsapp_messages')
    .select('id, body, status, conversation_id, metadata')
    .eq('id', draft_id)
    .single()

  if (error || !draft) return { draft_id, ok: false, error: 'draft not found' }
  if (draft.status !== 'pending_review') {
    return { draft_id, ok: false, error: `draft status is ${draft.status}, not pending_review` }
  }

  const { data: conv } = await sb
    .from('whatsapp_conversations')
    .select('contact_phone, contact_name')
    .eq('id', draft.conversation_id)
    .single()
  if (!conv) return { draft_id, ok: false, error: 'conversation not found' }

  // Body
  const rawBody = (edited_body !== undefined ? edited_body : draft.body) as string
  const body = enforceBrandName(rawBody)
  const to = normalizePhone(conv.contact_phone)

  // Meta creds
  const { data: cfgRows } = await sb.from('whatsapp_config').select('key, value')
  const cfg = Object.fromEntries((cfgRows || []).map((r: any) => [r.key, r.value]))
  const url = `https://graph.facebook.com/v21.0/${cfg.phone_number_id}/messages`
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp', recipient_type: 'individual', to,
      type: 'text', text: { body, preview_url: true }
    })
  })
  const data = await r.json()
  const ok = r.ok
  const wa_message_id = data?.messages?.[0]?.id
  const errMsg = data?.error?.message || (ok ? null : `HTTP ${r.status}`)

  // Update the SAME draft row (don't create a duplicate)
  await sb.from('whatsapp_messages').update({
    body,
    status: ok ? 'sent' : 'failed',
    wa_message_id,
    status_updated_at: new Date().toISOString(),
    error_message: errMsg,
    metadata: { ...(draft.metadata || {}), approved_at: new Date().toISOString(), was_edited: edited_body !== undefined && edited_body !== draft.body }
  }).eq('id', draft_id)

  // Update conversation last_outbound
  await sb.from('whatsapp_conversations').update({
    last_message_at: new Date().toISOString(),
    last_message_direction: 'outbound',
    last_outbound_at: new Date().toISOString()
  }).eq('id', draft.conversation_id)

  return { draft_id, ok, wa_message_id, error: errMsg, recipient: conv.contact_name || conv.contact_phone }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS })

  try {
    const body = await req.json()
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // Batch mode
    if (Array.isArray(body.draft_ids)) {
      const results = []
      for (const id of body.draft_ids) {
        results.push(await sendOne(id, undefined, sb))
      }
      const sent = results.filter(r => r.ok).length
      return new Response(JSON.stringify({ batch: true, sent, total: results.length, results }, null, 2), {
        status: 200, headers: { 'Content-Type': 'application/json', ...CORS }
      })
    }

    // Single mode
    const { draft_id, edited_body } = body
    if (!draft_id) {
      return new Response(JSON.stringify({ ok: false, error: 'draft_id required' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...CORS }
      })
    }
    const result = await sendOne(draft_id, edited_body, sb)
    return new Response(JSON.stringify(result, null, 2), {
      status: result.ok ? 200 : 400,
      headers: { 'Content-Type': 'application/json', ...CORS }
    })
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS }
    })
  }
})
