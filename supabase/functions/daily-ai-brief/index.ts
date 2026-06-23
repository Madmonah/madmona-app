// daily-ai-brief v3 — now includes admin_alerts (abandoned bookings, etc.)
// and visitor intelligence findings.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CLAUDE_MODEL = 'claude-sonnet-4-6'

Deno.serve(async (_req) => {
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // 1. Command center stats
  const ccRes = await fetch(`${SUPABASE_URL}/functions/v1/ceo-command-center`, {
    headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` }
  })
  const cc = await ccRes.json()

  // 2. Top critical leads
  const { data: topLeads } = await sb
    .from('lead_intelligence_view')
    .select('business_name, phone, category, score, priority_tier, suggested_action')
    .eq('priority_tier', 'critical')
    .order('score', { ascending: false })
    .limit(5)

  // 3. Open admin_alerts (NEW)
  const { data: openAlerts } = await sb
    .from('admin_alerts')
    .select('alert_type, severity, title, summary, detail')
    .eq('status', 'unread')
    .order('created_at', { ascending: false })
    .limit(10)

  // 4. High-intent visitors who abandoned booking
  const { data: highIntent } = await sb
    .from('visitor_intelligence')
    .select('visitor_id, intent_score, behavior_pattern, booking_attempts, unique_listings_viewed, last_seen')
    .gte('intent_score', 50)
    .gte('last_seen', new Date(Date.now() - 7 * 86400 * 1000).toISOString())
    .order('intent_score', { ascending: false })
    .limit(5)

  // 5. Yesterday comparison
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const { count: yesterdayMsgs } = await sb
    .from('whatsapp_outbound_queue').select('*', { count: 'exact', head: true })
    .eq('status', 'sent')
    .gte('sent_at', yesterday + 'T00:00:00Z')
    .lt('sent_at', yesterday + 'T23:59:59Z')

  // 6. Anomalies
  const anomalies: string[] = []
  if ((cc.alerts?.messages_failed || 0) > 10) anomalies.push(`${cc.alerts.messages_failed} رسالة فشلت في 24 ساعة`)
  if ((cc.alerts?.queue_backlog || 0) > 50) anomalies.push(`${cc.alerts.queue_backlog} رسالة backlog`)
  if ((cc.alerts?.fraud_open || 0) > 30) anomalies.push(`${cc.alerts.fraud_open} fraud alert مفتوح`)
  if (cc.revenue?.bookings_30d === 0) anomalies.push('❗ صفر bookings 30 يوم — الـ booking flow مكسور')
  if ((highIntent || []).length > 0) {
    const topI = (highIntent as Array<Record<string, unknown>>)[0]
    if ((topI.booking_attempts as number) > 3) {
      anomalies.push(`❗ visitor بـ ${topI.booking_attempts} محاولة حجز فشلت كلها — bug في الـ booking page`)
    }
  }

  const { data: keyData } = await sb.rpc('get_anthropic_key')
  if (!keyData) return new Response(JSON.stringify({ error: 'no_api_key' }), { status: 500 })

  const promptContext = {
    kpis: cc.headline,
    funnel: {
      total_leads: cc.leads?.total,
      hot_now: cc.headline?.hot_leads_now,
      conv_reply_rate: cc.conversations?.reply_rate_pct,
      bookings_30d: cc.revenue?.bookings_30d,
      revenue_30d: cc.revenue?.revenue_30d_egp,
    },
    high_intent_abandoners: highIntent,
    open_admin_alerts: openAlerts,
    yesterday_msgs: yesterdayMsgs || 0,
    today_msgs_so_far: cc.headline?.messages_sent_24h,
    top_critical_leads: topLeads?.slice(0, 3).map(l => ({
      name: l.business_name, category: l.category, score: l.score
    })) || [],
    anomalies,
  }

  const system = `أنت Strategic Advisor لـ Mohamed (CEO مضمونة). Egyptian Arabic colloquial. مختصر (~150 كلمة).

Reply with JSON only:
{
  "one_liner": "...",
  "good_news": ["3 nuggets"],
  "concerns": ["2-3 أهم مشاكل"],
  "top_3_priorities": [{"action": "...", "why": "...", "urgency": "high|medium|low"}, ...],
  "growth_opportunities": [{"area": "...", "insight": "..."}, ...],
  "full_brief_markdown": "..."
}

IMPORTANT: لو فيه visitor بـ booking_attempts > 3 ، إعتبرها #1 urgent issue. تحدث عنها بوضوح.
أسلوب تجاري · جريء · واقعي.`

  const userMsg = `Data:\n${JSON.stringify(promptContext, null, 2)}`

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': keyData as string, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 2000, system, messages: [{ role: 'user', content: userMsg }] })
  })

  if (!r.ok) return new Response(JSON.stringify({ error: 'claude_error', detail: (await r.text()).slice(0, 300) }), { status: 500 })

  const data = await r.json()
  const text = data?.content?.[0]?.text || ''
  const match = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim().match(/\{[\s\S]*\}/)
  if (!match) return new Response(JSON.stringify({ error: 'parse_failed', raw: text.slice(0, 500) }), { status: 500 })
  const parsed = JSON.parse(match[0])

  const today = new Date().toISOString().slice(0, 10)
  await sb.from('ceo_briefs').delete().eq('brief_date', today)

  const { data: saved, error: saveErr } = await sb.from('ceo_briefs').insert({
    brief_date: today,
    one_liner: parsed.one_liner,
    good_news: parsed.good_news || [],
    concerns: parsed.concerns || [],
    top_3_priorities: parsed.top_3_priorities || [],
    growth_opportunities: parsed.growth_opportunities || [],
    full_brief_html: parsed.full_brief_markdown || '',
    revenue_today: 0,
    bookings_today: cc.revenue?.bookings_30d || 0,
    ai_actions_today: cc.activity_24h?.ai_replies || 0,
    agent_name: 'daily-ai-brief-v3',
    email_sent: false,
  }).select('id').single()

  return new Response(JSON.stringify({
    ok: true, brief_id: saved?.id, save_error: saveErr?.message, brief: parsed,
  }, null, 2), { headers: { 'Content-Type': 'application/json' } })
})
