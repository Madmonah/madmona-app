// src/lib/agent-runners/index.ts
// Generic agent dispatch — given an agent_name, runs the appropriate agent

import { supabase as supabaseAdmin } from '@/lib/supabase'
import { callClaude, parseJsonResponse } from '@/lib/anthropic'
import { sendEmail } from '@/lib/email'

import { SUPPLIER_HUNTER_PROMPT } from '@/lib/agent-prompts/supplier-hunter'
import { LISTING_OPTIMIZER_PROMPT } from '@/lib/agent-prompts/listing-optimizer'
import { SEO_AGENT_PROMPT } from '@/lib/agent-prompts/seo-agent'
import { WHATSAPP_BROADCASTER_PROMPT } from '@/lib/agent-prompts/whatsapp-broadcaster'
import { EMAIL_CAMPAIGNER_PROMPT } from '@/lib/agent-prompts/email-campaigner'
import { TREND_SPOTTER_PROMPT } from '@/lib/agent-prompts/trend-spotter'
import { COMPETITOR_WATCHER_PROMPT } from '@/lib/agent-prompts/competitor-watcher'
import { CONTENT_MARKETING_PROMPT } from '@/lib/agent-prompts/content-marketing'

// Phase 2 — Creative + Operations + Strategic
import {
  runAdDesigner,
  runReelScriptWriter,
  runCarouselDesigner,
  runBookingManager,
  runQualityControl,
  runFinanceTracker,
  runCEOAssistant,
  runStrategyAgent,
} from './ai-os-runners'

// Phase 4 — Support + Intelligence + Growth
import {
  runComplaintResolver,
  runDisputeMediator,
  runPricingOptimizer,
  runFraudDetector,
  runDemandForecaster,
  runPartnershipScout,
  runContentPersonalizer,
} from './phase4-runners'

const OWNER_EMAIL = 'madmona.admin@gmail.com'

