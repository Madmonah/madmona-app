// whatsapp-send-real: يبعت رسالة WhatsApp فعلية لرقم
import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey'
}

function normalizePhone(raw: string): string {
  let digits = (raw || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('0') && digits.length === 11) digits = '20' + digits.slice(1)
  return digits
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  
  try {
    const body = await req.json()
    const to = normalizePhone(body.to || '')
    const text = body.text || ''
    const agentName = body.agent_name || 'manual-test'
    
    if (!to || !text) {
      return new Response(JSON.stringify({ ok: false, error: 'to and text required' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...CORS }
      })
    }
    
    // Get config from Supabase
    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    const { data: configRows } = await sb.from('whatsapp_config').select('key, value')
    const config = Object.fromEntries((configRows || []).map((r: any) => [r.key, r.value]))
    
    const phoneNumberId = config.phone_number_id
    const accessToken = config.access_token
    
    if (!phoneNumberId || !accessToken) {
      return new Response(JSON.stringify({ ok: false, error: 'WhatsApp config missing' }), {
        status: 500, headers: { 'Content-Type': 'application/json', ...CORS }
      })
    }
    
    // Send to WhatsApp Cloud API
    const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: text, preview_url: false }
      })
    })
    
    const data = await r.json()
    const ok = r.ok
    const wa_message_id = data?.messages?.[0]?.id
    const error = data?.error?.message
    
    // Log to whatsapp_messages table
    if (ok) {
      // Get or create conversation
      const { data: convId } = await sb.rpc('whatsapp_upsert_conversation', {
        p_phone: to,
        p_name: null,
        p_contact_type: 'unknown',
        p_supplier_id: null,
        p_profile_id: null,
        p_agent_name: agentName
      })
      
      if (convId) {
        await sb.from('whatsapp_messages').insert({
          conversation_id: convId,
          direction: 'outbound',
          wa_message_id,
          body: text,
          message_type: 'text',
          status: 'sent',
          status_updated_at: new Date().toISOString(),
          ai_generated: agentName !== 'manual-test',
          agent_name: agentName
        })
      }
    }
    
    return new Response(JSON.stringify({ ok, wa_message_id, error, raw: data }, null, 2), {
      status: ok ? 200 : 400,
      headers: { 'Content-Type': 'application/json', ...CORS }
    })
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS }
    })
  }
})
