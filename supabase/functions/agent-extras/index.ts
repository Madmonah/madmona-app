// agent-extras: 6 أجينتس بتستخدم tool_use (مفيش JSON parse failures)
// quality-control · finance-tracker · revenue-attribution-agent
// pricing-optimizer · fraud-detector · demand-forecaster

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
          maxTokens = 4096, model = 'sonnet', timeoutMs = 60000 } = opts
  
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model === 'haiku' ? HAIKU : SONNET,
        max_tokens: maxTokens,
        system: systemPrompt,
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
  } finally {
    clearTimeout(timer)
  }
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

async function runQualityControl(): Promise<Record<string, unknown>> {
  const { data: listings } = await sb()
    .from('listings')
    .select(`id, title, description, category_id, city, district,
             listing_values(value), listing_photos(url),
             categories(name_ar)`)
    .in('status', ['draft', 'pending_review', 'published'])
    .order('updated_at', { ascending: false })
    .limit(5)
  
  const targets = (listings || []) as Array<{
    id: string; title: string; description: string | null; category_id: string;
    city: string | null; district: string | null;
    listing_values: Array<{ value: number }>;
    listing_photos: Array<{ url: string }>;
    categories: { name_ar: string } | null;
  }>
  
  if (targets.length === 0) return { processed: 0, message: 'no listings to QC' }
  
  type QC = {
    overall_score: number
    pass_status: 'pass' | 'fail' | 'needs_revision'
    title_quality_score: number
    description_quality_score: number
    photos_quality_score: number
    pricing_reasonable: boolean | null
    category_correct: boolean
    issues: Array<{ severity: string; field: string; message: string; suggestion: string }>
    recommended_action: string
  }
  
  let passed = 0, failed = 0, errors = 0
  
  for (const listing of targets) {
    try {
      const minPrice = listing.listing_values?.[0]?.value || 0
      const result = await callClaudeWithTool<QC>({
        systemPrompt: `أنت Quality Control لـ Madmona. قيم جودة الـ listing: العنوان واضح؟ الوصف كافي؟ السعر منطقي؟ الفئة صح؟`,
        userMessage: JSON.stringify({
          title: listing.title,
          description: listing.description,
          category: listing.categories?.name_ar,
          city: listing.city,
          district: listing.district,
          price: minPrice,
          photos_count: listing.listing_photos?.length || 0
        }),
        toolName: 'submit_quality_review',
        toolDescription: 'Submit QC review',
        maxTokens: 4096,
        model: 'sonnet',
        schema: {
          type: 'object',
          properties: {
            overall_score: { type: 'integer', minimum: 0, maximum: 100 },
            pass_status: { type: 'string', enum: ['pass', 'fail', 'needs_revision'] },
            title_quality_score: { type: 'integer', minimum: 0, maximum: 100 },
            description_quality_score: { type: 'integer', minimum: 0, maximum: 100 },
            photos_quality_score: { type: 'integer', minimum: 0, maximum: 100 },
            pricing_reasonable: { type: ['boolean', 'null'] },
            category_correct: { type: 'boolean' },
            issues: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string', enum: ['critical','warning','info'] }, field: { type: 'string' }, message: { type: 'string' }, suggestion: { type: 'string' } }, required: ['severity','field','message','suggestion'] } },
            recommended_action: { type: 'string' }
          },
          required: ['overall_score', 'pass_status', 'issues', 'category_correct']
        }
      })
      
      await sb().from('qc_reports').insert({
        listing_id: listing.id,
        overall_score: result.overall_score,
        pass_status: result.pass_status,
        title_quality_score: result.title_quality_score,
        description_quality_score: result.description_quality_score,
        photos_quality_score: result.photos_quality_score,
        pricing_reasonable: result.pricing_reasonable,
        category_correct: result.category_correct,
        issues: result.issues,
        recommended_action: result.recommended_action,
        human_review_needed: result.pass_status === 'needs_revision' || result.overall_score < 50,
        agent_name: 'quality-control'
      })
      
      if (result.pass_status === 'pass') passed++
      else failed++
      
      if (result.overall_score < 50) {
        await sb().from('agent_insights').insert({
          agent_name: 'quality-control', insight_type: 'quality_issue',
          title: `إعلان ضعيف: ${listing.title.slice(0, 60)}`,
          description: `Score ${result.overall_score}/100 - ${result.issues.length} issues`,
          priority: 'high', status: 'open',
          data_points: { listing_id: listing.id, score: result.overall_score },
          recommended_action: result.recommended_action
        })
      }
    } catch (e) {
      errors++
      console.error(`QC failed for ${listing.id}:`, e)
    }
  }
  
  return { processed: targets.length, passed, failed, errors }
}

