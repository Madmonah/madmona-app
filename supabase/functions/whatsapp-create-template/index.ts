import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey'
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
  const wabaId = config.waba_id

  let body: any
  try { body = await req.json() } catch { body = {} }

  // إنشاء template بسيط
  const templatePayload = body.payload || {
    name: 'madmona_welcome',
    language: 'ar',
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text: 'أهلاً بيك في مضمونة - أول منصة تأجير في مصر 🏢\n\nإحنا بتوع الإيجار، وبنوفرلك أحسن المساحات، العقارات، المعدات، وغيرها.\n\nتفضل زور موقعنا: madmonacairo.com'
      },
      {
        type: 'FOOTER',
        text: 'مضمونة - إحنا بتوع الإيجار'
      }
    ]
  }

  const r = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/message_templates`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(templatePayload)
  })
  const data = await r.json()
  
  return new Response(JSON.stringify({
    ok: r.ok,
    status: r.status,
    result: data,
    sent: templatePayload
  }, null, 2), { status: r.ok ? 200 : 400, headers: { 'Content-Type': 'application/json', ...CORS } })
})
