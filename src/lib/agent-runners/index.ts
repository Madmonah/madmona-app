// src/lib/agent-runners/index.ts
// Generic agent dispatch — given an agent_name, runs the appropriate agent

import { supabase as supabaseAdmin } from '@/lib/supabase'
import { callClaude, parseJsonResponse } from '@/lib/anthropic'
import { sendText, upsertConversation } from '@/lib/whatsapp'
import { sendEmail } from '@/lib/email'

import { SUPPLIER_HUNTER_PROMPT } from '@/lib/agent-prompts/supplier-hunter'
import { SUPPLIER_ONBOARDING_PROMPT } from '@/lib/agent-prompts/supplier-onboarding'
import { SUPPLIER_REACTIVATION_PROMPT } from '@/lib/agent-prompts/supplier-reactivation'
import { LEAD_QUALIFIER_PROMPT } from '@/lib/agent-prompts/lead-qualifier'
import { CUSTOMER_CONCIERGE_PROMPT } from '@/lib/agent-prompts/customer-concierge'
import { BOOKING_CLOSER_PROMPT } from '@/lib/agent-prompts/booking-closer'
import { CART_ABANDONER_PROMPT } from '@/lib/agent-prompts/cart-abandoner'
import { UPSELL_PROMPT } from '@/lib/agent-prompts/upsell-agent'
import { FOLLOW_UP_PROMPT } from '@/lib/agent-prompts/follow-up-agent'
import { LISTING_OPTIMIZER_PROMPT } from '@/lib/agent-prompts/listing-optimizer'
import { SEO_AGENT_PROMPT } from '@/lib/agent-prompts/seo-agent'
import { WHATSAPP_BROADCASTER_PROMPT } from '@/lib/agent-prompts/whatsapp-broadcaster'
import { EMAIL_CAMPAIGNER_PROMPT } from '@/lib/agent-prompts/email-campaigner'
import { TREND_SPOTTER_PROMPT } from '@/lib/agent-prompts/trend-spotter'
import { COMPETITOR_WATCHER_PROMPT } from '@/lib/agent-prompts/competitor-watcher'
import { REVIEW_GENERATOR_PROMPT } from '@/lib/agent-prompts/review-generator'
import { REFERRAL_AGENT_PROMPT } from '@/lib/agent-prompts/referral-agent'

// ============================================================================
// Generic helpers
// ============================================================================

const OWNER_EMAIL = 'madmona.admin@gmail.com'

async function logRun(args: {
  agentName: string
  triggerType: string
  status: 'started' | 'success' | 'error'
  inputPayload?: Record<string, unknown>
  outputSummary?: Record<string, unknown>
  errorMessage?: string
  durationMs?: number
}): Promise<string | undefined> {
  const row = {
    agent_name: args.agentName,
    trigger_type: args.triggerType,
    status: args.status,
    input_payload: args.inputPayload ?? null,
    output_summary: args.outputSummary ?? null,
    error_message: args.errorMessage ?? null,
    finished_at: args.status !== 'started' ? new Date().toISOString() : null,
    duration_ms: args.durationMs ?? null,
  }

  if (args.status === 'started') {
    const { data } = await supabaseAdmin
      .from('agent_runs')
      .insert(row as never)
      .select('id')
      .single()
    return (data as { id?: string } | null)?.id
  }
  return undefined
}

async function updateRun(runId: string, args: {
  status: 'success' | 'error'
  outputSummary?: Record<string, unknown>
  errorMessage?: string
  durationMs: number
}): Promise<void> {
  await supabaseAdmin
    .from('agent_runs')
    .update({
      status: args.status,
      finished_at: new Date().toISOString(),
      duration_ms: args.durationMs,
      output_summary: args.outputSummary ?? null,
      error_message: args.errorMessage ?? null,
    } as never)
    .eq('id', runId)
}

async function markRan(agentName: string, success: boolean): Promise<void> {
  await supabaseAdmin.rpc('mark_agent_ran', {
    p_agent_name: agentName,
    p_success: success,
  })
}

// ============================================================================
// Individual agent runners
// ============================================================================

export interface AgentResult {
  success: boolean
  agent: string
  output_summary?: Record<string, unknown>
  error?: string
  duration_ms: number
}

