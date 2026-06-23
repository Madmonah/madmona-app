// hot-leads-now — returns the highest-priority leads with suggested actions.
// GET params: limit (default 50), action (filter by suggested_action), tier (filter by priority_tier)
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200)
  const action = url.searchParams.get('action')
  const tier = url.searchParams.get('tier')
  const category = url.searchParams.get('category')

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  let q = sb.from('lead_intelligence_view').select('*').order('score', { ascending: false })
  if (action) q = q.eq('suggested_action', action)
  if (tier) q = q.eq('priority_tier', tier)
  if (category) q = q.eq('category', category)
  q = q.limit(limit)

  const { data, error } = await q
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }

  // Aggregate stats for the response header
  const { data: stats } = await sb.from('lead_intelligence_view').select('priority_tier, suggested_action')
  const tiers: Record<string, number> = {}
  const actions: Record<string, number> = {}
  for (const r of (stats as Array<{ priority_tier: string; suggested_action: string }>) || []) {
    tiers[r.priority_tier] = (tiers[r.priority_tier] || 0) + 1
    actions[r.suggested_action] = (actions[r.suggested_action] || 0) + 1
  }

  return new Response(JSON.stringify({
    ok: true,
    count: (data || []).length,
    stats: {
      by_tier: tiers,
      by_action: actions,
      total_leads: (stats || []).length,
    },
    leads: data,
    generated_at: new Date().toISOString(),
  }, null, 2), { headers: { 'Content-Type': 'application/json' } })
})
