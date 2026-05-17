// src/lib/agent-runners/phase4-runners.ts
// Phase 4 runners: Support + Intelligence + Growth teams

import { supabase as supabaseAdmin } from '@/lib/supabase'
import { callClaude, parseJsonResponse } from '@/lib/anthropic'
import { sendEmail } from '@/lib/email'

import { COMPLAINT_RESOLVER_PROMPT } from '@/lib/agent-prompts/complaint-resolver'
import { DISPUTE_MEDIATOR_PROMPT } from '@/lib/agent-prompts/dispute-mediator'
import { PRICING_OPTIMIZER_PROMPT } from '@/lib/agent-prompts/pricing-optimizer'
import { FRAUD_DETECTOR_PROMPT } from '@/lib/agent-prompts/fraud-detector'
import { DEMAND_FORECASTER_PROMPT } from '@/lib/agent-prompts/demand-forecaster'
import { PARTNERSHIP_SCOUT_PROMPT } from '@/lib/agent-prompts/partnership-scout'
import { CONTENT_PERSONALIZER_PROMPT } from '@/lib/agent-prompts/content-personalizer'

const OWNER_EMAIL = 'madmona.admin@gmail.com'

// =============================================================================
// SUPPORT TEAM
// =============================================================================

// COMPLAINT RESOLVER — analyzes complaints and proposes resolutions
export async function runComplaintResolver(args?: {
  complaintText?: string
  source?: string
  customerPhone?: string
  bookingId?: string
}): Promise<Record<string, unknown>> {
  if (!args?.complaintText) {
    return { skipped: true, reason: 'no complaint text provided' }
  }

  let bookingContext: Record<string, unknown> = {}
  let listingContext: Record<string, unknown> = {}
  if (args.bookingId) {
    const { data: booking } = await supabaseAdmin
      .from('marketplace_bookings').select('*').eq('id', args.bookingId).maybeSingle()
    bookingContext = (booking as Record<string, unknown>) ?? {}
    if (bookingContext.listing_id) {
      const { data: listing } = await supabaseAdmin
        .from('listings').select('id, title, description').eq('id', bookingContext.listing_id).maybeSingle()
      listingContext = (listing as Record<string, unknown>) ?? {}
    }
  }

  const text = await callClaude({
    systemPrompt: COMPLAINT_RESOLVER_PROMPT,
    userMessage: JSON.stringify({
      complaint_text: args.complaintText,
      complaint_source: args.source ?? 'whatsapp',
      booking_context: bookingContext,
      listing_context: listingContext,
    }),
    maxTokens: 2500,
    temperature: 0.5,
  })

  const result = parseJsonResponse<{
    complaint_category: string; severity: string; sentiment: string;
    resolution_text: string; suggested_compensation: string;
    compensation_details: string; policy_references: string[];
    next_steps: string[]; human_review_needed: boolean;
    escalation_reason: string | null;
  }>(text)

  const { data: created } = await supabaseAdmin.from('complaint_resolutions').insert({
    complaint_source: args.source ?? 'whatsapp',
    customer_phone: args.customerPhone ?? null,
    booking_id: args.bookingId ?? null,
    complaint_text: args.complaintText,
    complaint_category: result.complaint_category,
    severity: result.severity,
    sentiment: result.sentiment,
    resolution_text: result.resolution_text,
    suggested_compensation: result.suggested_compensation,
    policy_references: result.policy_references,
    next_steps: result.next_steps,
    human_review_needed: result.human_review_needed,
    status: result.human_review_needed ? 'analyzed' : 'response_sent',
  } as never).select('id').single()

  const id = (created as { id?: string } | null)?.id

  if (result.human_review_needed) {
    await sendEmail({
      to: OWNER_EMAIL,
      subject: `🚨 شكوى تحتاج تدخل — ${result.severity}`,
      html: `<div dir="rtl" style="font-family:Tahoma;padding:20px">
        <h2 style="color:#6FCF97">🚨 شكوى ${result.severity}</h2>
        <p><strong>الشكوى:</strong> ${args.complaintText}</p>
        <p><strong>السبب للتصعيد:</strong> ${result.escalation_reason ?? '—'}</p>
        <p>راجع /admin/complaints لاتخاذ قرار</p>
      </div>`,
    })
  }

  return {
    complaint_id: id,
    severity: result.severity,
    suggested_compensation: result.suggested_compensation,
    needs_review: result.human_review_needed,
  }
}