// SUPPLIER HUNTER
async function runSupplierHunter(): Promise<Record<string, unknown>> {
  const userMsg = JSON.stringify({
    current_categories: ['كاميرات', 'شقق', 'سيارات', 'كوورك', 'معدات تصوير'],
    our_supplier_count: 5,
    our_listing_count: 206,
  })
  const text = await callClaude({
    systemPrompt: SUPPLIER_HUNTER_PROMPT,
    userMessage: userMsg,
    maxTokens: 1500,
    temperature: 0.7,
  })
  const result = parseJsonResponse<Record<string, unknown>>(text)
  // Email the brief to owner
  await sendEmail({
    to: OWNER_EMAIL,
    subject: `🎯 صياد المؤجرين — ${result.target_niche ?? 'فرصة جديدة'}`,
    html: `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;line-height:1.7;padding:20px;max-width:640px;margin:0 auto">
      <h2 style="color:#1F5F3F">🎯 ${result.target_niche ?? ''}</h2>
      <p><strong>القيمة المقترحة:</strong><br>${result.value_proposition ?? ''}</p>
      <p><strong>السبب:</strong><br>${result.rationale ?? ''}</p>
      <p><strong>كلمات بحث عربي:</strong> ${(result.search_keywords_arabic as string[] || []).join('، ')}</p>
      <p><strong>كلمات بحث English:</strong> ${(result.search_keywords_english as string[] || []).join(', ')}</p>
      <p><strong>قنوات مقترحة:</strong> ${(result.outreach_channels as string[] || []).join('، ')}</p>
    </div>`,
  })
  return { niche: result.target_niche, sent_email: true }
}

// SUPPLIER ONBOARDING — finds suppliers signed up 2-6h ago without listings
async function runSupplierOnboarding(): Promise<Record<string, unknown>> {
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

  const { data: suppliers } = await supabaseAdmin
    .from('marketplace_suppliers')
    .select('id, profile_id, business_name, account_type')
    .gte('created_at', sixHoursAgo)
    .lte('created_at', twoHoursAgo)
    .limit(20)

  type SRow = { id: string; profile_id: string; business_name: string; account_type: string }
  const rows = (suppliers ?? []) as SRow[]
  let sent = 0
  for (const s of rows) {
    const { count } = await supabaseAdmin
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('supplier_id', s.id)
    if ((count ?? 0) > 0) continue

    const { count: outreachCount } = await supabaseAdmin
      .from('outreach_log')
      .select('*', { count: 'exact', head: true })
      .eq('agent_name', 'supplier-onboarding')
      .eq('target_id', s.id)
    if ((outreachCount ?? 0) > 0) continue

    const { data: p } = await supabaseAdmin
      .from('profiles')
      .select('full_name, phone')
      .eq('id', s.profile_id)
      .maybeSingle()
    type P = { full_name: string | null; phone: string | null }
    const profile = p as P | null
    if (!profile?.phone) continue

    const text = await callClaude({
      systemPrompt: SUPPLIER_ONBOARDING_PROMPT,
      userMessage: JSON.stringify({
        full_name: profile.full_name,
        business_name: s.business_name,
        account_type: s.account_type,
        listings_count: 0,
        hours_since_signup: 4,
      }),
      maxTokens: 1024,
      temperature: 0.7,
    })
    const out = parseJsonResponse<{ message: string; next_action_link: string }>(text)

    const convId = await upsertConversation({
      phone: profile.phone,
      name: profile.full_name ?? s.business_name,
      contactType: 'existing_supplier',
      supplierId: s.id,
      profileId: s.profile_id,
      agentName: 'supplier-onboarding',
    })

    const send = await sendText({
      to: profile.phone,
      body: out.message,
      conversationId: convId ?? undefined,
      agentName: 'supplier-onboarding',
      aiGenerated: true,
    })

    await supabaseAdmin.from('outreach_log').insert({
      agent_name: 'supplier-onboarding',
      target_type: 'supplier',
      target_id: s.id,
      channel: 'whatsapp',
      phone: profile.phone,
      message_text: out.message,
      body: out.message,
      status: send.ok ? 'sent' : 'failed',
      sent_at: send.ok ? new Date().toISOString() : null,
      external_id: send.wa_message_id ?? null,
      model_used: 'claude-sonnet-4-5',
      metadata: { conversation_id: convId },
    } as never)

    if (send.ok) sent++
  }
  return { found: rows.length, sent }
}

