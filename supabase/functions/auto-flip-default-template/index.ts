// auto-flip-default-template — polls Meta for the candidate template status.
// When candidate is APPROVED, flips default_partnership_template to it.
// Safe to run hourly. Idempotent: if already flipped, no-op.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const AGENT_SECRET = Deno.env.get('AGENT_SECRET') || 'c9aade438b57204664c496dcd43ab8a640af5061273abc6591522bf96065d0c7'
const ADMIN_PHONE = '+201002229982'

Deno.serve(async (req) => {
  const vercelCron = req.headers.get('x-vercel-cron')
  const agentSecret = req.headers.get('x-agent-secret')
  const cronAuth = req.headers.get('authorization')
  const isAuthorized = vercelCron === '1' || agentSecret === AGENT_SECRET || (cronAuth && cronAuth.includes(AGENT_SECRET))
  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const log: Array<Record<string, unknown>> = []

  // Read current config
  const { data: cfgRows } = await sb
    .from('whatsapp_config')
    .select('key, value')
    .in('key', ['default_partnership_template', 'next_partnership_template_candidate', 'access_token', 'waba_id'])

  const cfg = Object.fromEntries((cfgRows || []).map((r: { key: string; value: string }) => [r.key, r.value]))
  const current = cfg.default_partnership_template
  const candidate = cfg.next_partnership_template_candidate
  const accessToken = cfg.access_token
  const wabaId = cfg.waba_id

  if (!current || !candidate || !accessToken || !wabaId) {
    return new Response(JSON.stringify({ ok: false, error: 'missing config', cfg: { current, candidate, has_token: !!accessToken, has_waba: !!wabaId } }), { status: 500 })
  }

  if (current === candidate) {
    return new Response(JSON.stringify({ ok: true, status: 'already_flipped', current, candidate }), { headers: { 'Content-Type': 'application/json' } })
  }

  // Query Meta for candidate template status
  let candidateStatus = 'UNKNOWN'
  try {
    const url = `https://graph.facebook.com/v21.0/${wabaId}/message_templates?name=${encodeURIComponent(candidate)}&fields=name,status,category`
    const r = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } })
    const data = await r.json()
    const tmpl = (data?.data || []).find((t: { name: string }) => t.name === candidate)
    candidateStatus = tmpl?.status || 'NOT_FOUND'
    log.push({ step: 'meta_check', candidate, status: candidateStatus })
  } catch (e) {
    log.push({ step: 'meta_check', error: e instanceof Error ? e.message : 'unknown' })
    return new Response(JSON.stringify({ ok: false, error: 'meta_check_failed', log }), { status: 500 })
  }

  // Update tracking config regardless
  await sb.from('whatsapp_config').upsert([
    { key: `template_${candidate}_status`, value: candidateStatus },
    { key: `template_${candidate}_last_polled`, value: new Date().toISOString() },
  ])

  if (candidateStatus !== 'APPROVED') {
    return new Response(JSON.stringify({ ok: true, status: 'pending', candidate, candidate_status: candidateStatus, current, log }), { headers: { 'Content-Type': 'application/json' } })
  }

  // APPROVED — flip!
  await sb.from('whatsapp_config').upsert([
    { key: 'default_partnership_template', value: candidate, description: `Auto-flipped to AI version on ${new Date().toISOString()}. Previous: ${current}` },
    { key: 'previous_partnership_template', value: current },
    { key: 'last_template_flip_at', value: new Date().toISOString() },
  ])

  // Notify admin of the flip via queue (will pass through DB-level block since campaign is not admin_*)
  await sb.from('whatsapp_outbound_queue').insert({
    recipient_phone: ADMIN_PHONE,
    recipient_name: 'مدير مضمونة',
    message: `✅ *Template flip complete*\n\nMeta approved \`${candidate}\` — it is now the default cold outreach template.\n\nPrevious: ${current}\nNew: ${candidate}\nFlipped at: ${new Date().toISOString()}\n\nAll new outreach (incl. tomorrow 6 AM UTC cron) will use the AI-positioned message.`,
    status: 'pending',
    scheduled_at: new Date().toISOString(),
    agent_name: 'template_flip_notifier',
    campaign: 'system_template_lifecycle',
    metadata: { previous: current, new: candidate, flipped_at: new Date().toISOString() }
  })

  log.push({ step: 'flipped', from: current, to: candidate })
  return new Response(JSON.stringify({
    ok: true,
    status: 'flipped',
    previous: current,
    new_default: candidate,
    log
  }), { headers: { 'Content-Type': 'application/json' } })
})