// DISPUTE MEDIATOR
export async function runDisputeMediator(args?: { bookingId?: string }): Promise<Record<string, unknown>> {
  if (!args?.bookingId) return { skipped: true, reason: 'no booking_id' }

  const { data: booking } = await supabaseAdmin
    .from('marketplace_bookings').select('*').eq('id', args.bookingId).maybeSingle()
  if (!booking) return { skipped: true, reason: 'booking not found' }

  // For demo: pull recent complaints + supplier history
  const text = await callClaude({
    systemPrompt: DISPUTE_MEDIATOR_PROMPT,
    userMessage: JSON.stringify({
      booking,
      customer_complaint: 'لازم يتحدد من البيانات',
      supplier_response: 'لازم يتحدد من البيانات',
      evidence: {},
      history: {},
    }),
    maxTokens: 2000,
    temperature: 0.3,
  })

  const result = parseJsonResponse<{
    verdict: string; confidence_score: number; reasoning: string;
    refund_amount: number; payout_to_supplier: number;
    recommended_action: string; lessons_learned: string[];
    human_review_needed: boolean; escalation_reason: string | null;
  }>(text)

  const { data: created } = await supabaseAdmin.from('dispute_resolutions').insert({
    booking_id: args.bookingId,
    verdict: result.verdict,
    confidence_score: result.confidence_score,
    reasoning: result.reasoning,
    recommended_action: result.recommended_action,
    refund_amount: result.refund_amount,
    payout_to_supplier: result.payout_to_supplier,
  } as never).select('id').single()

  return { dispute_id: (created as { id?: string } | null)?.id, verdict: result.verdict }
}

// =============================================================================
// INTELLIGENCE TEAM
// =============================================================================

// PRICING OPTIMIZER
export async function runPricingOptimizer(args?: { listingId?: string }): Promise<Record<string, unknown>> {
  let listing: Record<string, unknown> | null = null

  if (args?.listingId) {
    const { data } = await supabaseAdmin
      .from('listings').select('id, title, category_id, city, district, bookings_count, views_count, rating')
      .eq('id', args.listingId).maybeSingle()
    listing = data as Record<string, unknown> | null
  } else {
    // Pick top-viewed listing without recent pricing suggestion
    const { data: candidates } = await supabaseAdmin
      .from('listings').select('id, title, category_id, city, district, bookings_count, views_count, rating')
      .eq('status', 'published').order('views_count', { ascending: false }).limit(10)
    type L = { id: string }
    const rows = ((candidates ?? []) as Array<L & Record<string, unknown>>)
    for (const c of rows) {
      const { count } = await supabaseAdmin.from('pricing_suggestions')
        .select('*', { count: 'exact', head: true }).eq('listing_id', c.id)
        .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
      if ((count ?? 0) === 0) { listing = c; break }
    }
  }

  if (!listing) return { skipped: true, reason: 'no eligible listings' }

  // Get current pricing rule
  const { data: pricingRules } = await supabaseAdmin
    .from('pricing_rules').select('amount').eq('listing_id', listing.id).limit(1)
  const currentPrice = ((pricingRules ?? []) as Array<{ amount: number }>)[0]?.amount ?? 250

  const text = await callClaude({
    systemPrompt: PRICING_OPTIMIZER_PROMPT,
    userMessage: JSON.stringify({
      listing: { ...listing, current_price: currentPrice },
      category_avg_price: 250,
      competitor_prices: [200, 280, 320, 240, 300],
      demand_signals: { searches_for_category: 50, season: 'summer', trending: true },
    }),
    maxTokens: 1500,
    temperature: 0.4,
  })

  const result = parseJsonResponse<{
    current_price: number; suggested_price: number; price_change_pct: number;
    reasoning: string; market_signals: Record<string, unknown>;
    expected_impact: string; confidence: string;
    rule_type: string; rule_details: Record<string, unknown>;
    risks: string;
  }>(text)

  const { data: created } = await supabaseAdmin.from('pricing_suggestions').insert({
    listing_id: listing.id,
    current_price: result.current_price,
    suggested_price: result.suggested_price,
    price_change_pct: result.price_change_pct,
    reasoning: result.reasoning,
    market_signals: result.market_signals,
    expected_impact: result.expected_impact,
    confidence: result.confidence,
    rule_type: result.rule_type,
    rule_details: result.rule_details,
  } as never).select('id').single()

  return {
    suggestion_id: (created as { id?: string } | null)?.id,
    listing_id: listing.id,
    current: result.current_price,
    suggested: result.suggested_price,
    change_pct: result.price_change_pct,
  }
}