// SUPPLIER ACTIVATION — activates suppliers without listings (uses existing route logic)
async function runSupplierActivation(): Promise<Record<string, unknown>> {
  // Delegate to dedicated route by self-fetching, OR replicate logic here.
  // Easier: call the dedicated supplier-outreach route logic.
  const { data: candidates } = await supabaseAdmin
    .from('marketplace_suppliers')
    .select('id, profile_id, business_name, business_name_en, account_type')
    .eq('kyc_status', 'approved')
    .order('created_at', { ascending: true })
    .limit(50)

  type S = { id: string; profile_id: string; business_name: string; business_name_en: string | null; account_type: string }
  const rows = (candidates ?? []) as S[]
  let sent = 0
  for (const s of rows) {
    if (sent >= 50) break

    const { count: lcount } = await supabaseAdmin
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('supplier_id', s.id)
    if ((lcount ?? 0) > 0) continue

    const { count: ocount } = await supabaseAdmin
      .from('outreach_log')
      .select('*', { count: 'exact', head: true })
      .eq('agent_name', 'supplier-activation')
      .eq('target_id', s.id)
    if ((ocount ?? 0) > 0) continue

    // Use supplier-onboarding prompt for now; future: own prompt
    const { data: p } = await supabaseAdmin
      .from('profiles')
      .select('full_name, phone')
      .eq('id', s.profile_id)
      .maybeSingle()
    type P = { full_name: string | null; phone: string | null }
    const profile = p as P | null
    if (!profile?.phone) continue

    const text = await callClaude({
      systemPrompt: SUPPLIER_ONBOARDING_PROMPT,
      userMessage: JSON.stringify({
        full_name: profile.full_name,
        business_name: s.business_name,
        account_type: s.account_type,
        listings_count: 0,
        hours_since_signup: 168,
      }),
      maxTokens: 1024,
      temperature: 0.7,
    })
    const out = parseJsonResponse<{ message: string }>(text)

    const convId = await upsertConversation({
      phone: profile.phone,
      name: profile.full_name ?? s.business_name,
      contactType: 'existing_supplier',
      supplierId: s.id,
      profileId: s.profile_id,
      agentName: 'supplier-activation',
    })

    const send = await sendText({
      to: profile.phone,
      body: out.message,
      conversationId: convId ?? undefined,
      agentName: 'supplier-activation',
      aiGenerated: true,
    })

    await supabaseAdmin.from('outreach_log').insert({
      agent_name: 'supplier-activation',
      target_type: 'supplier',
      target_id: s.id,
      channel: 'whatsapp',
      phone: profile.phone,
      message_text: out.message,
      body: out.message,
      status: send.ok ? 'sent' : 'failed',
      sent_at: send.ok ? new Date().toISOString() : null,
      external_id: send.wa_message_id ?? null,
      model_used: 'claude-sonnet-4-5',
      metadata: { conversation_id: convId },
    } as never)

    if (send.ok) sent++
  }
  return { found: rows.length, sent }
}

// SUPPLIER REACTIVATION
async function runSupplierReactivation(): Promise<Record<string, unknown>> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Find suppliers whose latest listing is > 30 days old
  const { data: suppliers } = await supabaseAdmin
    .from('marketplace_suppliers')
    .select('id, profile_id, business_name, account_type')
    .eq('kyc_status', 'approved')
    .limit(100)

  type S = { id: string; profile_id: string; business_name: string; account_type: string }
  const rows = (suppliers ?? []) as S[]
  let sent = 0
  for (const s of rows) {
    if (sent >= 20) break
    // Check latest listing
    const { data: lastListing } = await supabaseAdmin
      .from('listings')
      .select('id, created_at')
      .eq('supplier_id', s.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    type L = { id: string; created_at: string }
    const ll = lastListing as L | null
    if (!ll || ll.created_at > thirtyDaysAgo) continue

    // Already reactivated?
    const { count } = await supabaseAdmin
      .from('outreach_log')
      .select('*', { count: 'exact', head: true })
      .eq('agent_name', 'supplier-reactivation')
      .eq('target_id', s.id)
    if ((count ?? 0) > 0) continue

    const { data: p } = await supabaseAdmin
      .from('profiles')
      .select('full_name, phone')
      .eq('id', s.profile_id)
      .maybeSingle()
    type P = { full_name: string | null; phone: string | null }
    const profile = p as P | null
    if (!profile?.phone) continue

    const text = await callClaude({
      systemPrompt: SUPPLIER_REACTIVATION_PROMPT,
      userMessage: JSON.stringify({
        full_name: profile.full_name,
        business_name: s.business_name,
        last_listing_date: ll.created_at,
        days_inactive: Math.floor((Date.now() - new Date(ll.created_at).getTime()) / 86400000),
      }),
      maxTokens: 1024,
      temperature: 0.7,
    })
    const out = parseJsonResponse<{ message: string }>(text)

    const send = await sendText({
      to: profile.phone,
      body: out.message,
      agentName: 'supplier-reactivation',
      aiGenerated: true,
    })

    await supabaseAdmin.from('outreach_log').insert({
      agent_name: 'supplier-reactivation',
      target_type: 'supplier',
      target_id: s.id,
      channel: 'whatsapp',
      phone: profile.phone,
      message_text: out.message,
      body: out.message,
      status: send.ok ? 'sent' : 'failed',
      sent_at: send.ok ? new Date().toISOString() : null,
      external_id: send.wa_message_id ?? null,
      model_used: 'claude-sonnet-4-5',
      metadata: {},
    } as never)

    if (send.ok) sent++
  }
  return { sent }
}