async function runFinanceTracker(): Promise<Record<string, unknown>> {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString()
  
  const [todayBookings, yesterdayBookings, monthBookings] = await Promise.all([
    sb().from('marketplace_bookings').select('id, total_amount, status, created_at').gte('created_at', today),
    sb().from('marketplace_bookings').select('id, total_amount').gte('created_at', yesterday).lt('created_at', today),
    sb().from('marketplace_bookings').select('id, total_amount').gte('created_at', monthAgo)
  ])
  
  const todayRev = (todayBookings.data || []).reduce((s: number, b: { total_amount: number | null }) => s + (b.total_amount || 0), 0)
  const yestRev = (yesterdayBookings.data || []).reduce((s: number, b: { total_amount: number | null }) => s + (b.total_amount || 0), 0)
  const monthRev = (monthBookings.data || []).reduce((s: number, b: { total_amount: number | null }) => s + (b.total_amount || 0), 0)
  
  type Finance = {
    summary: string
    trend: 'growing' | 'stable' | 'declining'
    alerts: Array<{ type: string; severity: string; message: string; action: string }>
    insights: string[]
  }
  
  const result = await callClaudeWithTool<Finance>({
    systemPrompt: `أنت Finance Tracker. حلل الإيرادات.`,
    userMessage: JSON.stringify({ today_revenue: todayRev, today_bookings: todayBookings.data?.length || 0, yesterday_revenue: yestRev, month_revenue: monthRev, month_bookings: monthBookings.data?.length || 0 }),
    toolName: 'submit_finance_report',
    toolDescription: 'Submit daily finance analysis',
    maxTokens: 2048,
    model: 'haiku',
    schema: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        trend: { type: 'string', enum: ['growing', 'stable', 'declining'] },
        alerts: { type: 'array', items: { type: 'object', properties: { type: { type: 'string' }, severity: { type: 'string', enum: ['info','warning','critical'] }, message: { type: 'string' }, action: { type: 'string' } }, required: ['type','severity','message'] } },
        insights: { type: 'array', items: { type: 'string' } }
      },
      required: ['summary', 'trend', 'alerts']
    }
  })
  
  await sb().from('daily_kpis').upsert({
    date: today,
    total_revenue: todayRev,
    bookings_value: todayRev,
    new_bookings: todayBookings.data?.length || 0,
    metadata: { finance_summary: result.summary, trend: result.trend, alerts: result.alerts }
  }, { onConflict: 'date' })
  
  for (const alert of result.alerts.filter(a => a.severity === 'critical' || a.severity === 'warning')) {
    await sb().from('agent_insights').insert({
      agent_name: 'finance-tracker', insight_type: 'finance_alert',
      title: alert.message.slice(0, 200),
      description: alert.action || result.summary,
      priority: alert.severity === 'critical' ? 'high' : 'medium',
      status: 'open',
      data_points: { severity: alert.severity, today_revenue: todayRev, trend: result.trend }
    })
  }
  
  return { today_revenue: todayRev, yesterday_revenue: yestRev, trend: result.trend, summary: result.summary, alerts_count: result.alerts.length }
}

