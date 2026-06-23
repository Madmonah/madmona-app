import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: configs } = await supabase.from('whatsapp_config').select('key, value')
  const config: Record<string, string> = {}
  for (const row of configs || []) config[row.key] = row.value

  const token = config.access_token
  const phoneNumberId = config.phone_number_id

  if (!token || !phoneNumberId) {
    return new Response(JSON.stringify({ error: 'missing credentials' }), { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } })
  }

  let body: { to?: string; mode?: string; message?: string }
  try { body = await req.json() } catch { body = {} }
  const to = body.to || '201002229982'
  const mode = body.mode || 'auto' // auto, text, template, debug
  const message = body.message || 'Hello from Madmona test'

  // دي للـ debug - نرجع الـ raw response لأي request
  if (mode === 'debug') {
    // فحص الرقم - على WhatsApp ولا لأ
    const checkRes = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}?fields=verified_name,display_phone_number,quality_rating,code_verification_status&access_token=${token}`)
    const checkData = await checkRes.json()
    return new Response(JSON.stringify({
      check: { status: checkRes.status, data: checkData },
      tokenPrefix: token.substring(0, 20),
      tokenLength: token.length,
      phoneNumberId
    }, null, 2), { status: 200, headers: { 'Content-Type': 'application/json', ...CORS } })
  }

  // صيغة الرقم: لازم يبدأ بـ country code بدون + ولا zeros
  let formattedTo = to.replace(/\D/g, '') // أرقام فقط
  if (formattedTo.startsWith('00')) formattedTo = formattedTo.substring(2)
  if (formattedTo.startsWith('0') && formattedTo.length === 11) {
    // رقم مصري محلي 010xxx
    formattedTo = '20' + formattedTo.substring(1)
  }

  // نجرب hello_world template (بيشتغل لأي رقم حتى لو مفيش conversation)
  if (mode === 'template' || mode === 'auto') {
    const r = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedTo,
        type: 'template',
        template: { name: 'hello_world', language: { code: 'en_US' } }
      })
    })
    const result = await r.json()
    return new Response(JSON.stringify({ 
      mode: 'template',
      formattedTo, 
      ok: r.ok, 
      status: r.status, 
      result 
    }, null, 2), { status: r.ok ? 200 : 400, headers: { 'Content-Type': 'application/json', ...CORS } })
  }

  // text mode
  const r = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedTo,
      type: 'text',
      text: { preview_url: false, body: message }
    })
  })
  const result = await r.json()
  return new Response(JSON.stringify({ mode: 'text', formattedTo, ok: r.ok, status: r.status, result }, null, 2), { status: r.ok ? 200 : 400, headers: { 'Content-Type': 'application/json', ...CORS } })
})