// LEAD QUALIFIER — scores all unscored leads in DB
async function runLeadQualifier(): Promise<Record<string, unknown>> {
  const { data: leads } = await supabaseAdmin
    .from('sales_leads')
    .select('*')
    .eq('intent', 'browse')
    .order('created_at', { ascending: false })
    .limit(20)

  type L = Record<string, unknown> & { id: string }
  const rows = (leads ?? []) as L[]
  let scored = 0
  for (const l of rows) {
    const text = await callClaude({
      systemPrompt: LEAD_QUALIFIER_PROMPT,
      userMessage: JSON.stringify(l),
      maxTokens: 512,
      temperature: 0.3,
    })
    const out = parseJsonResponse<{ lead_score: number; intent_suggested: string }>(text)
    await supabaseAdmin
      .from('sales_leads')
      .update({
        lead_score: out.lead_score,
        intent: out.intent_suggested,
      } as never)
      .eq('id', l.id)
    scored++
  }
  return { scored }
}

// BOOKING CLOSER — for each qualified lead, send booking-closer message
async function runBookingCloser(): Promise<Record<string, unknown>> {
  const { data: leads } = await supabaseAdmin
    .from('sales_leads')
    .select('*')
    .eq('intent', 'qualified')
    .gte('lead_score', 70)
    .order('lead_score', { ascending: false })
    .limit(20)

  type L = {
    id: string
    contact_name: string | null
    contact_phone: string | null
    interested_listing_id: string | null
    lead_score: number
    created_at: string
  }
  const rows = (leads ?? []) as L[]
  let sent = 0
  for (const l of rows) {
    if (!l.contact_phone) continue

    let listingInfo: Record<string, unknown> = {}
    if (l.interested_listing_id) {
      const { data: listing } = await supabaseAdmin
        .from('listings')
        .select('id, title, base_price, category')
        .eq('id', l.interested_listing_id)
        .maybeSingle()
      listingInfo = (listing as Record<string, unknown>) ?? {}
    }

    const text = await callClaude({
      systemPrompt: BOOKING_CLOSER_PROMPT,
      userMessage: JSON.stringify({
        contact_name: l.contact_name,
        interested_listing: listingInfo,
        lead_score: l.lead_score,
        days_since_first_action: Math.floor((Date.now() - new Date(l.created_at).getTime()) / 86400000),
      }),
      maxTokens: 1024,
      temperature: 0.7,
    })
    const out = parseJsonResponse<{ message: string }>(text)

    const send = await sendText({
      to: l.contact_phone,
      body: out.message,
      agentName: 'booking-closer',
      aiGenerated: true,
    })

    if (send.ok) {
      sent++
      await supabaseAdmin.from('outreach_log').insert({
        agent_name: 'booking-closer',
        target_type: 'lead',
        target_id: l.id,
        channel: 'whatsapp',
        phone: l.contact_phone,
        message_text: out.message,
        body: out.message,
        status: 'sent',
        sent_at: new Date().toISOString(),
        external_id: send.wa_message_id ?? null,
        model_used: 'claude-sonnet-4-5',
        metadata: { lead_score: l.lead_score },
      } as never)
    }
  }
  return { sent }
}

// CART ABANDONER
async function runCartAbandoner(): Promise<Record<string, unknown>> {
  const { data: leads } = await supabaseAdmin
    .from('sales_leads')
    .select('*')
    .eq('intent', 'checkout_started')
    .order('last_action_at', { ascending: false })
    .limit(15)

  type L = {
    id: string
    contact_name: string | null
    contact_phone: string | null
    interested_listing_id: string | null
    last_action_at: string
  }
  const rows = (leads ?? []) as L[]
  let sent = 0
  for (const l of rows) {
    if (!l.contact_phone) continue
    const minutesAgo = Math.floor((Date.now() - new Date(l.last_action_at).getTime()) / 60000)
    if (minutesAgo < 60 || minutesAgo > 180) continue // 1-3 hours window

    let listingTitle = ''
    if (l.interested_listing_id) {
      const { data: listing } = await supabaseAdmin
        .from('listings')
        .select('title')
        .eq('id', l.interested_listing_id)
        .maybeSingle()
      listingTitle = (listing as { title?: string } | null)?.title ?? ''
    }

    const text = await callClaude({
      systemPrompt: CART_ABANDONER_PROMPT,
      userMessage: JSON.stringify({
        contact_name: l.contact_name,
        listing: { id: l.interested_listing_id, title: listingTitle },
        abandoned_at_step: 'details',
        minutes_since_abandon: minutesAgo,
      }),
      maxTokens: 1024,
      temperature: 0.7,
    })
    const out = parseJsonResponse<{ message: string }>(text)
    const send = await sendText({
      to: l.contact_phone,
      body: out.message,
      agentName: 'cart-abandoner',
      aiGenerated: true,
    })
    if (send.ok) sent++
  }
  return { sent }
}

