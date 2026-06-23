// agent-slow: 3 أجينتس بطيئة بتستخدم tool_use
// strategy-agent · partnership-scout · listing-optimizer

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey'
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SONNET = 'claude-sonnet-4-6'
const HAIKU = 'claude-haiku-4-5-20251001'

const sb = () => createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

let cachedKey: string | null = null
async function getApiKey(): Promise<string> {
  if (cachedKey) return cachedKey
  const { data, error } = await sb().rpc('get_anthropic_key')
  if (error || !data) throw new Error('Anthropic key missing: ' + (error?.message || 'empty'))
  cachedKey = data as string
  return cachedKey
}

interface ToolOpts {
  systemPrompt: string
  userMessage: string
  toolName: string
  toolDescription: string
  schema: Record<string, unknown>
  maxTokens?: number
  model?: 'sonnet' | 'haiku'
  timeoutMs?: number
}

async function callClaudeWithTool<T = Record<string, unknown>>(opts: ToolOpts): Promise<T> {
  const apiKey = await getApiKey()
  const { systemPrompt, userMessage, toolName, toolDescription, schema,
          maxTokens = 8192, model = 'sonnet', timeoutMs = 120000 } = opts
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: ctrl.signal,
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model === 'haiku' ? HAIKU : SONNET,
        max_tokens: maxTokens, system: systemPrompt,
        tools: [{ name: toolName, description: toolDescription, input_schema: schema }],
        tool_choice: { type: 'tool', name: toolName },
        messages: [{ role: 'user', content: userMessage }]
      })
    })
    const data = await r.json()
    if (!r.ok) throw new Error(`Claude ${r.status}: ${JSON.stringify(data).slice(0, 300)}`)
    const tool = data?.content?.find((b: { type: string }) => b.type === 'tool_use')
    if (!tool?.input) throw new Error(`No tool_use (stop_reason: ${data?.stop_reason})`)
    return tool.input as T
  } finally { clearTimeout(timer) }
}

async function logRun(agentName: string, status: string, output: Record<string, unknown> = {}, errorMsg?: string, durationMs = 0) {
  await sb().from('agent_runs').insert({
    agent_name: agentName, trigger_type: 'edge_function', status,
    started_at: new Date(Date.now() - durationMs).toISOString(),
    finished_at: new Date().toISOString(),
    duration_ms: durationMs, output_summary: output, error_message: errorMsg ?? null
  })
  try { await sb().rpc('mark_agent_ran', { p_agent_name: agentName, p_success: status === 'success' }) } catch {}
}

async function runStrategyAgent(): Promise<Record<string, unknown>> {
  const [suppliers, listings, bookings, leads] = await Promise.all([
    sb().from('marketplace_suppliers').select('id', { count: 'exact', head: true }).eq('kyc_status', 'approved'),
    sb().from('listings').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    sb().from('marketplace_bookings').select('total_amount').gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
    sb().from('cold_leads').select('id', { count: 'exact', head: true })
  ])
  
  const monthRev = (bookings.data || []).reduce((s: number, b: { total_amount: number | null }) => s + (b.total_amount || 0), 0)
  
  type Plays = { plays: Array<{ play_type: string; title: string; hypothesis: string; expected_impact: string; effort_level: 'low'|'medium'|'high'; steps: string[]; required_resources: string[]; success_metrics: string[]; priority: 'high'|'medium'|'low' }> }
  
  const result = await callClaudeWithTool<Plays>({
    systemPrompt: `أنت Strategy Agent لـ Madmona (منصة إيجار في مصر). اقترح 3 strategic plays للأسبوع الجاي بناءً على البيانات. ركز على نمو الـ suppliers والـ bookings.`,
    userMessage: JSON.stringify({ approved_suppliers: suppliers.count || 0, active_listings: listings.count || 0, month_revenue: monthRev, month_bookings: bookings.data?.length || 0, total_cold_leads: leads.count || 0 }),
    toolName: 'submit_strategy_plays', toolDescription: 'Submit 3 strategic plays',
    maxTokens: 8192, model: 'sonnet', timeoutMs: 120000,
    schema: { type: 'object', properties: { plays: { type: 'array', minItems: 1, maxItems: 5, items: { type: 'object', properties: { play_type: { type: 'string' }, title: { type: 'string' }, hypothesis: { type: 'string' }, expected_impact: { type: 'string' }, effort_level: { type: 'string', enum: ['low','medium','high'] }, steps: { type: 'array', items: { type: 'string' } }, required_resources: { type: 'array', items: { type: 'string' } }, success_metrics: { type: 'array', items: { type: 'string' } }, priority: { type: 'string', enum: ['high','medium','low'] } }, required: ['play_type','title','hypothesis','expected_impact','effort_level','steps','priority'] } } }, required: ['plays'] }
  })
  
  let inserted = 0
  for (const play of result.plays) {
    try {
      await sb().from('strategy_plays').insert({
        play_type: play.play_type, title: play.title,
        hypothesis: play.hypothesis, expected_impact: play.expected_impact,
        effort_level: play.effort_level, steps: play.steps,
        required_resources: play.required_resources || [],
        success_metrics: play.success_metrics || [],
        status: 'proposed', priority: play.priority,
        agent_name: 'strategy-agent'
      })
      inserted++
    } catch (e) { console.error('Strategy insert failed:', e) }
  }
  
  return { plays_proposed: inserted, total: result.plays.length }
}