// FRAUD DETECTOR
export async function runFraudDetector(): Promise<Record<string, unknown>> {
  // Scan recent bookings & users for patterns
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const [bookings, users, listings] = await Promise.all([
    supabaseAdmin.from('marketplace_bookings').select('*').gte('created_at', oneDayAgo).limit(50),
    supabaseAdmin.from('profiles').select('id, full_name, phone, created_at').gte('created_at', oneDayAgo).limit(50),
    supabaseAdmin.from('listings').select('id, title, description, supplier_id').eq('status', 'published').gte('created_at', oneDayAgo).limit(20),
  ])

  const text = await callClaude({
    systemPrompt: FRAUD_DETECTOR_PROMPT,
    userMessage: JSON.stringify({
      scan_type: 'aggregate',
      data: {
        recent_bookings: bookings.data ?? [],
        recent_users: users.data ?? [],
        recent_listings: listings.data ?? [],
      },
      context: {
        platform_avg_price_per_category: 250,
      },
    }),
    maxTokens: 2500,
    temperature: 0.3,
  })

  const result = parseJsonResponse<{
    alerts: Array<Record<string, unknown>>;
    summary: string;
    priority_alerts_count: number;
  }>(text)

  // Save alerts to DB
  for (const alert of result.alerts) {
    await supabaseAdmin.from('fraud_alerts').insert({
      alert_type: alert.alert_type,
      target_type: alert.target_type,
      target_id: alert.target_id,
      severity: alert.severity,
      confidence_score: alert.confidence_score,
      description: alert.description,
      evidence: alert.evidence,
      recommended_action: alert.recommended_action,
    } as never)

    // Critical alerts → also create insight
    if (alert.severity === 'critical' || alert.severity === 'high') {
      await supabaseAdmin.from('agent_insights').insert({
        agent_name: 'fraud-detector',
        insight_type: 'risk',
        title: `🚨 ${alert.alert_type}: ${alert.description}`,
        description: alert.description as string,
        priority: 'high',
        recommended_action: alert.recommended_action as string,
        data_points: alert,
      } as never)
    }
  }

  return {
    alerts_generated: result.alerts.length,
    priority_alerts: result.priority_alerts_count,
    summary: result.summary,
  }
}

// DEMAND FORECASTER
export async function runDemandForecaster(): Promise<Record<string, unknown>> {
  // Pull category data
  const [listings, bookings] = await Promise.all([
    supabaseAdmin.from('listings').select('category_id').eq('status', 'published').limit(500),
    supabaseAdmin.from('marketplace_bookings').select('listing_id, created_at').gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()).limit(500),
  ])

  const listingCounts: Record<string, number> = {}
  ;((listings.data ?? []) as Array<{ category_id: string }>).forEach(l => {
    listingCounts[l.category_id] = (listingCounts[l.category_id] ?? 0) + 1
  })

  const text = await callClaude({
    systemPrompt: DEMAND_FORECASTER_PROMPT,
    userMessage: JSON.stringify({
      current_state: {
        category_listings_count: listingCounts,
        category_bookings_30d: (bookings.data ?? []).length,
      },
      egypt_calendar: {
        current_date: new Date().toISOString().split('T')[0],
        upcoming_events: ['الصيف', 'موسم التخرج', 'الأعياد القومية'],
      },
    }),
    maxTokens: 3000,
    temperature: 0.5,
  })

  const result = parseJsonResponse<{
    forecasts: Array<Record<string, unknown>>;
    summary: string;
    top_opportunity: string;
    biggest_risk: string;
  }>(text)

  // Save forecasts
  for (const forecast of result.forecasts) {
    await supabaseAdmin.from('demand_forecasts').insert({
      forecast_date: new Date().toISOString().split('T')[0],
      forecast_period: forecast.forecast_period,
      category: forecast.category,
      predicted_searches: forecast.predicted_searches,
      predicted_bookings: forecast.predicted_bookings,
      current_supply: forecast.current_supply,
      supply_gap: forecast.supply_gap,
      confidence: forecast.confidence,
      contributing_factors: forecast.contributing_factors,
      recommended_action: forecast.recommended_action,
    } as never)
  }

  return {
    forecasts_count: result.forecasts.length,
    top_opportunity: result.top_opportunity,
    biggest_risk: result.biggest_risk,
  }
}

