// listing-friction-alerter — daily check on listings where visitors
// repeatedly hit the booking page but no booking gets created.
// Saves alerts to admin_alerts table for surfacing in command center.
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

  // Get all listings with friction
  const { data: friction, error } = await sb
    .from('listing_friction')
    .select('*')
    .gte('friction_score', 20)
    .order('friction_score', { ascending: false })
    .limit(30)

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  if (!friction || friction.length === 0) {
    return new Response(JSON.stringify({ ok: true, alerted: 0 }), { headers: { 'Content-Type': 'application/json' } })
  }

  // Group by reason for cleaner alerts
  const byReason: Record<string, Array<Record<string, unknown>>> = {}
  for (const f of friction as Array<Record<string, unknown>>) {
    const reason = (f.friction_reason as string) || 'unknown'
    if (!byReason[reason]) byReason[reason] = []
    byReason[reason].push(f)
  }

  // Resolve old friction alerts of the same type
  await sb.from('admin_alerts').update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('alert_type', 'listing_friction').eq('status', 'unread')

  const critical = friction.filter((f: Record<string, unknown>) => (f.friction_score as number) >= 50)
  const severity = critical.length >= 2 ? 'critical' : critical.length > 0 || friction.length >= 3 ? 'warn' : 'info'

  const reasonLabels: Record<string, string> = {
    listing_not_published: 'ليستينجز موقّفة/مسودة عليها محاولات حجز',
    supplier_not_approved: 'مورد مش approved لـ listings فيها حركة',
    no_pricing_rules: 'listings بدون أسعار وعليها محاولات حجز',
    id_verification_friction: 'ليستينجز عربيات بتطلب بطاقة وفيها abandonment',
    unknown_friction: 'friction غير واضح — محتاج تحقيق',
  }

  const summaryParts: string[] = []
  for (const [reason, items] of Object.entries(byReason)) {
    summaryParts.push(`${items.length} · ${reasonLabels[reason] || reason}`)
  }

  const { data: saved, error: saveErr } = await sb.from('admin_alerts').insert({
    alert_type: 'listing_friction',
    severity,
    title: `${friction.length} listing فيها friction في صفحة الحجز`,
    summary: summaryParts.join(' · '),
    detail: {
      total_listings: friction.length,
      critical_count: critical.length,
      by_reason: byReason,
      top_friction: friction.slice(0, 10),
    },
    action_url: '/admin/command-center#listing-friction',
    agent_name: 'listing-friction-alerter',
    status: 'unread',
  }).select('id').single()

  return new Response(JSON.stringify({
    ok: true,
    alert_id: saved?.id,
    save_error: saveErr?.message,
    severity,
    listings_count: friction.length,
    critical_count: critical.length,
    by_reason: Object.fromEntries(Object.entries(byReason).map(([k, v]) => [k, v.length])),
  }, null, 2), { headers: { 'Content-Type': 'application/json' } })
})
