// model-probe — utility to test any Anthropic model against a task using the vault key.
// Guarded by internal probe secret. Used June 11 2026 to evaluate claude-fable-5 before agent consolidation.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const PROBE_SECRET = 'mdmn-probe-8f3a2c91e7d44b06'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 })
  try {
    const { secret, model, system, prompt, max_tokens } = await req.json()
    if (secret !== PROBE_SECRET) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
    if (!model || !prompt) return new Response(JSON.stringify({ error: 'model and prompt required' }), { status: 400 })
    const { data: key } = await sb.rpc('get_anthropic_key')
    if (!key) return new Response(JSON.stringify({ error: 'no key' }), { status: 500 })
    const t0 = Date.now()
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key as string, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        max_tokens: Math.min(max_tokens || 2000, 4000),
        ...(system ? { system } : {}),
        messages: [{ role: 'user', content: prompt }]
      })
    })
    const latency_ms = Date.now() - t0
    const data = await r.json()
    if (!r.ok) {
      return new Response(JSON.stringify({ ok: false, status: r.status, error: data?.error || data, latency_ms }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      })
    }
    const text = (data?.content || []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n')
    return new Response(JSON.stringify({ ok: true, model: data?.model, latency_ms, usage: data?.usage, text }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
