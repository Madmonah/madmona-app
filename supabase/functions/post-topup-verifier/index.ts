// post-topup-verifier v1 (2026-06-11) — one-shot self-cleaning verifier.
// Every 10 min (cron): ping API with tiny haiku call. When credits return:
// run marid-campaign-manager smoke test (await) + trigger sales-engine (fire&forget),
// write success marker to system_runbook (cron then unschedules itself) + high-priority
// insight so admin-alert-mailer emails Mohamed the result within 30 min.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const sb = createClient(SUPABASE_URL, SERVICE_KEY)

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 })
  try {
    // already done?
    const { data: marker } = await sb.from('system_runbook').select('id').eq('topic', 'fable5_smoke_done').maybeSingle()
    if (marker) return json({ ok: true, state: 'already_done' })

    // credits ping (tiny haiku)
    const { data: key } = await sb.rpc('get_anthropic_key')
    if (!key) return json({ ok: false, error: 'no key' })
    const ping = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key as string, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 5, messages: [{ role: 'user', content: 'hi' }] })
    })
    if (!ping.ok) {
      const t = await ping.text()
      if (/credit balance/i.test(t)) return json({ ok: true, state: 'waiting_for_topup' })
      return json({ ok: false, error: t.slice(0, 200) })
    }

    // credits LIVE — run smoke tests
    const marid = await fetch(`${SUPABASE_URL}/functions/v1/unified-agents`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SERVICE_KEY}` },
      body: JSON.stringify({ agent: 'marid-campaign-manager' })
    }).then(r => r.json()).catch(e => ({ ok: false, error: String(e) }))

    // sales-engine fire & forget (logs its own run)
    fetch(`${SUPABASE_URL}/functions/v1/unified-agents`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SERVICE_KEY}` },
      body: JSON.stringify({ agent: 'sales-engine' })
    }).catch(() => {})

    const maridOk = !!marid?.ok && !marid?.output?.reel_package_error && !marid?.output?.daily_post_error
    const summary = JSON.stringify(marid?.output || {}).slice(0, 400)

    // marker row → cron self-unschedules on next tick
    await sb.from('system_runbook').insert({
      topic: 'fable5_smoke_done', category: 'ai_models',
      title: 'Post-topup smoke test executed',
      content: `Credits restored ${new Date().toISOString()}. marid-campaign-manager: ${maridOk ? 'SUCCESS' : 'PARTIAL/FAIL'} — ${summary}. sales-engine triggered (see agent_runs).`,
      status: 'active', last_verified_at: new Date().toISOString()
    })
    await sb.from('agent_insights').insert({
      agent_name: 'post-topup-verifier', insight_type: maridOk ? 'milestone' : 'alert',
      title: maridOk ? '✅ الرصيد رجع والـ smoke tests نجحت — البنية الموحدة شغالة بالكامل' : '⚠️ الرصيد رجع لكن smoke test مدير المارد فيه مشكلة',
      description: summary,
      priority: 'high',
      data_points: { marid_output: marid?.output || null, verified_at: new Date().toISOString() },
      recommended_action: maridOk ? 'مفيش — النظام شغال' : 'راجع agent_runs لمدير المارد'
    })
    return json({ ok: true, state: 'smoke_tests_executed', marid_ok: maridOk, marid_output: marid?.output })
  } catch (e) {
    return json({ ok: false, error: String(e).slice(0, 300) })
  }
})

function json(o: Record<string, unknown>): Response {
  return new Response(JSON.stringify(o), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
