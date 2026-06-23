// demand-forecast-brief — daily AI brief on marketplace demand and pricing
// Aggregates category_demand_view + listing_pricing_outliers and asks Claude
// to write 3-bullet recommendations for the founder.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const AGENT_SECRET = Deno.env.get('AGENT_SECRET') || 'c9aade438b57204664c496dcd43ab8a640af5061273abc6591522bf96065d0c7'
const CLAUDE_MODEL = 'claude-sonnet-4-6'

Deno.serve(async (req) => {
  const auth = req.headers.get('authorization') || ''
  const agentSecret = req.headers.get('x-agent-secret') || ''
  const vercelCron = req.headers.get('x-vercel-cron')
  if (!(vercelCron === '1' || agentSecret === AGENT_SECRET || auth.includes(AGENT_SECRET) || auth.includes(SUPABASE_SERVICE_ROLE_KEY))) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Pull the demand signals
  const { data: demand } = await sb.from('category_demand_view')
    .select('name_ar, opportunity_tier, listings_published, unique_visitors_30d, booking_attempts_30d, confirmed_bookings_30d, demand_score, visitors_per_listing')
    .order('demand_score', { ascending: false }).limit(25)

  // Pull pricing outliers — exclude DEMO listings (noise from synthetic data)
  const { data: outliers } = await sb.from('listing_pricing_outliers')
    .select('title, slug, category_name, listing_price, category_avg, price_z_score, pricing_flag, peer_count')
    .not('title', 'ilike', 'DEMO%')
    .in('pricing_flag', ['severely_overpriced', 'severely_underpriced', 'overpriced', 'underpriced'])
    .order('price_z_score', { ascending: false, nullsFirst: false })
    .limit(20)

  // Get marketplace totals
  const { count: totalListings } = await sb.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'published')
  const { count: totalSuppliers } = await sb.from('marketplace_suppliers').select('*', { count: 'exact', head: true }).eq('kyc_status', 'approved')

  const { data: apiKey } = await sb.rpc('get_anthropic_key')
  if (!apiKey) return new Response(JSON.stringify({ error: 'no_api_key' }), { status: 500 })

  const shortages = (demand || []).filter((d: Record<string, unknown>) => ['critical_shortage', 'shortage', 'high_interest'].includes(d.opportunity_tier as string))
  const overpricedReal = (outliers || []).filter((o: Record<string, unknown>) => ['severely_overpriced', 'overpriced'].includes(o.pricing_flag as string))
  const underpricedReal = (outliers || []).filter((o: Record<string, unknown>) => ['severely_underpriced', 'underpriced'].includes(o.pricing_flag as string))

  const system = `أنت marketplace analyst لـ مضمونة (madmonacairo.com). تدي لمحمد توصيات action-oriented على بيانات الـ demand والـ pricing.
الأسلوب: عامية مصرية · مباشر · صريح · لا مبالغة.
تفرق بين noise و signal: اللستينجات DEMO مضبوطة (سينثتيك)، واللي غير كده حقيقي.

JSON only, no markdown fences:
{
  "one_liner": "سطر واحد يلخص الحالة",
  "top_opportunities": [
    { "category": "الفئة", "signal": "ايه اللي لاحظته", "action": "ايه يعمل محمد الأسبوع ده" },
    … (أعلى 3 فرص)
  ],
  "pricing_alerts": [
    { "listing": "اسم اللستينج", "issue": "ايه المشكلة", "action": "ايه الإجراء المقترح" },
    … (أعلى 2-3 تنبيهات)
  ],
  "strategic_note": "تعليق إستراتيجي واحد عن السوق الجدول 30 يوم · لو في باترن أو استنتاج مهم"
}`

  const userMsg = `الماركتبليس دلوقتي:
- ${totalListings} listing published · ${totalSuppliers} supplier approved

Demand signals (أعلى ${demand?.length || 0} فئة بـ demand):
${JSON.stringify(demand?.slice(0, 15), null, 2)}

Shortage / high-interest categories (${shortages.length}):
${JSON.stringify(shortages, null, 2)}

Pricing outliers — غير DEMO (${overpricedReal.length} overpriced, ${underpricedReal.length} underpriced):
${JSON.stringify((outliers || []).slice(0, 10), null, 2)}

صيغ brief.`

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey as string, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 2000, system, messages: [{ role: 'user', content: userMsg }] })
  })
  if (!r.ok) return new Response(JSON.stringify({ error: 'claude_error', detail: (await r.text()).slice(0, 300) }), { status: 500 })

  const data = await r.json()
  const text = data?.content?.[0]?.text || ''
  const match = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim().match(/\{[\s\S]*\}/)
  if (!match) return new Response(JSON.stringify({ error: 'parse_failed', raw: text.slice(0, 500) }), { status: 500 })

  let parsed
  try { parsed = JSON.parse(match[0]) }
  catch (e) { return new Response(JSON.stringify({ error: 'json_parse_failed', detail: String(e) }), { status: 500 }) }

  // Resolve any prior unread demand briefs
  await sb.from('admin_alerts').update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('alert_type', 'demand_forecast').eq('status', 'unread')

  // Save new one
  const { data: saved } = await sb.from('admin_alerts').insert({
    alert_type: 'demand_forecast',
    severity: shortages.length > 0 ? 'warn' : 'info',
    title: `🔮 Brief demand & pricing · ${new Date().toISOString().split('T')[0]}`,
    summary: parsed.one_liner || 'بريف دلوقتي',
    detail: {
      ...parsed,
      _raw_data: {
        demand_top_5: (demand || []).slice(0, 5),
        shortages,
        overpriced_real: overpricedReal.slice(0, 5),
        underpriced_real: underpricedReal.slice(0, 5),
      }
    },
    action_url: '/admin/command-center',
    agent_name: 'demand-forecast-brief',
    status: 'unread',
  }).select('id').single()

  return new Response(JSON.stringify({
    ok: true, alert_id: saved?.id, ...parsed,
  }, null, 2), { headers: { 'Content-Type': 'application/json' } })
})
