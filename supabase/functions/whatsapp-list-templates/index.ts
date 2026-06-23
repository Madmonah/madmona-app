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

  // جلب الـ templates الموجودة في الـ WABA
  const r = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/message_templates?access_token=${token}`)
  const data = await r.json()
  return new Response(JSON.stringify(data, null, 2), { status: 200, headers: { 'Content-Type': 'application/json', ...CORS } })
})
