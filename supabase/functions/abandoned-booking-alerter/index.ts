// abandoned-booking-alerter v2 — saves to admin_alerts table (not WhatsApp,
// since admin WhatsApp alerts are blocked by Meta #100 freeform window).
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

  const { data: visitors } = await sb
    .from('visitor_intelligence')
    .select('visitor_id, intent_score, behavior_pattern, unique_listings_viewed, booking_attempts, auth_visits, last_seen, sessions, from_paid_ad, from_facebook')
    .gte('intent_score', 50)
    .gte('last_seen', new Date(Date.now() - 7 * 86400 * 1000).toISOString())
    .order('intent_score', { ascending: false })
    .limit(30)

  if (!visitors || visitors.length === 0) {
    return new Response(JSON.stringify({ ok: true, alerted: 0 }), { headers: { 'Content-Type': 'application/json' } })
  }

  // Enrich each visitor
  const enriched = await Promise.all(visitors.map(async (v: Record<string, unknown>) => {
    const { data: signupEvents } = await sb
      .from('site_events').select('page_url').eq('visitor_id', v.visitor_id)
      .like('page_url', '%phone=%').limit(1).maybeSingle()

    let phone: string | null = null
    if (signupEvents) {
      const m = ((signupEvents as { page_url: string }).page_url || '').match(/phone=([^&]+)/)
      if (m) phone = decodeURIComponent(m[1])
    }

    let profile: Record<string, unknown> | null = null
    if (phone) {
      const { data: p } = await sb.from('profiles').select('id, full_name, phone, role').eq('phone', phone).maybeSingle()
      profile = p as Record<string, unknown> | null
    }

    const { data: bookingEvents } = await sb
      .from('site_events').select('page_url, created_at').eq('visitor_id', v.visitor_id)
      .or('page_url.ilike.%book,page_url.ilike.%reserve%')
      .order('created_at', { ascending: false }).limit(5)

    const attemptedListings = ((bookingEvents as Array<{ page_url: string }>) || [])
      .map(b => {
        const m = b.page_url.match(/\/marketplace\/(listing-[a-z0-9-]+)\/book/)
        return m ? m[1] : null
      }).filter(Boolean) as string[]

    return { ...v, phone, profile, attempted_listings: [...new Set(attemptedListings)] }
  }))

  const critical = enriched.filter((v: Record<string, unknown>) => (v.intent_score as number) >= 70)
  const reachable = enriched.filter((v: Record<string, unknown>) => v.phone)

  // Always upsert a single "current state" alert
  // Resolve any older alerts of same type
  await sb.from('admin_alerts').update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('alert_type', 'abandoned_booking').eq('status', 'unread')

  const severity = critical.length >= 3 ? 'critical' : critical.length > 0 ? 'warn' : 'info'
  const title = `${enriched.length} high-intent visitor حاولوا يحجزوا وفشلوا`
  const topName = (enriched[0] as Record<string, unknown>)?.profile
    ? ((enriched[0] as Record<string, unknown>).profile as { full_name: string }).full_name
    : 'visitor'
  const summary = critical.length > 0
    ? `⏬ ${critical.length} واحد بـ intent عالي (أمثل ${topName} بـ ${(enriched[0] as Record<string, unknown>)?.booking_attempts || 0} محاولة حجز) · ${reachable.length}/${enriched.length} معاهم رقم تليفون`
    : `${enriched.length} visitor abandoned booking flow`

  const { data: saved, error: saveErr } = await sb.from('admin_alerts').insert({
    alert_type: 'abandoned_booking',
    severity,
    title,
    summary,
    detail: {
      visitor_count: enriched.length,
      critical_count: critical.length,
      reachable_count: reachable.length,
      top_visitors: enriched.slice(0, 10),
    },
    action_url: '/admin/command-center#high-intent',
    agent_name: 'abandoned-booking-alerter-v2',
    status: 'unread',
  }).select('id').single()

  return new Response(JSON.stringify({
    ok: true,
    alert_id: saved?.id,
    save_error: saveErr?.message,
    severity,
    high_intent_count: enriched.length,
    critical_count: critical.length,
    reachable_count: reachable.length,
    top_visitors: enriched.slice(0, 5).map((v: Record<string, unknown>) => ({
      visitor_id: v.visitor_id,
      intent_score: v.intent_score,
      booking_attempts: v.booking_attempts,
      phone: v.phone,
      profile_name: (v.profile as { full_name?: string } | null)?.full_name,
      attempted_listings: v.attempted_listings,
    })),
  }, null, 2), { headers: { 'Content-Type': 'application/json' } })
})