async function runRevenueAttribution(): Promise<Record<string, unknown>> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const { data: bookings } = await sb()
    .from('marketplace_bookings')
    .select('id, total_amount, status, created_at, customer_id, listing_id')
    .gte('created_at', sevenDaysAgo)
    .in('status', ['confirmed', 'completed'])
    .limit(10)
  
  const targets = bookings || []
  if (targets.length === 0) return { processed: 0, message: 'no bookings to attribute' }
  
  const { data: existing } = await sb().from('revenue_attribution').select('booking_id').in('booking_id', targets.map((b: { id: string }) => b.id))
  const attributed = new Set((existing || []).map((e: { booking_id: string }) => e.booking_id))
  const newBookings = targets.filter((b: { id: string }) => !attributed.has(b.id))
  
  if (newBookings.length === 0) return { processed: targets.length, attributed: 0, message: 'all already attributed' }
  
  type Attr = { attributed_agents: Array<{ agent_name: string; weight: number; reasoning: string }>; primary_driver: string; confidence: 'high' | 'medium' | 'low' }
  
  let count = 0
  for (const booking of newBookings) {
    try {
      const { data: events } = await sb()
        .from('site_events').select('event_type, event_data, created_at')
        .eq('user_id', (booking as { customer_id: string }).customer_id)
        .lte('created_at', (booking as { created_at: string }).created_at)
        .order('created_at', { ascending: false }).limit(20)
      
      const result = await callClaudeWithTool<Attr>({
        systemPrompt: `أنت Revenue Attribution analyst. الأجينتس: customer-concierge, lead-qualifier, booking-closer, content-marketing, ad-designer, instagram-publisher, whatsapp-broadcaster.`,
        userMessage: JSON.stringify({ booking_id: (booking as { id: string }).id, amount: (booking as { total_amount: number }).total_amount, recent_events: (events || []).slice(0, 10) }),
        toolName: 'submit_attribution', toolDescription: 'Submit attribution',
        maxTokens: 1500, model: 'haiku',
        schema: { type: 'object', properties: { attributed_agents: { type: 'array', items: { type: 'object', properties: { agent_name: { type: 'string' }, weight: { type: 'number', minimum: 0, maximum: 1 }, reasoning: { type: 'string' } }, required: ['agent_name','weight','reasoning'] } }, primary_driver: { type: 'string' }, confidence: { type: 'string', enum: ['high','medium','low'] } }, required: ['attributed_agents','primary_driver','confidence'] }
      })
      
      const sortedAgents = [...result.attributed_agents].sort((a, b) => b.weight - a.weight)
      await sb().from('revenue_attribution').insert({
        booking_id: (booking as { id: string }).id,
        amount: (booking as { total_amount: number }).total_amount,
        attributed_agents: result.attributed_agents,
        first_touch_agent: sortedAgents[sortedAgents.length - 1]?.agent_name,
        last_touch_agent: sortedAgents[0]?.agent_name,
        confidence: result.confidence,
        attribution_method: 'ai_analysis',
        agent_name: 'revenue-attribution-agent'
      })
      count++
    } catch (e) { console.error('Attribution failed:', e) }
  }
  
  return { processed: newBookings.length, attributed: count }
}

