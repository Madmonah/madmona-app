// bulk-outreach-top-leads — send the approved template to the top N
// leads currently flagged as 'first_outreach' or 'followup_high_priority'.
// POST { limit?, action? }
//   limit: how many to send (default 20, max 100)
//   action: which suggested_action to target (default 'first_outreach')
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const AGENT_SECRET = Deno.env.get('AGENT_SECRET') || 'c9aade438b57204664c496dcd43ab8a640af5061273abc6591522bf96065d0c7'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 })
  const body = await req.json().catch(() => ({}))
  const limit = Math.min(parseInt(body.limit || '20'), 100)
  const action = body.action || 'first_outreach'
  const minScore = parseInt(body.min_score || '50')

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Read default template from config (auto-flips when AI version is approved)
  let templateName = 'partnership_intro_v2'
  try {
    const { data: cfg } = await sb.from('whatsapp_config').select('value').eq('key', 'default_partnership_template').maybeSingle()
    if (cfg && (cfg as { value: string }).value) templateName = (cfg as { value: string }).value
  } catch (_) { /* keep default */ }

  // Pull top leads matching the action filter
  const { data: leads, error } = await sb
    .from('lead_intelligence_view')
    .select('phone, business_name, category, score')
    .eq('suggested_action', action)
    .gte('score', minScore)
    .order('score', { ascending: false })
    .limit(limit)

  if (error) return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  if (!leads || leads.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0, message: 'no_eligible_leads', filter: { action, min_score: minScore } }, null, 2), { headers: { 'Content-Type': 'application/json' } })
  }

  const phones = (leads as Array<{ phone: string }>).map(l => l.phone.replace(/^\+/, '')).filter(Boolean)

  // Hand off to the bulk template sender
  const sendRes = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-bulk-template`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'x-agent-secret': AGENT_SECRET,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      phones,
      template_name: templateName,
      param1: 'حضرتك',
      agent_name: 'command-center-bulk-outreach'
    })
  })

  const sendData = await sendRes.json()
  const sent = sendData.sent || 0

  return new Response(JSON.stringify({
    ok: true,
    template_used: templateName,
    eligible: leads.length,
    sent,
    failed: phones.length - sent,
    filter: { action, min_score: minScore },
    leads: (leads as Array<{ business_name: string; phone: string; category: string; score: number }>).map(l => ({
      name: l.business_name, phone: l.phone, category: l.category, score: l.score
    })),
    raw: sendData,
  }, null, 2), { headers: { 'Content-Type': 'application/json' } })
})