async function runPartnershipScout(): Promise<Record<string, unknown>> {
  const { data: existing } = await sb()
    .from('partnership_opportunities').select('partner_name')
    .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()).limit(50)
  
  const existingNames = new Set((existing || []).map((p: { partner_name: string }) => p.partner_name?.toLowerCase()))
  
  type Opps = { opportunities: Array<{ partner_type: string; partner_name: string; partner_handle: string; partner_size: string; opportunity_summary: string; pitch_angle: string; potential_value: string; effort_level: 'low'|'medium'|'high'; priority: 'high'|'medium'|'low'; outreach_message: string }> }
  
  const result = await callClaudeWithTool<Opps>({
    systemPrompt: `أنت Partnership Scout لـ Madmona (إيجار في مصر). دور على فرص شراكات. شركات إيجار، influencers، corporate clients، content creators. اقترح 3 فرص جديدة. تجنب الأسماء دي: ${Array.from(existingNames).slice(0, 20).join(', ')}`,
    userMessage: 'Generate 3 fresh partnership opportunities for Madmona Egypt rental platform.',
    toolName: 'submit_partnerships', toolDescription: 'Submit 3 partnership opportunities',
    maxTokens: 8192, model: 'sonnet', timeoutMs: 120000,
    schema: { type: 'object', properties: { opportunities: { type: 'array', minItems: 1, maxItems: 5, items: { type: 'object', properties: { partner_type: { type: 'string' }, partner_name: { type: 'string' }, partner_handle: { type: 'string' }, partner_size: { type: 'string', enum: ['micro','small','medium','large'] }, opportunity_summary: { type: 'string' }, pitch_angle: { type: 'string' }, potential_value: { type: 'string' }, effort_level: { type: 'string', enum: ['low','medium','high'] }, priority: { type: 'string', enum: ['high','medium','low'] }, outreach_message: { type: 'string' } }, required: ['partner_type','partner_name','opportunity_summary','pitch_angle','priority','outreach_message'] } } }, required: ['opportunities'] }
  })
  
  let inserted = 0
  for (const opp of result.opportunities) {
    if (existingNames.has(opp.partner_name.toLowerCase())) continue
    try {
      await sb().from('partnership_opportunities').insert({
        partner_type: opp.partner_type, partner_name: opp.partner_name,
        partner_handle: opp.partner_handle, partner_size: opp.partner_size,
        opportunity_summary: opp.opportunity_summary, pitch_angle: opp.pitch_angle,
        potential_value: opp.potential_value, effort_level: opp.effort_level,
        priority: opp.priority, outreach_message: opp.outreach_message,
        status: 'proposed', agent_name: 'partnership-scout'
      })
      inserted++
    } catch (e) { console.error('Partnership insert failed:', e) }
  }
  
  return { opportunities_added: inserted, total_generated: result.opportunities.length }
}