// =============================================================================
// GROWTH TEAM
// =============================================================================

// PARTNERSHIP SCOUT
export async function runPartnershipScout(): Promise<Record<string, unknown>> {
  const text = await callClaude({
    systemPrompt: PARTNERSHIP_SCOUT_PROMPT,
    userMessage: JSON.stringify({
      current_categories: ['كاميرات', 'كوورك', 'شقق', 'سيارات', 'معدات تصوير'],
      geographic_focus: 'Cairo, Egypt',
      budget_egp: 5000,
      our_audience: 'فريلانسرز، صناع محتوى، شركات صغيرة',
    }),
    maxTokens: 4000,
    temperature: 0.7,
  })

  const result = parseJsonResponse<{
    opportunities: Array<Record<string, unknown>>;
    summary: string;
  }>(text)

  for (const opp of result.opportunities) {
    await supabaseAdmin.from('partnership_opportunities').insert({
      partner_type: opp.partner_type,
      partner_name: opp.partner_name,
      partner_handle: opp.partner_handle,
      partner_size: opp.partner_size,
      opportunity_summary: opp.opportunity_summary,
      pitch_angle: opp.pitch_angle,
      potential_value: opp.potential_value,
      effort_level: opp.effort_level,
      priority: opp.priority,
      outreach_message: opp.outreach_message,
    } as never)
  }

  return {
    opportunities_count: result.opportunities.length,
    summary: result.summary.slice(0, 100),
  }
}

// CONTENT PERSONALIZER
export async function runContentPersonalizer(args?: { customerId?: string }): Promise<Record<string, unknown>> {
  let customer: Record<string, unknown> | null = null

  if (args?.customerId) {
    const { data } = await supabaseAdmin
      .from('profiles').select('id, full_name, phone, created_at')
      .eq('id', args.customerId).maybeSingle()
    customer = data as Record<string, unknown> | null
  } else {
    // Pick a customer with bookings but no recent personalization
    const { data: bookings } = await supabaseAdmin
      .from('marketplace_bookings').select('customer_profile_id').limit(20)
    type B = { customer_profile_id: string }
    const customerIds = Array.from(new Set(((bookings ?? []) as B[]).map(b => b.customer_profile_id)))

    for (const cid of customerIds) {
      const { count } = await supabaseAdmin.from('personalized_recommendations')
        .select('*', { count: 'exact', head: true }).eq('customer_profile_id', cid)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      if ((count ?? 0) === 0) {
        const { data: c } = await supabaseAdmin.from('profiles')
          .select('id, full_name, phone, created_at').eq('id', cid).maybeSingle()
        customer = c as Record<string, unknown> | null
        if (customer) break
      }
    }
  }

  if (!customer) return { skipped: true, reason: 'no eligible customer' }

  // Get customer's history
  const { data: previousBookings } = await supabaseAdmin
    .from('marketplace_bookings').select('listing_id, total_amount, created_at')
    .eq('customer_profile_id', customer.id).limit(10)

  // Get available listings
  const { data: availableListings } = await supabaseAdmin
    .from('listings').select('id, title, category_id, city, district, bookings_count, rating')
    .eq('status', 'published').order('rating', { ascending: false }).limit(20)

  const text = await callClaude({
    systemPrompt: CONTENT_PERSONALIZER_PROMPT,
    userMessage: JSON.stringify({
      customer: {
        name: customer.full_name,
        previous_bookings: previousBookings ?? [],
      },
      available_listings: availableListings ?? [],
    }),
    maxTokens: 2000,
    temperature: 0.7,
  })

  const result = parseJsonResponse<{
    customer_segment: string; primary_interest: string;
    recommendations: Array<Record<string, unknown>>;
    delivery_message: string; best_send_time: string;
    expected_conversion: string; reasoning: string;
  }>(text)

  const { data: created } = await supabaseAdmin.from('personalized_recommendations').insert({
    customer_profile_id: customer.id,
    customer_phone: customer.phone,
    recommendation_type: 'listings',
    recommendations: result.recommendations,
    reasoning: result.reasoning,
    delivery_channel: 'whatsapp',
  } as never).select('id').single()

  return {
    rec_id: (created as { id?: string } | null)?.id,
    customer_id: customer.id,
    recommendations_count: result.recommendations.length,
    expected_conversion: result.expected_conversion,
  }
}