// UPSELL
async function runUpsell(): Promise<Record<string, unknown>> {
  // Find customers with at least 1 booking, last booked 7 days ago
  const { data: bookings } = await supabaseAdmin
    .from('marketplace_bookings')
    .select('id, customer_profile_id, listing_id, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  type B = { id: string; customer_profile_id: string; listing_id: string; created_at: string }
  const rows = (bookings ?? []) as B[]
  let sent = 0
  for (const b of rows) {
    const daysAgo = Math.floor((Date.now() - new Date(b.created_at).getTime()) / 86400000)
    if (daysAgo < 7 || daysAgo > 14) continue

    const { count } = await supabaseAdmin
      .from('outreach_log')
      .select('*', { count: 'exact', head: true })
      .eq('agent_name', 'upsell-agent')
      .eq('target_id', b.customer_profile_id)
    if ((count ?? 0) > 0) continue

    const { data: p } = await supabaseAdmin
      .from('profiles')
      .select('full_name, phone')
      .eq('id', b.customer_profile_id)
      .maybeSingle()
    type P = { full_name: string | null; phone: string | null }
    const profile = p as P | null
    if (!profile?.phone) continue

    const { data: recommended } = await supabaseAdmin
      .from('listings')
      .select('id, title, category, base_price')
      .neq('id', b.listing_id)
      .limit(3)
    const recs = (recommended ?? []) as Array<Record<string, unknown>>

    const text = await callClaude({
      systemPrompt: UPSELL_PROMPT,
      userMessage: JSON.stringify({
        contact_name: profile.full_name,
        recommended_listings: recs,
      }),
      maxTokens: 1024,
      temperature: 0.7,
    })
    const out = parseJsonResponse<{ message: string }>(text)
    const send = await sendText({ to: profile.phone, body: out.message, agentName: 'upsell-agent', aiGenerated: true })
    if (send.ok) {
      sent++
      await supabaseAdmin.from('outreach_log').insert({
        agent_name: 'upsell-agent',
        target_type: 'customer',
        target_id: b.customer_profile_id,
        channel: 'whatsapp',
        phone: profile.phone,
        message_text: out.message,
        body: out.message,
        status: 'sent',
        sent_at: new Date().toISOString(),
        external_id: send.wa_message_id ?? null,
        model_used: 'claude-sonnet-4-5',
        metadata: {},
      } as never)
    }
  }
  return { sent }
}

// FOLLOW UP
async function runFollowUp(): Promise<Record<string, unknown>> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  const { data: bookings } = await supabaseAdmin
    .from('marketplace_bookings')
    .select('id, customer_profile_id, listing_id, created_at')
    .gte('created_at', twoDaysAgo)
    .lte('created_at', oneDayAgo)
    .limit(20)

  type B = { id: string; customer_profile_id: string; listing_id: string }
  const rows = (bookings ?? []) as B[]
  let sent = 0
  for (const b of rows) {
    const { count } = await supabaseAdmin
      .from('outreach_log')
      .select('*', { count: 'exact', head: true })
      .eq('agent_name', 'follow-up-agent')
      .eq('target_id', b.id)
    if ((count ?? 0) > 0) continue

    const { data: p } = await supabaseAdmin
      .from('profiles')
      .select('full_name, phone')
      .eq('id', b.customer_profile_id)
      .maybeSingle()
    type P = { full_name: string | null; phone: string | null }
    const profile = p as P | null
    if (!profile?.phone) continue

    const { data: listing } = await supabaseAdmin
      .from('listings')
      .select('title')
      .eq('id', b.listing_id)
      .maybeSingle()
    const listingTitle = (listing as { title?: string } | null)?.title ?? ''

    const text = await callClaude({
      systemPrompt: FOLLOW_UP_PROMPT,
      userMessage: JSON.stringify({
        contact_name: profile.full_name,
        booking: { listing_title: listingTitle, end_date: 'recent' },
        hours_since_completion: 24,
      }),
      maxTokens: 1024,
      temperature: 0.7,
    })
    const out = parseJsonResponse<{ message: string }>(text)
    const send = await sendText({ to: profile.phone, body: out.message, agentName: 'follow-up-agent', aiGenerated: true })
    if (send.ok) {
      sent++
      await supabaseAdmin.from('outreach_log').insert({
        agent_name: 'follow-up-agent',
        target_type: 'booking',
        target_id: b.id,
        channel: 'whatsapp',
        phone: profile.phone,
        message_text: out.message,
        body: out.message,
        status: 'sent',
        sent_at: new Date().toISOString(),
        external_id: send.wa_message_id ?? null,
        model_used: 'claude-sonnet-4-5',
        metadata: {},
      } as never)
    }
  }
  return { sent }
}