async function runListingOptimizer(): Promise<Record<string, unknown>> {
  const { data: listings } = await sb()
    .from('listings')
    .select(`id, title, description, category_id, city, district, views_count, bookings_count, listing_photos(url), categories(name_ar)`)
    .eq('status', 'published').gt('views_count', 3)
    .order('updated_at', { ascending: true }).limit(3)
  
  const targets = (listings || []) as Array<{ id: string; title: string; description: string | null; category_id: string; city: string | null; district: string | null; views_count: number; bookings_count: number; listing_photos: Array<{ url: string }>; categories: { name_ar: string } | null }>
  
  if (targets.length === 0) return { processed: 0, message: 'no eligible listings' }
  
  type Optimization = { suggested_title: string; suggested_description: string; seo_keywords: string[]; photo_recommendations: string[]; overall_score: number; biggest_improvement: string; estimated_impact: string }
  
  let count = 0
  for (const listing of targets) {
    try {
      const result = await callClaudeWithTool<Optimization>({
        systemPrompt: `أنت Listing Optimizer لـ Madmona. اقترح تحسينات للـ listing عشان يجيب views أكتر. اكتب title واضح وdescription مغري.`,
        userMessage: JSON.stringify({ current_title: listing.title, current_description: listing.description, category: listing.categories?.name_ar, city: listing.city, district: listing.district, views: listing.views_count, bookings: listing.bookings_count, photos_count: listing.listing_photos?.length || 0, conversion_rate: listing.views_count > 0 ? (listing.bookings_count / listing.views_count).toFixed(3) : '0' }),
        toolName: 'submit_listing_optimization', toolDescription: 'Submit listing optimization',
        maxTokens: 4096, model: 'sonnet', timeoutMs: 90000,
        schema: { type: 'object', properties: { suggested_title: { type: 'string' }, suggested_description: { type: 'string' }, seo_keywords: { type: 'array', items: { type: 'string' } }, photo_recommendations: { type: 'array', items: { type: 'string' } }, overall_score: { type: 'integer', minimum: 0, maximum: 100 }, biggest_improvement: { type: 'string' }, estimated_impact: { type: 'string' } }, required: ['suggested_title','suggested_description','overall_score','biggest_improvement'] }
      })
      
      await sb().from('agent_insights').insert({
        agent_name: 'listing-optimizer',
        insight_type: 'listing_optimization',
        title: `تحسين: ${listing.title.slice(0, 60)}`,
        description: result.biggest_improvement,
        priority: result.overall_score < 60 ? 'high' : 'medium',
        status: 'open',
        data_points: { listing_id: listing.id, current: { title: listing.title }, suggested: { title: result.suggested_title, description: result.suggested_description, seo_keywords: result.seo_keywords, photo_recommendations: result.photo_recommendations }, score: result.overall_score, estimated_impact: result.estimated_impact },
        recommended_action: result.biggest_improvement
      })
      count++
    } catch (e) { console.error('Listing optimization failed:', e) }
  }
  
  return { processed: targets.length, optimizations_created: count }
}

const RUNNERS: Record<string, () => Promise<Record<string, unknown>>> = {
  'strategy-agent':     runStrategyAgent,
  'partnership-scout':  runPartnershipScout,
  'listing-optimizer':  runListingOptimizer
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const startTime = Date.now()
  try {
    let body: { agent?: string } = {}
    try { body = await req.json() } catch {}
    const agentName = body.agent
    
    if (!agentName || !RUNNERS[agentName]) {
      return new Response(JSON.stringify({ ok: false, error: 'Specify { agent: ... }', available: Object.keys(RUNNERS) }), { status: 400, headers: { 'Content-Type': 'application/json', ...CORS } })
    }
    
    const output = await RUNNERS[agentName]()
    const durationMs = Date.now() - startTime
    await logRun(agentName, 'success', output, undefined, durationMs)
    
    return new Response(JSON.stringify({ ok: true, agent: agentName, output, duration_ms: durationMs }), { status: 200, headers: { 'Content-Type': 'application/json', ...CORS } })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    const durationMs = Date.now() - startTime
    let body: { agent?: string } = {}
    try { body = await req.clone().json() } catch {}
    await logRun(body.agent || 'agent-slow', 'error', {}, msg, durationMs)
    return new Response(JSON.stringify({ ok: false, error: msg, duration_ms: durationMs }), { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } })
  }
})