async function runPricingOptimizer(): Promise<Record<string, unknown>> {
  const { data: listings } = await sb()
    .from('listings')
    .select(`id, title, category_id, city, views_count, bookings_count, listing_values(value), categories(name_ar)`)
    .eq('status', 'published').gt('views_count', 5)
    .order('updated_at', { ascending: true }).limit(5)
  
  const targets = (listings || []) as Array<{ id: string; title: string; category_id: string; city: string | null; views_count: number; bookings_count: number; listing_values: Array<{ value: number }>; categories: { name_ar: string } | null }>
  
  if (targets.length === 0) return { processed: 0, message: 'no eligible listings' }
  
  type Pricing = { suggested_price: number; price_change_pct: number; reasoning: string; market_signals: { your_position: string; demand_level: string }; expected_impact: string; confidence: 'high' | 'medium' | 'low' }
  
  let count = 0
  for (const listing of targets) {
    try {
      const currentPrice = listing.listing_values?.[0]?.value || 0
      if (currentPrice === 0) continue
      
      const { data: competitors } = await sb().from('listings').select('listing_values(value)').eq('category_id', listing.category_id).eq('status', 'published').neq('id', listing.id).limit(20)
      const competitorPrices = (competitors || []).map((c: { listing_values: Array<{ value: number }> }) => c.listing_values?.[0]?.value).filter((p: number | undefined): p is number => p != null && p > 0)
      const avgCompetitor = competitorPrices.length > 0 ? competitorPrices.reduce((s: number, p: number) => s + p, 0) / competitorPrices.length : currentPrice
      const conversionRate = listing.views_count > 0 ? listing.bookings_count / listing.views_count : 0
      
      const result = await callClaudeWithTool<Pricing>({
        systemPrompt: `أنت Pricing Optimizer. اقترح سعر بناءً على المنافسين والـ conversion. تغييرات ±15% بحد أقصى.`,
        userMessage: JSON.stringify({ listing_title: listing.title, category: listing.categories?.name_ar, city: listing.city, current_price: currentPrice, views: listing.views_count, bookings: listing.bookings_count, conversion_rate: conversionRate, competitor_avg_price: Math.round(avgCompetitor), competitor_count: competitorPrices.length }),
        toolName: 'submit_pricing', toolDescription: 'Submit pricing recommendation',
        maxTokens: 1500, model: 'haiku',
        schema: { type: 'object', properties: { suggested_price: { type: 'number' }, price_change_pct: { type: 'number' }, reasoning: { type: 'string' }, market_signals: { type: 'object', properties: { your_position: { type: 'string', enum: ['below_market','at_market','above_market'] }, demand_level: { type: 'string', enum: ['low','medium','high'] } }, required: ['your_position','demand_level'] }, expected_impact: { type: 'string' }, confidence: { type: 'string', enum: ['high','medium','low'] } }, required: ['suggested_price','price_change_pct','reasoning','market_signals','confidence'] }
      })
      
      await sb().from('pricing_suggestions').insert({
        listing_id: listing.id, current_price: currentPrice, suggested_price: result.suggested_price,
        price_change_pct: result.price_change_pct, reasoning: result.reasoning,
        market_signals: result.market_signals, expected_impact: result.expected_impact,
        confidence: result.confidence, rule_type: 'ai_optimizer', status: 'pending', agent_name: 'pricing-optimizer'
      })
      count++
    } catch (e) { console.error('Pricing failed:', e) }
  }
  
  return { processed: targets.length, suggestions_created: count }
}

async function runFraudDetector(): Promise<Record<string, unknown>> {
  const { data: listings } = await sb()
    .from('listings')
    .select('id, title, description, supplier_id, city, district, listing_values(value), listing_photos(url)')
    .in('status', ['published', 'pending_review'])
    .order('created_at', { ascending: false }).limit(8)
  
  const targets = (listings || []) as Array<{ id: string; title: string; description: string | null; supplier_id: string; city: string | null; district: string | null; listing_values: Array<{ value: number }>; listing_photos: Array<{ url: string }> }>
  
  if (targets.length === 0) return { processed: 0, message: 'no listings to scan' }
  
  type Fraud = { alerts: Array<{ target_id: string; alert_type: string; severity: string; confidence_score: number; description: string; evidence: Record<string, string>; recommended_action: string }>; summary: string }
  
  const result = await callClaudeWithTool<Fraud>({
    systemPrompt: `أنت Fraud Detector. دور على إعلانات مزيفة، duplicates، أسعار غير منطقية. ركز على المشبوه فعلياً فقط.`,
    userMessage: JSON.stringify(targets.map(l => ({ id: l.id, title: l.title, description: l.description?.slice(0, 200), city: l.city, district: l.district, price: l.listing_values?.[0]?.value || 0, photos_count: l.listing_photos?.length || 0 }))),
    toolName: 'submit_fraud_alerts', toolDescription: 'Submit fraud alerts',
    maxTokens: 4096, model: 'sonnet',
    schema: { type: 'object', properties: { alerts: { type: 'array', items: { type: 'object', properties: { target_id: { type: 'string' }, alert_type: { type: 'string', enum: ['fake_listing','duplicate','suspicious_pricing','misleading_content'] }, severity: { type: 'string', enum: ['low','medium','high','critical'] }, confidence_score: { type: 'integer', minimum: 0, maximum: 100 }, description: { type: 'string' }, evidence: { type: 'object', additionalProperties: { type: 'string' } }, recommended_action: { type: 'string' } }, required: ['target_id','alert_type','severity','confidence_score','description'] } }, summary: { type: 'string' } }, required: ['alerts','summary'] }
  })
  
  let inserted = 0
  for (const alert of result.alerts) {
    try {
      await sb().from('fraud_alerts').insert({
        alert_type: alert.alert_type, target_type: 'listing', target_id: alert.target_id,
        severity: alert.severity, confidence_score: alert.confidence_score,
        description: alert.description, evidence: alert.evidence || {},
        recommended_action: alert.recommended_action, status: 'open', agent_name: 'fraud-detector'
      })
      inserted++
    } catch (e) { console.error('Fraud alert insert failed:', e) }
  }
  
  return { processed: targets.length, alerts_created: inserted, summary: result.summary }
}

