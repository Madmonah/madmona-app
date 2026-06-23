// supplier-acquisition-cron v2 — reads default template name from whatsapp_config
// 1. Scrape OLX (28 URLs in 3 batches)
// 2. Send default template to all new fresh leads
// 3. Send follow-up to 24h-old leads who haven't replied

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const AGENT_SECRET = Deno.env.get('AGENT_SECRET') || 'c9aade438b57204664c496dcd43ab8a640af5061273abc6591522bf96065d0c7'
const BASE = SUPABASE_URL

Deno.serve(async (req) => {
  const cronAuth = req.headers.get('authorization')
  const vercelCron = req.headers.get('x-vercel-cron')
  const agentSecret = req.headers.get('x-agent-secret')
  const isAuthorized = vercelCron === '1' || agentSecret === AGENT_SECRET || (cronAuth && cronAuth.includes(AGENT_SECRET))
  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const log: Array<Record<string, unknown>> = []
  const startTime = Date.now()

  // Read default template name from config (auto-flips to AI version when approved)
  let defaultTemplate = 'partnership_intro_v2'
  try {
    const { data: cfg } = await sb
      .from('whatsapp_config')
      .select('value')
      .eq('key', 'default_partnership_template')
      .maybeSingle()
    if (cfg && (cfg as { value: string }).value) {
      defaultTemplate = (cfg as { value: string }).value
    }
  } catch (e) {
    log.push({ step: 'read_default_template', error: e instanceof Error ? e.message : 'unknown' })
  }
  log.push({ step: 'using_template', name: defaultTemplate })

  // ============== STEP 1: Scrape OLX (3 batches) ==============
  let totalScraped = 0
  let totalInserted = 0
  for (let start = 0; start < 28; start += 10) {
    try {
      const r = await fetch(`${BASE}/functions/v1/olx-scraper?start=${start}&count=10`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` }
      })
      const data = await r.json()
      totalScraped += data.total_extracted || 0
      totalInserted += data.total_inserted || 0
      log.push({ step: `scrape_batch_${start}`, ok: r.ok, extracted: data.total_extracted, inserted: data.total_inserted })
    } catch (e) {
      log.push({ step: `scrape_batch_${start}`, ok: false, error: e instanceof Error ? e.message : 'unknown' })
    }
  }

  // ============== STEP 2: Send template to fresh leads ==============
  const { data: freshLeads } = await sb
    .from('cold_leads')
    .select('phone')
    .eq('status', 'new')
    .not('phone', 'is', null)
    .limit(100)

  const phones = (freshLeads || []).map((l: { phone: string }) => l.phone.replace(/^\+/, '')).filter(Boolean)
  let outreachSent = 0
  if (phones.length > 0) {
    try {
      const r = await fetch(`${BASE}/functions/v1/whatsapp-bulk-template`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'x-agent-secret': AGENT_SECRET,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phones,
          template_name: defaultTemplate,
          param1: 'حضرتك',
          agent_name: 'daily-auto-outreach'
        })
      })
      const data = await r.json()
      outreachSent = data.sent || 0
      log.push({ step: 'fresh_outreach', template: defaultTemplate, total: phones.length, sent: outreachSent })
    } catch (e) {
      log.push({ step: 'fresh_outreach', error: e instanceof Error ? e.message : 'unknown' })
    }
  }

  // ============== STEP 3: Follow-up for 24h-old non-replied leads ==============
  const { data: stale } = await sb.rpc('find_followup_candidates', { hours_min: 24, hours_max: 72 }).then(
    (res) => res,
    async () => {
      const { data } = await sb
        .from('whatsapp_conversations')
        .select('id, contact_phone, last_outbound_at, last_inbound_at, message_count')
        .gte('last_outbound_at', new Date(Date.now() - 72 * 3600 * 1000).toISOString())
        .lte('last_outbound_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString())
        .is('last_inbound_at', null)
        .eq('agent_name', 'bulk-supplier-outreach')
        .limit(50)
      return { data }
    }
  )

  const stalePhones = ((stale as Array<{ contact_phone: string }>) || []).map(s => s.contact_phone.replace(/^\+/, ''))
  let followupSent = 0
  if (stalePhones.length > 0) {
    try {
      const r = await fetch(`${BASE}/functions/v1/whatsapp-bulk-template`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'x-agent-secret': AGENT_SECRET,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phones: stalePhones,
          template_name: defaultTemplate,
          param1: 'حضرتك',
          agent_name: 'daily-followup'
        })
      })
      const data = await r.json()
      followupSent = data.sent || 0
      log.push({ step: 'stale_followup', template: defaultTemplate, total: stalePhones.length, sent: followupSent })
    } catch (e) {
      log.push({ step: 'stale_followup', error: e instanceof Error ? e.message : 'unknown' })
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000)
  return new Response(JSON.stringify({
    ok: true,
    elapsed_sec: elapsed,
    template_used: defaultTemplate,
    summary: {
      scraped_total: totalScraped,
      scraped_new: totalInserted,
      outreach_sent: outreachSent,
      followup_sent: followupSent
    },
    log
  }, null, 2), { headers: { 'Content-Type': 'application/json' } })
})
