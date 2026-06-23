import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  
  const r = await fetch('https://www.madmonacairo.com/api/agents/email-content-digest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer c9aade438b57204664c496dcd43ab8a640af5061273abc6591522bf96065d0c7'
    }
  })
  const text = await r.text()
  let body: unknown = text
  try { body = JSON.parse(text) } catch {}
  return new Response(JSON.stringify({ status: r.status, body }, null, 2), { status: 200, headers: { 'Content-Type': 'application/json', ...CORS } })
})