async function runDemandForecaster(): Promise<Record<string, unknown>> {
  const { data: cats } = await sb()
    .from('categories').select('id, name_ar, slug')
    .is('parent_id', null).eq('is_active', true).limit(8)
  
  const targets = (cats || []) as Array<{ id: string; name_ar: string; slug: string }>
  if (targets.length === 0) return { processed: 0, message: 'no categories' }
  
  const supplyMap: Record<string, number> = {}
  for (const cat of targets) {
    const { count } = await sb().from('listings').select('id', { count: 'exact', head: true }).eq('category_id', cat.id).eq('status', 'published')
    supplyMap[cat.id] = count || 0
  }
  
  type Forecasts = { forecasts: Array<{ category_id: string; forecast_period: 'next_week' | 'next_month' | 'next_quarter'; predicted_searches: number; predicted_bookings: number; supply_gap: number; confidence: 'high' | 'medium' | 'low'; contributing_factors: string[]; recommended_action: string }> }
  
  const result = await callClaudeWithTool<Forecasts>({
    systemPrompt: `أنت Demand Forecaster لـ Madmona. توقع الطلب الشهر الجاي. ${new Date().toISOString().split('T')[0]} هو التاريخ الحالي.`,
    userMessage: JSON.stringify(targets.map(c => ({ id: c.id, name: c.name_ar, current_supply: supplyMap[c.id] }))),
    toolName: 'submit_demand_forecasts', toolDescription: 'Submit forecasts',
    maxTokens: 8192, model: 'sonnet',
    schema: { type: 'object', properties: { forecasts: { type: 'array', items: { type: 'object', properties: { category_id: { type: 'string' }, forecast_period: { type: 'string', enum: ['next_week','next_month','next_quarter'] }, predicted_searches: { type: 'integer', minimum: 0 }, predicted_bookings: { type: 'integer', minimum: 0 }, supply_gap: { type: 'integer' }, confidence: { type: 'string', enum: ['high','medium','low'] }, contributing_factors: { type: 'array', items: { type: 'string' } }, recommended_action: { type: 'string' } }, required: ['category_id','forecast_period','predicted_bookings','confidence'] } } }, required: ['forecasts'] }
  })
  
  const today = new Date().toISOString().split('T')[0]
  let inserted = 0
  for (const f of result.forecasts) {
    try {
      await sb().from('demand_forecasts').insert({
        forecast_date: today, forecast_period: f.forecast_period,
        category: f.category_id, predicted_searches: f.predicted_searches,
        predicted_bookings: f.predicted_bookings,
        current_supply: supplyMap[f.category_id] || 0,
        supply_gap: f.supply_gap, confidence: f.confidence,
        contributing_factors: f.contributing_factors,
        recommended_action: f.recommended_action, agent_name: 'demand-forecaster'
      })
      inserted++
    } catch (e) { console.error('Forecast insert failed:', e) }
  }
  
  return { categories_analyzed: targets.length, forecasts_created: inserted }
}

const RUNNERS: Record<string, () => Promise<Record<string, unknown>>> = {
  'quality-control':           runQualityControl,
  'finance-tracker':           runFinanceTracker,
  'revenue-attribution-agent': runRevenueAttribution,
  'pricing-optimizer':         runPricingOptimizer,
  'fraud-detector':            runFraudDetector,
  'demand-forecaster':         runDemandForecaster
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
    await logRun(body.agent || 'agent-extras', 'error', {}, msg, durationMs)
    return new Response(JSON.stringify({ ok: false, error: msg, duration_ms: durationMs }), { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } })
  }
})