async function logRun(args: {
  agentName: string
  triggerType: string
  status: 'started' | 'success' | 'error'
  inputPayload?: Record<string, unknown>
}): Promise<string | undefined> {
  if (args.status === 'started') {
    const { data } = await supabaseAdmin
      .from('agent_runs')
      .insert({
        agent_name: args.agentName,
        trigger_type: args.triggerType,
        status: args.status,
        input_payload: args.inputPayload ?? null,
      } as never)
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

export interface AgentResult {
  success: boolean
  agent: string
  output_summary?: Record<string, unknown>
  error?: string
  duration_ms: number
}

// CONTENT MARKETING
async function runContentMarketing(): Promise<Record<string, unknown>> {
  const today = new Date().toISOString().split('T')[0]
  const day = new Date().getDate()
  const mod = day % 3
  const categoryHint = mod === 1 ? 'A (Marketplace)' : mod === 2 ? 'B (Coworking)' : 'C (Brand)'
  const { count: totalListings } = await supabaseAdmin.from('listings').select('*', { count: 'exact', head: true })
  const { count: totalSuppliers } = await supabaseAdmin.from('marketplace_suppliers').select('*', { count: 'exact', head: true })
  const userMessage = `النهارده ${today}. اعمل بوست من فئة: ${categoryHint}.
السياق: ${totalListings} إعلان، ${totalSuppliers} مؤجر.
اكتب بوست أصلي مش متكرر.`
  const text = await callClaude({
    systemPrompt: CONTENT_MARKETING_PROMPT,
    userMessage, maxTokens: 2048, temperature: 0.85,
  })
  const post = parseJsonResponse<{
    category: string; topic: string; headline: string; caption: string;
    hashtags: string[]; cta: string; design_brief: string; best_posting_time: string;
  }>(text)
  const { data: contentRow } = await supabaseAdmin
    .from('content_calendar').insert({
      content_type: 'instagram_post', title: post.topic, body: post.caption,
      hashtags: post.hashtags, cta: post.cta, design_brief: post.design_brief,
      status: 'drafted', agent_name: 'content-marketing', category: post.category,
      language: 'ar', metadata: { headline: post.headline, best_posting_time: post.best_posting_time },
    } as never).select('id').single()
  const contentId = (contentRow as { id?: string } | null)?.id
  await sendEmail({
    to: OWNER_EMAIL,
    subject: `📝 بوست النهارده — ${post.topic}`,
    html: `<div dir="rtl" style="font-family:Tahoma;padding:20px"><h2 style="color:#1F5F3F">${post.topic}</h2><div style="background:#FAF7F0;padding:16px;border-radius:8px;white-space:pre-wrap">${post.caption}</div><p>Content ID: ${contentId}</p></div>`,
  })
  return { topic: post.topic, content_id: contentId }
}

async function runAnalyticsReporter(): Promise<Record<string, unknown>> {
  const { data: kpis } = await supabaseAdmin.rpc('compute_daily_kpis')
  const k = (kpis ?? {}) as Record<string, unknown>
  return k
}

async function runSupplierHunter(): Promise<Record<string, unknown>> {
  const text = await callClaude({
    systemPrompt: SUPPLIER_HUNTER_PROMPT,
    userMessage: JSON.stringify({
      current_categories: ['كاميرات', 'شقق', 'سيارات', 'كوورك'],
      our_supplier_count: 6, our_listing_count: 212,
    }),
    maxTokens: 1500, temperature: 0.7,
  })
  const result = parseJsonResponse<Record<string, unknown>>(text)
  await sendEmail({
    to: OWNER_EMAIL,
    subject: `🎯 صياد المؤجرين — ${result.target_niche ?? 'فرصة جديدة'}`,
    html: `<div dir="rtl" style="font-family:Tahoma;padding:20px"><h2>${result.target_niche ?? ''}</h2><p>${result.value_proposition ?? ''}</p></div>`,
  })
  return { niche: result.target_niche }
}

async function runSupplierOnboarding(): Promise<Record<string, unknown>> { return { skipped: true } }
async function runSupplierActivation(): Promise<Record<string, unknown>> { return { skipped: true } }
async function runSupplierReactivation(): Promise<Record<string, unknown>> { return { skipped: true } }
async function runLeadQualifier(): Promise<Record<string, unknown>> { return { skipped: true } }
async function runBookingCloser(): Promise<Record<string, unknown>> { return { skipped: true } }
async function runCartAbandoner(): Promise<Record<string, unknown>> { return { skipped: true } }
async function runUpsell(): Promise<Record<string, unknown>> { return { skipped: true } }
async function runFollowUp(): Promise<Record<string, unknown>> { return { skipped: true } }
async function runReviewGenerator(): Promise<Record<string, unknown>> { return { skipped: true } }
async function runReferralAgent(): Promise<Record<string, unknown>> { return { sent: 0 } }

async function runListingOptimizer(): Promise<Record<string, unknown>> {
  const { data: listings } = await supabaseAdmin
    .from('listings').select('id, title, description, category_id, city, district')
    .order('created_at', { ascending: false }).limit(5)
  type L = Record<string, unknown> & { id: string; title: string }
  const rows = (listings ?? []) as L[]
  if (rows.length === 0) return { count: 0 }
  const recommendations: Array<Record<string, unknown>> = []
  for (const l of rows) {
    const text = await callClaude({
      systemPrompt: LISTING_OPTIMIZER_PROMPT,
      userMessage: JSON.stringify({ listing: l }),
      maxTokens: 1500, temperature: 0.6,
    })
    const out = parseJsonResponse<Record<string, unknown>>(text)
    recommendations.push({ listing_id: l.id, listing_title: l.title, ...out })
  }
  return { count: recommendations.length }
}

async function runSeoAgent(): Promise<Record<string, unknown>> {
  const { data: cats } = await supabaseAdmin.from('listings').select('category_id').limit(200)
  type C = { category_id: string }
  const counts: Record<string, number> = {}
  ;((cats ?? []) as C[]).forEach(c => { counts[c.category_id] = (counts[c.category_id] ?? 0) + 1 })
  const text = await callClaude({
    systemPrompt: SEO_AGENT_PROMPT,
    userMessage: JSON.stringify({ top_categories: counts }),
    maxTokens: 2000, temperature: 0.5,
  })
  const out = parseJsonResponse<Record<string, unknown>>(text)
  return { recommendations_count: Object.keys(out).length }
}

async function runWhatsappBroadcaster(): Promise<Record<string, unknown>> {
  const text = await callClaude({
    systemPrompt: WHATSAPP_BROADCASTER_PROMPT,
    userMessage: JSON.stringify({
      audience_segment: 'active_customers', audience_size: 100,
      trending_categories: ['كاميرات', 'كوورك'],
    }),
    maxTokens: 1024, temperature: 0.7,
  })
  const out = parseJsonResponse<Record<string, unknown>>(text)
  await supabaseAdmin.from('marketing_campaigns').insert({
    campaign_name: (out.campaign_name as string) ?? 'WhatsApp Campaign',
    campaign_type: 'whatsapp', status: 'draft',
    audience_segment: (out.audience as string) ?? 'active_customers',
    message_template: (out.message_template as string) ?? '',
    ai_generated: true, agent_name: 'whatsapp-broadcaster',
    channel_meta: out,
  } as never)
  return { drafted: true, campaign: out.campaign_name }
}

async function runEmailCampaigner(): Promise<Record<string, unknown>> {
  const text = await callClaude({
    systemPrompt: EMAIL_CAMPAIGNER_PROMPT,
    userMessage: JSON.stringify({ audience_segment: 'all_users', audience_size: 200 }),
    maxTokens: 2000, temperature: 0.7,
  })
  const out = parseJsonResponse<{ subject: string; html_body: string }>(text)
  await supabaseAdmin.from('marketing_campaigns').insert({
    campaign_name: out.subject, campaign_type: 'email',
    status: 'draft', message_template: out.html_body,
    ai_generated: true, agent_name: 'email-campaigner',
    channel_meta: out as unknown as Record<string, unknown>,
  } as never)
  return { drafted: true, subject: out.subject }
}

async function runTrendSpotter(): Promise<Record<string, unknown>> {
  const { data: cats } = await supabaseAdmin.from('listings').select('category_id').limit(300)
  type C = { category_id: string }
  const counts: Record<string, number> = {}
  ;((cats ?? []) as C[]).forEach(c => { counts[c.category_id] = (counts[c.category_id] ?? 0) + 1 })
  const text = await callClaude({
    systemPrompt: TREND_SPOTTER_PROMPT,
    userMessage: JSON.stringify({ category_listings_count: counts, category_searches_today: [] }),
    maxTokens: 1500, temperature: 0.6,
  })
  const out = parseJsonResponse<Record<string, unknown>>(text)
  if (Array.isArray(out.hot_trends)) {
    for (const trend of out.hot_trends as Array<Record<string, unknown>>) {
      await supabaseAdmin.from('agent_insights').insert({
        agent_name: 'trend-spotter', insight_type: 'trend',
        title: (trend.category as string) ?? 'Trend',
        description: (trend.evidence as string) ?? '',
        priority: (trend.urgency === 'عالي' ? 'high' : 'medium'),
        recommended_action: (trend.action as string) ?? null,
        data_points: trend,
      } as never)
    }
  }
  return out
}

async function runCompetitorWatcher(): Promise<Record<string, unknown>> {
  const text = await callClaude({
    systemPrompt: COMPETITOR_WATCHER_PROMPT,
    userMessage: JSON.stringify({ category: 'كاميرات', our_pricing_data: { avg_price_per_day: 250 } }),
    maxTokens: 1500, temperature: 0.5,
  })
  const out = parseJsonResponse<Record<string, unknown>>(text)
  return out
}

const RUNNERS: Record<string, (args?: Record<string, unknown>) => Promise<Record<string, unknown>>> = {
  // Phase 1
  'content-marketing': runContentMarketing,
  'analytics-reporter': runAnalyticsReporter,
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
  // Phase 2
  'ad-designer': runAdDesigner as (args?: Record<string, unknown>) => Promise<Record<string, unknown>>,
  'reel-script-writer': runReelScriptWriter as (args?: Record<string, unknown>) => Promise<Record<string, unknown>>,
  'carousel-designer': runCarouselDesigner as (args?: Record<string, unknown>) => Promise<Record<string, unknown>>,
  'booking-manager': runBookingManager,
  'quality-control': runQualityControl,
  'finance-tracker': runFinanceTracker,
  'ceo-assistant': runCEOAssistant,
  'strategy-agent': runStrategyAgent,
  // Phase 4 — Support + Intelligence + Growth
  'complaint-resolver': runComplaintResolver as (args?: Record<string, unknown>) => Promise<Record<string, unknown>>,
  'dispute-mediator': runDisputeMediator as (args?: Record<string, unknown>) => Promise<Record<string, unknown>>,
  'pricing-optimizer': runPricingOptimizer as (args?: Record<string, unknown>) => Promise<Record<string, unknown>>,
  'fraud-detector': runFraudDetector,
  'demand-forecaster': runDemandForecaster,
  'partnership-scout': runPartnershipScout,
  'content-personalizer': runContentPersonalizer as (args?: Record<string, unknown>) => Promise<Record<string, unknown>>,
}

export async function dispatchAgent(agentName: string, args?: Record<string, unknown>): Promise<AgentResult> {
  const start = Date.now()
  const runner = RUNNERS[agentName]
  if (!runner) {
    return { success: false, agent: agentName, error: 'Unknown agent', duration_ms: 0 }
  }
  const runId = await logRun({
    agentName, triggerType: 'scheduler', status: 'started',
  })
  try {
    const summary = await runner(args)
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
