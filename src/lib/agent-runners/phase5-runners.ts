// src/lib/agent-runners/phase5-runners.ts
// Phase 5 — Self-improving + intelligence agents

import { supabase as supabaseAdmin } from '@/lib/supabase'
import { callClaude, parseJsonResponse } from '@/lib/anthropic'
import { sendEmail } from '@/lib/email'

import { PROMPT_OPTIMIZER_PROMPT } from '@/lib/agent-prompts/prompt-optimizer'
import { PERFORMANCE_TRACKER_PROMPT } from '@/lib/agent-prompts/performance-tracker'
import { REVENUE_ATTRIBUTION_PROMPT } from '@/lib/agent-prompts/revenue-attribution'
import { COMPETITOR_PRICING_SPY_PROMPT } from '@/lib/agent-prompts/competitor-pricing-spy'
import { CUSTOMER_SUCCESS_PROMPT } from '@/lib/agent-prompts/customer-success'
import { EMAIL_RESPONDER_PROMPT } from '@/lib/agent-prompts/email-responder'
import { LISTING_PHOTOGRAPHER_PROMPT } from '@/lib/agent-prompts/listing-photographer'

const OWNER_EMAIL = 'madmona.admin@gmail.com'

// =============================================================================
// PROMPT OPTIMIZER — meta agent that improves other agents' prompts
// =============================================================================
export async function runPromptOptimizer(args?: { targetAgent?: string }): Promise<Record<string, unknown>> {
  // Pick lowest-performing agent if not specified
  let targetAgent = args?.targetAgent
  if (!targetAgent) {
    const { data: metrics } = await supabaseAdmin
      .from('agent_performance_metrics')
      .select('agent_name, runs_count, success_count, error_count')
      .gte('metric_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    type M = { agent_name: string; runs_count: number; success_count: number; error_count: number }
    const rows = (metrics ?? []) as M[]
    const aggregated: Record<string, { runs: number; success: number; errors: number }> = {}
    rows.forEach(r => {
      const a = aggregated[r.agent_name] ?? { runs: 0, success: 0, errors: 0 }
      a.runs += r.runs_count
      a.success += r.success_count
      a.errors += r.error_count
      aggregated[r.agent_name] = a
    })
    const ranked = Object.entries(aggregated)
      .filter(([, m]) => m.runs >= 3)
      .map(([name, m]) => ({ name, success_rate: m.success / m.runs }))
      .sort((a, b) => a.success_rate - b.success_rate)
    targetAgent = ranked[0]?.name
  }

  if (!targetAgent) return { skipped: true, reason: 'no agent needs optimization yet' }

  // Get current performance
  const { data: recentRuns } = await supabaseAdmin
    .from('agent_runs').select('status, duration_ms, output_summary, error_message')
    .eq('agent_name', targetAgent)
    .gte('started_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .limit(50)

  type R = { status: string; duration_ms: number | null; output_summary: Record<string, unknown> | null; error_message: string | null }
  const runs = (recentRuns ?? []) as R[]
  const successCount = runs.filter(r => r.status === 'success').length

  const text = await callClaude({
    systemPrompt: PROMPT_OPTIMIZER_PROMPT,
    userMessage: JSON.stringify({
      target_agent: targetAgent,
      current_prompt: '[stored in code]',
      performance_data: {
        runs_last_7_days: runs.length,
        success_rate: runs.length ? successCount / runs.length : 0,
        avg_duration_ms: runs.length ? runs.reduce((s, r) => s + (r.duration_ms ?? 0), 0) / runs.length : 0,
      },
      sample_outputs: runs.slice(0, 5).map(r => ({
        success: r.status === 'success',
        error: r.error_message,
        output: r.output_summary,
      })),
      recent_errors: runs.filter(r => r.error_message).map(r => r.error_message),
    }),
    maxTokens: 4000,
    temperature: 0.5,
  })

  const result = parseJsonResponse<{
    diagnosis: string;
    hypothesis: string;
    changes_summary: string;
    improved_prompt: string;
    expected_impact: Record<string, unknown>;
    test_strategy: string;
    confidence: string;
  }>(text)

  // Save the new prompt version (manual review needed before activating)
  const { data: prevVersions } = await supabaseAdmin
    .from('prompt_versions').select('version').eq('agent_name', targetAgent)
    .order('version', { ascending: false }).limit(1)
  const nextVersion = (((prevVersions ?? []) as Array<{ version: number }>)[0]?.version ?? 0) + 1

  const { data: created } = await supabaseAdmin.from('prompt_versions').insert({
    agent_name: targetAgent,
    version: nextVersion,
    prompt_text: result.improved_prompt,
    prev_version: nextVersion - 1,
    changes_summary: result.changes_summary,
    hypothesis: result.hypothesis,
    is_active: false, // requires manual approval
  } as never).select('id').single()

  // Notify Mohamed
  await supabaseAdmin.from('agent_insights').insert({
    agent_name: 'prompt-optimizer',
    insight_type: 'recommendation',
    title: `🧠 prompt جديد لـ ${targetAgent} (v${nextVersion})`,
    description: `${result.diagnosis}\n\nالتغييرات: ${result.changes_summary}`,
    priority: 'medium',
    recommended_action: `راجع /admin/prompt-versions، فعّل لو كويس، رفض لو لا`,
    data_points: { target_agent: targetAgent, version: nextVersion, hypothesis: result.hypothesis },
  } as never)

  return {
    target_agent: targetAgent,
    new_version: nextVersion,
    prompt_id: (created as { id?: string } | null)?.id,
    confidence: result.confidence,
    needs_review: true,
  }
}

// =============================================================================
// PERFORMANCE TRACKER
// =============================================================================
export async function runPerformanceTracker(): Promise<Record<string, unknown>> {
  // Snapshot today's metrics
  await supabaseAdmin.rpc('snapshot_agent_performance')

  // Get last 7 days
  const { data: metricsRaw } = await supabaseAdmin
    .from('agent_performance_metrics')
    .select('*')
    .gte('metric_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

  type M = {
    agent_name: string; runs_count: number; success_count: number;
    error_count: number; avg_duration_ms: number;
  }
  const metrics = (metricsRaw ?? []) as M[]
  const aggregated: Record<string, M> = {}
  metrics.forEach(m => {
    const a = aggregated[m.agent_name] ?? {
      agent_name: m.agent_name, runs_count: 0, success_count: 0,
      error_count: 0, avg_duration_ms: 0,
    }
    a.runs_count += m.runs_count
    a.success_count += m.success_count
    a.error_count += m.error_count
    a.avg_duration_ms = Math.max(a.avg_duration_ms, m.avg_duration_ms)
    aggregated[m.agent_name] = a
  })

  // Recent business signals
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const [bookings, leads, ads] = await Promise.all([
    supabaseAdmin.from('marketplace_bookings').select('id, total_amount').gte('created_at', oneWeekAgo),
    supabaseAdmin.from('lead_captures').select('id').gte('created_at', oneWeekAgo),
    supabaseAdmin.from('ad_creatives').select('id').gte('created_at', oneWeekAgo),
  ])

  const text = await callClaude({
    systemPrompt: PERFORMANCE_TRACKER_PROMPT,
    userMessage: JSON.stringify({
      agents_metrics: Object.values(aggregated).map(a => ({
        ...a,
        success_rate: a.runs_count ? a.success_count / a.runs_count : 0,
      })),
      business_metrics: {
        bookings_7d: (bookings.data ?? []).length,
        revenue_7d: (((bookings.data ?? []) as Array<{ total_amount: number }>).reduce((s, b) => s + (b.total_amount ?? 0), 0)),
        leads_7d: (leads.data ?? []).length,
        ads_drafted_7d: (ads.data ?? []).length,
      },
    }),
    maxTokens: 3500,
    temperature: 0.4,
  })

  const result = parseJsonResponse<{
    summary: string;
    top_performers: Array<Record<string, unknown>>;
    underperformers: Array<Record<string, unknown>>;
    anomalies: Array<Record<string, unknown>>;
    system_health_score: number;
    recommendations: string[];
  }>(text)

  // Save insights for underperformers
  for (const u of result.underperformers ?? []) {
    await supabaseAdmin.from('agent_insights').insert({
      agent_name: 'performance-tracker',
      insight_type: 'warning',
      title: `⚠️ ${u.agent_name}: أداء ضعيف`,
      description: (Array.isArray(u.issues) ? (u.issues as string[]).join(', ') : ''),
      priority: 'high',
      recommended_action: u.recommended_action as string,
      data_points: u,
    } as never)
  }

  return {
    system_health_score: result.system_health_score,
    underperformers_count: result.underperformers?.length ?? 0,
    top_performers_count: result.top_performers?.length ?? 0,
    recommendations: result.recommendations,
  }
}

// =============================================================================
// REVENUE ATTRIBUTION
// =============================================================================
export async function runRevenueAttribution(args?: { bookingId?: string }): Promise<Record<string, unknown>> {
  let booking: Record<string, unknown> | null = null
  if (args?.bookingId) {
    const { data } = await supabaseAdmin
      .from('marketplace_bookings').select('*').eq('id', args.bookingId).maybeSingle()
    booking = data as Record<string, unknown> | null
  } else {
    // Find a recent booking without attribution
    const { data: recent } = await supabaseAdmin
      .from('marketplace_bookings').select('*')
      .order('created_at', { ascending: false }).limit(20)
    type B = Record<string, unknown> & { id: string }
    for (const b of ((recent ?? []) as B[])) {
      const { count } = await supabaseAdmin.from('revenue_attribution')
        .select('*', { count: 'exact', head: true }).eq('booking_id', b.id)
      if ((count ?? 0) === 0) { booking = b; break }
    }
  }

  if (!booking) return { skipped: true, reason: 'no unattributed bookings' }

  const text = await callClaude({
    systemPrompt: REVENUE_ATTRIBUTION_PROMPT,
    userMessage: JSON.stringify({
      booking,
      customer_history: { first_touch_event: null, intermediate_touches: [], last_touch_event: null },
      agents_active_during_period: ['ad-designer', 'lead-qualifier', 'customer-concierge', 'booking-closer'],
    }),
    maxTokens: 1800,
    temperature: 0.3,
  })

  const result = parseJsonResponse<{
    attributed_agents: Array<{ agent_name: string; weight: number; reasoning: string }>;
    first_touch_agent: string;
    last_touch_agent: string;
    attribution_method: string;
    confidence: string;
    insights: string[];
  }>(text)

  await supabaseAdmin.from('revenue_attribution').insert({
    booking_id: booking.id,
    amount: booking.total_amount ?? 0,
    attributed_agents: result.attributed_agents,
    first_touch_agent: result.first_touch_agent,
    last_touch_agent: result.last_touch_agent,
    confidence: result.confidence,
    attribution_method: result.attribution_method,
  } as never)

  return {
    booking_id: booking.id,
    attributed_count: result.attributed_agents.length,
    first_touch: result.first_touch_agent,
    last_touch: result.last_touch_agent,
  }
}

// =============================================================================
// COMPETITOR PRICING SPY
// =============================================================================
export async function runCompetitorPricingSpy(): Promise<Record<string, unknown>> {
  const categories = ['كاميرات', 'كوورك', 'سيارات', 'شقق']
  const cat = categories[Math.floor(Math.random() * categories.length)]

  const text = await callClaude({
    systemPrompt: COMPETITOR_PRICING_SPY_PROMPT,
    userMessage: JSON.stringify({
      category: cat,
      our_average_price: 250,
      our_top_listing_prices: [200, 250, 300, 350],
    }),
    maxTokens: 3500,
    temperature: 0.5,
  })

  const result = parseJsonResponse<{
    competitors_found: Array<Record<string, unknown>>;
    market_analysis: Record<string, unknown>;
    actionable_insights: string[];
    recommended_pricing_actions: Array<Record<string, unknown>>;
  }>(text)

  // Save competitor prices
  for (const c of result.competitors_found ?? []) {
    await supabaseAdmin.from('competitor_prices').insert({
      competitor_name: c.competitor_name,
      competitor_url: c.competitor_url,
      category: cat,
      product_name: c.product_name,
      price: c.price,
      pricing_unit: c.pricing_unit,
      features: c.features,
      our_equivalent_price: c.our_equivalent_price,
      price_diff_pct: c.price_diff_pct,
    } as never)
  }

  return {
    category: cat,
    competitors_count: result.competitors_found?.length ?? 0,
    insights: result.actionable_insights,
  }
}

// =============================================================================
// CUSTOMER SUCCESS
// =============================================================================
export async function runCustomerSuccessAgent(args?: { customerId?: string }): Promise<Record<string, unknown>> {
  let customer: Record<string, unknown> | null = null
  if (args?.customerId) {
    const { data } = await supabaseAdmin
      .from('profiles').select('id, full_name, phone, created_at').eq('id', args.customerId).maybeSingle()
    customer = data as Record<string, unknown> | null
  } else {
    // Pick a customer who hasn't booked in 14+ days (at_risk segment)
    const { data: bookings } = await supabaseAdmin
      .from('marketplace_bookings').select('customer_profile_id, created_at')
      .order('created_at', { ascending: false }).limit(30)
    type B = { customer_profile_id: string; created_at: string }
    const seen = new Set<string>()
    for (const b of ((bookings ?? []) as B[])) {
      if (seen.has(b.customer_profile_id)) continue
      seen.add(b.customer_profile_id)
      const daysSince = (Date.now() - new Date(b.created_at).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSince > 14 && daysSince < 60) {
        const { data: c } = await supabaseAdmin
          .from('profiles').select('id, full_name, phone, created_at')
          .eq('id', b.customer_profile_id).maybeSingle()
        if (c) { customer = c as Record<string, unknown>; break }
      }
    }
  }

  if (!customer) return { skipped: true, reason: 'no at-risk customers' }

  const { data: customerBookings } = await supabaseAdmin
    .from('marketplace_bookings').select('total_amount, created_at, listing_id')
    .eq('customer_profile_id', customer.id).order('created_at', { ascending: false }).limit(10)

  type B = { total_amount: number; created_at: string }
  const cb = (customerBookings ?? []) as B[]
  const totalSpent = cb.reduce((s, b) => s + (b.total_amount ?? 0), 0)

  const text = await callClaude({
    systemPrompt: CUSTOMER_SUCCESS_PROMPT,
    userMessage: JSON.stringify({
      customer: {
        ...customer,
        total_bookings: cb.length,
        total_spent: totalSpent,
        last_booking_at: cb[0]?.created_at,
      },
      platform_context: { current_promotions: [] },
    }),
    maxTokens: 1500,
    temperature: 0.6,
  })

  const result = parseJsonResponse<{
    customer_segment: string; health_score: number;
    trigger_event: string; recommended_action: string;
    message_drafted: string; expected_outcome: string;
    send_via: string; best_send_time: string;
    needs_human_review: boolean; reasoning: string;
  }>(text)

  const { data: created } = await supabaseAdmin.from('customer_success_actions').insert({
    customer_profile_id: customer.id,
    customer_phone: customer.phone,
    customer_segment: result.customer_segment,
    health_score: result.health_score,
    trigger_event: result.trigger_event,
    recommended_action: result.recommended_action,
    message_drafted: result.message_drafted,
  } as never).select('id').single()

  return {
    action_id: (created as { id?: string } | null)?.id,
    customer_id: customer.id,
    segment: result.customer_segment,
    health_score: result.health_score,
    action: result.recommended_action,
  }
}

// =============================================================================
// EMAIL RESPONDER
// =============================================================================
export async function runEmailResponder(args?: {
  fromEmail?: string; subject?: string; body?: string;
}): Promise<Record<string, unknown>> {
  if (!args?.body) return { skipped: true, reason: 'no email body provided' }

  const text = await callClaude({
    systemPrompt: EMAIL_RESPONDER_PROMPT,
    userMessage: JSON.stringify({
      from_email: args.fromEmail ?? 'unknown',
      subject: args.subject ?? '',
      body_received: args.body,
      sender_history: { previous_emails: 0, is_customer: false },
    }),
    maxTokens: 2000,
    temperature: 0.5,
  })

  const result = parseJsonResponse<{
    category: string; intent: string; urgency: string;
    ai_draft_reply: string; ai_confidence: string;
    needs_human_review: boolean; review_reason: string;
  }>(text)

  const { data: created } = await supabaseAdmin.from('email_responses').insert({
    from_email: args.fromEmail ?? 'unknown',
    subject: args.subject ?? '',
    body_received: args.body,
    category: result.category,
    intent: result.intent,
    urgency: result.urgency,
    ai_draft_reply: result.ai_draft_reply,
    ai_confidence: result.ai_confidence,
    needs_human_review: result.needs_human_review,
  } as never).select('id').single()

  if (result.needs_human_review || result.urgency === 'urgent') {
    await sendEmail({
      to: OWNER_EMAIL,
      subject: `📧 إيميل ${result.urgency} - ${result.category}`,
      html: `<div dir="rtl"><strong>From:</strong> ${args.fromEmail}<br/>
        <strong>Category:</strong> ${result.category}<br/>
        <strong>Intent:</strong> ${result.intent}<br/>
        <hr/>
        <strong>الرد المقترح:</strong>
        <div style="background:#FAF7F0;padding:12px;border-radius:8px;white-space:pre-wrap">${result.ai_draft_reply}</div>
      </div>`,
    })
  }

  return {
    response_id: (created as { id?: string } | null)?.id,
    category: result.category,
    urgency: result.urgency,
    needs_review: result.needs_human_review,
  }
}

// =============================================================================
// LISTING PHOTOGRAPHER
// =============================================================================
export async function runListingPhotographer(args?: { listingId?: string }): Promise<Record<string, unknown>> {
  let listing: Record<string, unknown> | null = null
  if (args?.listingId) {
    const { data } = await supabaseAdmin
      .from('listings').select('id, title, category_id, description')
      .eq('id', args.listingId).maybeSingle()
    listing = data as Record<string, unknown> | null
  } else {
    // Pick a listing with low photo count
    const { data: listings } = await supabaseAdmin
      .from('listings').select('id, title, category_id')
      .eq('status', 'published').order('created_at', { ascending: false }).limit(20)
    type L = Record<string, unknown> & { id: string }
    for (const l of ((listings ?? []) as L[])) {
      const { count: photoCount } = await supabaseAdmin
        .from('listing_photos').select('*', { count: 'exact', head: true }).eq('listing_id', l.id)
      const { count: existingBrief } = await supabaseAdmin
        .from('photo_briefs').select('*', { count: 'exact', head: true }).eq('listing_id', l.id)
      if ((photoCount ?? 0) < 4 && (existingBrief ?? 0) === 0) {
        listing = l; break
      }
    }
  }

  if (!listing) return { skipped: true, reason: 'no listings need photo briefs' }

  const text = await callClaude({
    systemPrompt: LISTING_PHOTOGRAPHER_PROMPT,
    userMessage: JSON.stringify({
      listing,
      category_best_practices: ['boutique aesthetic', 'natural lighting', 'minimal styling'],
    }),
    maxTokens: 2500,
    temperature: 0.6,
  })

  const result = parseJsonResponse<{
    current_photo_quality_score: number;
    issues_with_current: string[];
    shot_list: Array<Record<string, unknown>>;
    styling_tips: string[];
    reference_examples: string[];
    estimated_uplift: string;
  }>(text)

  const { data: created } = await supabaseAdmin.from('photo_briefs').insert({
    listing_id: listing.id,
    current_photo_quality_score: result.current_photo_quality_score,
    issues_with_current: result.issues_with_current,
    shot_list: result.shot_list,
    styling_tips: result.styling_tips,
    reference_examples: result.reference_examples,
    estimated_uplift: result.estimated_uplift,
  } as never).select('id').single()

  return {
    brief_id: (created as { id?: string } | null)?.id,
    listing_id: listing.id,
    shots_count: result.shot_list.length,
    estimated_uplift: result.estimated_uplift,
  }
}