// LISTING OPTIMIZER
async function runListingOptimizer(): Promise<Record<string, unknown>> {
  const { data: listings } = await supabaseAdmin
    .from('listings')
    .select('id, title, description, category, base_price, location, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  type L = Record<string, unknown> & { id: string; title: string }
  const rows = (listings ?? []) as L[]
  const recommendations: Array<Record<string, unknown>> = []
  for (const l of rows) {
    const text = await callClaude({
      systemPrompt: LISTING_OPTIMIZER_PROMPT,
      userMessage: JSON.stringify({ listing: l }),
      maxTokens: 1500,
      temperature: 0.6,
    })
    const out = parseJsonResponse<Record<string, unknown>>(text)
    recommendations.push({ listing_id: l.id, listing_title: l.title, ...out })
  }

  const html = `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;line-height:1.7;padding:20px;max-width:680px;margin:0 auto">
    <h2 style="color:#1F5F3F">📝 تحسينات مقترحة لـ ${recommendations.length} إعلانات</h2>
    ${recommendations.map(r => `
      <div style="background:#FAF7F0;padding:16px;border-radius:8px;margin-bottom:16px">
        <h3>${r.listing_title}</h3>
        <p><strong>عنوان مقترح:</strong> ${r.improved_title_arabic ?? ''}</p>
        <p><strong>وصف مقترح:</strong> ${r.improved_description_arabic ?? ''}</p>
        <p><strong>ناقص:</strong> ${(r.missing_elements as string[] || []).join('، ')}</p>
      </div>
    `).join('')}
  </div>`

  await sendEmail({
    to: OWNER_EMAIL,
    subject: `📝 ${recommendations.length} تحسينات إعلانات`,
    html,
  })
  return { count: recommendations.length }
}

// SEO AGENT
async function runSeoAgent(): Promise<Record<string, unknown>> {
  const { data: categories } = await supabaseAdmin
    .from('listings')
    .select('category')
    .limit(200)
  type C = { category: string }
  const cats = (categories ?? []) as C[]
  const counts: Record<string, number> = {}
  cats.forEach(c => { counts[c.category] = (counts[c.category] ?? 0) + 1 })

  const text = await callClaude({
    systemPrompt: SEO_AGENT_PROMPT,
    userMessage: JSON.stringify({ top_categories: counts }),
    maxTokens: 2000,
    temperature: 0.5,
  })
  const out = parseJsonResponse<Record<string, unknown>>(text)

  await sendEmail({
    to: OWNER_EMAIL,
    subject: '🔍 SEO تحسينات أسبوعية',
    html: `<div dir="rtl" style="font-family:Tahoma;padding:20px"><pre>${JSON.stringify(out, null, 2)}</pre></div>`,
  })
  return { recommendations_count: Object.keys(out).length }
}

// WHATSAPP BROADCASTER (drafts only — needs human approval before send for safety)
async function runWhatsappBroadcaster(): Promise<Record<string, unknown>> {
  const text = await callClaude({
    systemPrompt: WHATSAPP_BROADCASTER_PROMPT,
    userMessage: JSON.stringify({
      audience_segment: 'active_customers',
      audience_size: 100,
      trending_categories: ['كاميرات', 'كوورك'],
    }),
    maxTokens: 1024,
    temperature: 0.7,
  })
  const out = parseJsonResponse<Record<string, unknown>>(text)

  await sendEmail({
    to: OWNER_EMAIL,
    subject: `📢 Campaign واتساب جاهز: ${out.campaign_name ?? ''}`,
    html: `<div dir="rtl" style="font-family:Tahoma;padding:20px;max-width:600px;margin:0 auto">
      <h2 style="color:#1F5F3F">📢 ${out.campaign_name ?? ''}</h2>
      <p><strong>الرسالة:</strong></p>
      <div style="background:#fff;border:1px solid #ddd;padding:16px;border-radius:8px;white-space:pre-wrap">${out.message_template ?? ''}</div>
      <p><strong>أحسن وقت:</strong> ${out.best_send_time ?? ''}</p>
      <p>راجع وأرسل من dashboard لو موافق.</p>
    </div>`,
  })
  return { drafted: true, campaign: out.campaign_name }
}

// EMAIL CAMPAIGNER
async function runEmailCampaigner(): Promise<Record<string, unknown>> {
  const text = await callClaude({
    systemPrompt: EMAIL_CAMPAIGNER_PROMPT,
    userMessage: JSON.stringify({
      audience_segment: 'all_users',
      audience_size: 200,
    }),
    maxTokens: 2000,
    temperature: 0.7,
  })
  const out = parseJsonResponse<{ subject: string; html_body: string; cta_button_text?: string; cta_link?: string }>(text)

  // Email the draft to owner for approval
  await sendEmail({
    to: OWNER_EMAIL,
    subject: `📧 Email Campaign Draft: ${out.subject}`,
    html: `<div dir="rtl" style="font-family:Tahoma;padding:20px">
      <h3>📧 Draft for review</h3>
      <p><strong>Subject:</strong> ${out.subject}</p>
      <hr>
      ${out.html_body}
    </div>`,
  })
  return { drafted: true, subject: out.subject }
}

// TREND SPOTTER
async function runTrendSpotter(): Promise<Record<string, unknown>> {
  // Stub data — in future, connect to real analytics
  const text = await callClaude({
    systemPrompt: TREND_SPOTTER_PROMPT,
    userMessage: JSON.stringify({
      category_searches_today: [{ category: 'كاميرات', count: 45, vs_avg_pct: 60 }],
      category_listings_count: { 'كاميرات': 12, 'شقق': 89 },
    }),
    maxTokens: 1500,
    temperature: 0.6,
  })
  const out = parseJsonResponse<Record<string, unknown>>(text)

  await sendEmail({
    to: OWNER_EMAIL,
    subject: '📈 Trends اليوم',
    html: `<div dir="rtl" style="font-family:Tahoma;padding:20px"><pre>${JSON.stringify(out, null, 2)}</pre></div>`,
  })
  return out
}

// COMPETITOR WATCHER
async function runCompetitorWatcher(): Promise<Record<string, unknown>> {
  const text = await callClaude({
    systemPrompt: COMPETITOR_WATCHER_PROMPT,
    userMessage: JSON.stringify({
      category: 'كاميرات',
      our_pricing_data: { avg_price_per_day: 250 },
    }),
    maxTokens: 1500,
    temperature: 0.5,
  })
  const out = parseJsonResponse<Record<string, unknown>>(text)
  await sendEmail({
    to: OWNER_EMAIL,
    subject: '🔍 مراقب المنافسين أسبوعياً',
    html: `<div dir="rtl" style="font-family:Tahoma;padding:20px"><pre>${JSON.stringify(out, null, 2)}</pre></div>`,
  })
  return out
}

// REVIEW GENERATOR
async function runReviewGenerator(): Promise<Record<string, unknown>> {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  const { data: bookings } = await supabaseAdmin
    .from('marketplace_bookings')
    .select('id, customer_profile_id, listing_id, created_at')
    .gte('created_at', fourDaysAgo)
    .lte('created_at', threeDaysAgo)
    .limit(15)

  type B = { id: string; customer_profile_id: string; listing_id: string }
  const rows = (bookings ?? []) as B[]
  let sent = 0
  for (const b of rows) {
    const { count } = await supabaseAdmin
      .from('outreach_log')
      .select('*', { count: 'exact', head: true })
      .eq('agent_name', 'review-generator')
      .eq('target_id', b.id)
    if ((count ?? 0) > 0) continue

    const { data: p } = await supabaseAdmin
      .from('profiles')
      .select('full_name, phone')
      .eq('id', b.customer_profile_id)
      .maybeSingle()
    type P = { full_name: string | null; phone: string | null }
    const profile = p as P | null
    if (!profile?.phone) continue

    const { data: listing } = await supabaseAdmin
      .from('listings')
      .select('title, category')
      .eq('id', b.listing_id)
      .maybeSingle()
    const ld = (listing as Record<string, unknown> | null) ?? {}

    const text = await callClaude({
      systemPrompt: REVIEW_GENERATOR_PROMPT,
      userMessage: JSON.stringify({
        contact_name: profile.full_name,
        booking: { listing_title: ld.title, category: ld.category },
      }),
      maxTokens: 512,
      temperature: 0.7,
    })
    const out = parseJsonResponse<{ message: string }>(text)
    const send = await sendText({ to: profile.phone, body: out.message, agentName: 'review-generator', aiGenerated: true })
    if (send.ok) {
      sent++
      await supabaseAdmin.from('outreach_log').insert({
        agent_name: 'review-generator',
        target_type: 'booking',
        target_id: b.id,
        channel: 'whatsapp',
        phone: profile.phone,
        message_text: out.message,
        body: out.message,
        status: 'sent',
        sent_at: new Date().toISOString(),
        external_id: send.wa_message_id ?? null,
        model_used: 'claude-sonnet-4-5',
        metadata: {},
      } as never)
    }
  }
  return { sent }
}

// REFERRAL AGENT
async function runReferralAgent(): Promise<Record<string, unknown>> {
  // Find customers with 3+ bookings, not yet referral-sent
  const { data: bookingsByCustomer } = await supabaseAdmin
    .from('marketplace_bookings')
    .select('customer_profile_id')
    .limit(500)
  type B = { customer_profile_id: string }
  const counts: Record<string, number> = {}
  ;((bookingsByCustomer ?? []) as B[]).forEach(b => {
    counts[b.customer_profile_id] = (counts[b.customer_profile_id] ?? 0) + 1
  })
  const eligible = Object.entries(counts).filter(([, c]) => c >= 3).map(([id]) => id)

  let sent = 0
  for (const profileId of eligible.slice(0, 10)) {
    const { count } = await supabaseAdmin
      .from('outreach_log')
      .select('*', { count: 'exact', head: true })
      .eq('agent_name', 'referral-agent')
      .eq('target_id', profileId)
    if ((count ?? 0) > 0) continue

    const { data: p } = await supabaseAdmin
      .from('profiles')
      .select('full_name, phone')
      .eq('id', profileId)
      .maybeSingle()
    type P = { full_name: string | null; phone: string | null }
    const profile = p as P | null
    if (!profile?.phone) continue

    const text = await callClaude({
      systemPrompt: REFERRAL_AGENT_PROMPT,
      userMessage: JSON.stringify({
        contact_name: profile.full_name,
        successful_bookings_count: counts[profileId],
        referral_program: { discount_for_referrer: '10%', discount_for_referee: '10%' },
      }),
      maxTokens: 1024,
      temperature: 0.7,
    })
    const out = parseJsonResponse<{ message: string }>(text)
    const send = await sendText({ to: profile.phone, body: out.message, agentName: 'referral-agent', aiGenerated: true })
    if (send.ok) {
      sent++
      await supabaseAdmin.from('outreach_log').insert({
        agent_name: 'referral-agent',
        target_type: 'customer',
        target_id: profileId,
        channel: 'whatsapp',
        phone: profile.phone,
        message_text: out.message,
        body: out.message,
        status: 'sent',
        sent_at: new Date().toISOString(),
        external_id: send.wa_message_id ?? null,
        model_used: 'claude-sonnet-4-5',
        metadata: {},
      } as never)
    }
  }
  return { sent }
}

// ============================================================================
// Master dispatch
// ============================================================================

const RUNNERS: Record<string, () => Promise<Record<string, unknown>>> = {
  'supplier-hunter': runSupplierHunter,
  'supplier-onboarding': runSupplierOnboarding,
  'supplier-activation': runSupplierActivation,
  'supplier-reactivation': runSupplierReactivation,
  'lead-qualifier': runLeadQualifier,
  'booking-closer': runBookingCloser,
  'cart-abandoner': runCartAbandoner,
  'upsell-agent': runUpsell,
  'follow-up-agent': runFollowUp,
  'listing-optimizer': runListingOptimizer,
  'seo-agent': runSeoAgent,
  'whatsapp-broadcaster': runWhatsappBroadcaster,
  'email-campaigner': runEmailCampaigner,
  'trend-spotter': runTrendSpotter,
  'competitor-watcher': runCompetitorWatcher,
  'review-generator': runReviewGenerator,
  'referral-agent': runReferralAgent,
}

export async function dispatchAgent(agentName: string): Promise<AgentResult> {
  const start = Date.now()
  const runner = RUNNERS[agentName]
  if (!runner) {
    return { success: false, agent: agentName, error: 'Unknown agent', duration_ms: 0 }
  }

  const runId = await logRun({
    agentName,
    triggerType: 'scheduler',
    status: 'started',
  })

  try {
    const summary = await runner()
    const duration = Date.now() - start
    if (runId) await updateRun(runId, { status: 'success', outputSummary: summary, durationMs: duration })
    await markRan(agentName, true)
    return { success: true, agent: agentName, output_summary: summary, duration_ms: duration }
  } catch (err) {
    const duration = Date.now() - start
    const msg = err instanceof Error ? err.message : 'unknown'
    if (runId) await updateRun(runId, { status: 'error', errorMessage: msg, durationMs: duration })
    await markRan(agentName, false)
    return { success: false, agent: agentName, error: msg, duration_ms: duration }
  }
}
