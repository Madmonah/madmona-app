import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

Deno.serve(async () => {
  const TOKEN = 'sn9ouybBU6jBx7i5_j-lrDs47n4T7KSzOG9MlX2Rp_S'
  const r = await fetch(`https://api.bufferapp.com/1/profiles.json?access_token=${TOKEN}`)
  const text = await r.text()
  let body: unknown = text
  try { body = JSON.parse(text) } catch {}
  return new Response(JSON.stringify({ status: r.status, body }, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
})
