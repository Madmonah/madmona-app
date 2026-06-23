// drip-campaign-engine — multi-touch follow-up sequence for non-replying leads.
// Runs daily. For each first_outreach lead, sends touches at day 1, 3, 7.
// Stops on reply. Stops after touch 3. Stops on 'dead' or 'do_not_contact'.
//
// Touch 1: 24-72h after initial outreach (gentle nudge)
// Touch 2: 4-6 days after initial (different angle)
// Touch 3: 7-10 days after initial (last call)
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const AGENT_SECRET = Deno.env.get('AGENT_SECRET') || 'c9aade438b57204664c496dcd43ab8a640af5061273abc6591522bf96065d0c7'

Deno.serve(async (req) => {
  const auth = req.headers.get('authorization') || ''
  const agentSecret = req.headers.get('x-agent-secret') || ''
  const vercelCron = req.headers.get('x-vercel-cron')
  const isAuthorized = vercelCron === '1' || agentSecret === AGENT_SECRET || auth.includes(AGENT_SECRET) || auth.includes(SUPABASE_SERVICE_ROLE_KEY)
  if (!isAuthorized) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const log: Array<Record<string, unknown>> = []

  // Read template from config
  let templateName = 'partnership_intro_v2'
  try {
    const { data: cfg } = await sb.from('whatsapp_config').select('value').eq('key', 'default_partnership_template').maybeSingle()
    if (cfg && (cfg as { value: string }).value) templateName = (cfg as { value: string }).value
  } catch (_) { /* default */ }

  // ============================================
  // Touch 1: 24-72h since first outreach, never replied, exactly 1 outbound
  // ============================================
  const touch1 = await findCandidates(sb, {
    min_hours_since_last: 24,
    max_hours_since_last: 72,
    outreach_count: 1,
  })
  log.push({ touch: 1, candidates: touch1.length })

  let touch1Sent = 0
  if (touch1.length > 0) {
    const phones = touch1.map(c => c.phone.replace(/^\+/, ''))
    const res = await sendBulk(phones.slice(0, 50), templateName, 'drip-touch-1')
    touch1Sent = res.sent
    log.push({ touch: 1, sent: touch1Sent })
  }

  // ============================================
  // Touch 2: 4-6 days since initial, never replied, exactly 2 outbound
  // ============================================
  const touch2 = await findCandidates(sb, {
    min_hours_since_last: 24 * 4,
    max_hours_since_last: 24 * 6,
    outreach_count: 2,
  })
  log.push({ touch: 2, candidates: touch2.length })

  let touch2Sent = 0
  if (touch2.length > 0) {
    const phones = touch2.map(c => c.phone.replace(/^\+/, ''))
    const res = await sendBulk(phones.slice(0, 50), templateName, 'drip-touch-2')
    touch2Sent = res.sent
    log.push({ touch: 2, sent: touch2Sent })
  }

  // ============================================
  // Touch 3 (final): 7-10 days, never replied, exactly 3 outbound
  // ============================================
  const touch3 = await findCandidates(sb, {
    min_hours_since_last: 24 * 7,
    max_hours_since_last: 24 * 10,
    outreach_count: 3,
  })
  log.push({ touch: 3, candidates: touch3.length })

  let touch3Sent = 0
  if (touch3.length > 0) {
    const phones = touch3.map(c => c.phone.replace(/^\+/, ''))
    const res = await sendBulk(phones.slice(0, 50), templateName, 'drip-touch-3-final')
    touch3Sent = res.sent
    log.push({ touch: 3, sent: touch3Sent })
  }

  // ============================================
  // Mark leads that have hit 4+ outreach attempts with no reply as 'dead'
  // ============================================
  await sb.rpc('exec', { sql: "" }).then(() => {}, () => {}) // ignore errors

  const deadResult = await sb
    .from('cold_leads')
    .update({ status: 'dead' })
    .in('phone', await getStaleLeadPhones(sb))
    .select('id')
  const markedDead = (deadResult.data || []).length

  return new Response(JSON.stringify({
    ok: true,
    template_used: templateName,
    summary: {
      touch1_sent: touch1Sent,
      touch2_sent: touch2Sent,
      touch3_sent: touch3Sent,
      total_sent: touch1Sent + touch2Sent + touch3Sent,
      marked_dead: markedDead,
    },
    log,
  }, null, 2), { headers: { 'Content-Type': 'application/json' } })
})

// ============================================
// Helpers
// ============================================
async function findCandidates(
  sb: ReturnType<typeof createClient>,
  opts: { min_hours_since_last: number; max_hours_since_last: number; outreach_count: number }
): Promise<Array<{ phone: string; business_name: string }>> {
  const minDate = new Date(Date.now() - opts.max_hours_since_last * 3600 * 1000).toISOString()
  const maxDate = new Date(Date.now() - opts.min_hours_since_last * 3600 * 1000).toISOString()

  // Read leads from intelligence view with proper outreach count + no inbound
  const { data } = await sb
    .from('lead_intelligence_view')
    .select('phone, business_name, outreach_count, last_contacted, last_inbound_at, score')
    .eq('outreach_count', opts.outreach_count)
    .is('last_inbound_at', null)
    .gte('last_contacted', minDate)
    .lte('last_contacted', maxDate)
    .gte('score', 30)
    .limit(100)

  return ((data as Array<{ phone: string; business_name: string }>) || [])
}

async function getStaleLeadPhones(sb: ReturnType<typeof createClient>): Promise<string[]> {
  // Leads with 4+ outreach, no inbound, last contacted > 14 days ago
  const cutoff = new Date(Date.now() - 14 * 86400 * 1000).toISOString()
  const { data } = await sb
    .from('lead_intelligence_view')
    .select('phone')
    .gte('outreach_count', 4)
    .is('last_inbound_at', null)
    .lte('last_contacted', cutoff)
    .limit(100)
  return ((data as Array<{ phone: string }>) || []).map(d => d.phone)
}

async function sendBulk(phones: string[], templateName: string, agentName: string): Promise<{ sent: number }> {
  if (phones.length === 0) return { sent: 0 }
  const r = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-bulk-template`, {
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
      agent_name: agentName,
    })
  })
  const d = await r.json()
  return { sent: d.sent || 0 }
}
