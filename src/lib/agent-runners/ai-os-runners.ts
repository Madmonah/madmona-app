// src/lib/agent-runners/ai-os-runners.ts
// Phase 2 runners: Creative + Operations + Strategic teams

import { supabase as supabaseAdmin } from '@/lib/supabase'
import { callClaude, parseJsonResponse } from '@/lib/anthropic'
import { sendEmail } from '@/lib/email'

import { AD_DESIGNER_PROMPT } from '@/lib/agent-prompts/ad-designer'
import { REEL_SCRIPT_WRITER_PROMPT } from '@/lib/agent-prompts/reel-script-writer'
import { CAROUSEL_DESIGNER_PROMPT } from '@/lib/agent-prompts/carousel-designer'
import { BOOKING_MANAGER_PROMPT } from '@/lib/agent-prompts/booking-manager'
import { QUALITY_CONTROL_PROMPT } from '@/lib/agent-prompts/quality-control'
import { FINANCE_TRACKER_PROMPT } from '@/lib/agent-prompts/finance-tracker'
import { CEO_ASSISTANT_PROMPT } from '@/lib/agent-prompts/ceo-assistant'
import { STRATEGY_AGENT_PROMPT } from '@/lib/agent-prompts/strategy-agent'

const OWNER_EMAIL = 'madmona.admin@gmail.com'

// AD DESIGNER
export async function runAdDesigner(args?: { listingId?: string }): Promise<Record<string, unknown>> {
  let listing: Record<string, unknown> | null = null
  if (args?.listingId) {
    const { data } = await supabaseAdmin
      .from('listings').select('id, title, slug, description, city, district, bookings_count, rating, category_id')
      .eq('id', args.listingId).maybeSingle()
    listing = data as Record<string, unknown> | null
  } else {
    const { data: topListings } = await supabaseAdmin
      .from('listings').select('id, title, slug, description, city, district, bookings_count, rating, category_id')
      .eq('status', 'published').order('bookings_count', { ascending: false }).limit(10)
    type L = { id: string }
    const candidates = ((topListings ?? []) as Array<L & Record<string, unknown>>)
    for (const c of candidates) {
      const { count } = await supabaseAdmin.from('ad_creatives')
        .select('*', { count: 'exact', head: true }).eq('listing_id', c.id)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      if ((count ?? 0) === 0) { listing = c; break }
    }
  }
  if (!listing) return { skipped: true, reason: 'no eligible listings' }
  let categoryName = ''
  if (listing.category_id) {
    const { data: cat } = await supabaseAdmin.from('categories').select('name_ar').eq('id', listing.category_id).maybeSingle()
    categoryName = (cat as { name_ar?: string } | null)?.name_ar ?? ''
  }

  // 2026-05-13: pull the listing's primary photo so the creative has a REAL image
  // (Mohamed: "بوستات بصور غلط" — caused by ad-designer never linking a photo)
  let primaryPhotoUrl: string | null = null
  const { data: photos } = await supabaseAdmin
    .from('listing_photos').select('url, is_primary, display_order')
    .eq('listing_id', listing.id)
    .order('is_primary', { ascending: false })
    .order('display_order', { ascending: true })
    .limit(1)
  primaryPhotoUrl = ((photos ?? []) as Array<{ url: string }>)[0]?.url ?? null

  const text = await callClaude({
    systemPrompt: AD_DESIGNER_PROMPT,
    userMessage: JSON.stringify({ listing: { ...listing, category: categoryName }, ad_type: 'meta_static' }),
    maxTokens: 3500, temperature: 0.8,
  })
  const ad = parseJsonResponse<{
    headline: string; primary_text: string; description: string; cta_text: string;
    hashtags: string[]; visual_concept: string; color_palette: string[];
    design_brief: Record<string, unknown>; alt_versions: Array<Record<string, unknown>>;
  }>(text)
  const { data: created } = await supabaseAdmin.from('ad_creatives').insert({
    listing_id: listing.id, category: categoryName, ad_type: 'meta_static',
    headline: ad.headline, primary_text: ad.primary_text, description: ad.description,
    cta_text: ad.cta_text,
    cta_link: `https://www.madmonacairo.com/ad-listing/${(listing as { slug?: string }).slug ?? ''}`,
    hashtags: ad.hashtags, design_brief: ad.design_brief,
    visual_concept: ad.visual_concept, color_palette: ad.color_palette, status: 'drafted',
    thumbnail_url: primaryPhotoUrl, // REAL listing photo (May 13 2026)
  } as never).select('id').single()
  const adId = (created as { id?: string } | null)?.id
  if (Array.isArray(ad.alt_versions)) {
    for (const alt of ad.alt_versions) {
      await supabaseAdmin.from('ad_creatives').insert({
        listing_id: listing.id, category: categoryName, ad_type: 'meta_static',
        headline: (alt.headline as string) ?? '', visual_concept: (alt.angle as string) ?? '',
        status: 'drafted', design_brief: { ...ad.design_brief, angle: alt.angle },
        thumbnail_url: primaryPhotoUrl, // same real photo for alt versions
      } as never)
    }
  }
  await sendEmail({
    to: OWNER_EMAIL,
    subject: `🎨 Ad Creative — ${listing.title}`,
    html: `<div dir="rtl" style="font-family:Tahoma;padding:20px;max-width:640px;margin:0 auto">
      <h2 style="color:#1F5F3F">🎨 Ad Creative</h2>
      <p>${listing.title}</p>
      <div style="background:#FAF7F0;padding:16px;border-radius:8px;border-right:4px solid #1F5F3F;margin:16px 0">
        <h3 style="margin:0 0 8px;color:#1F5F3F">${ad.headline}</h3>
        <p style="margin:0;line-height:1.7">${ad.primary_text}</p>
        <p style="margin:8px 0 0;color:#666;font-size:13px">${ad.description}</p>
        <p style="margin:8px 0 0;font-weight:bold;color:#B8860B">${ad.cta_text}</p>
      </div>
      <p style="color:#666;font-size:11px">Ad ID: ${adId} · شوف /admin/ad-creatives</p>
    </div>`,
  })
  return { ad_id: adId, listing_id: listing.id, headline: ad.headline, alt_versions_count: ad.alt_versions?.length ?? 0 }
}

// REEL SCRIPT WRITER
export async function runReelScriptWriter(args?: { listingId?: string }): Promise<Record<string, unknown>> {
  let listing: Record<string, unknown> | null = null
  if (args?.listingId) {
    const { data } = await supabaseAdmin.from('listings').select('*').eq('id', args.listingId).maybeSingle()
    listing = data as Record<string, unknown> | null
  } else {
    const { data: topListings } = await supabaseAdmin.from('listings').select('*')
      .eq('status', 'published').order('views_count', { ascending: false }).limit(5)
    type L = { id: string }
    const candidates = ((topListings ?? []) as Array<L & Record<string, unknown>>)
    for (const c of candidates) {
      const { count } = await supabaseAdmin.from('reel_scripts')
        .select('*', { count: 'exact', head: true }).eq('listing_id', c.id)
        .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
      if ((count ?? 0) === 0) { listing = c; break }
    }
  }
  if (!listing) return { skipped: true, reason: 'no eligible listings' }
  const text = await callClaude({
    systemPrompt: REEL_SCRIPT_WRITER_PROMPT,
    userMessage: JSON.stringify({ listing }),
    maxTokens: 3500, temperature: 0.85,
  })
  const reel = parseJsonResponse<{
    title: string; hook: string; scenes: Array<Record<string, unknown>>;
    music_suggestion: string; shot_list: Array<Record<string, unknown>>;
    total_duration_sec: number; caption: string; hashtags: string[]; cta: string;
  }>(text)
  const { data: created } = await supabaseAdmin.from('reel_scripts').insert({
    listing_id: listing.id, category: (listing as { category?: string }).category ?? null,
    title: reel.title, hook: reel.hook, scenes: reel.scenes,
    music_suggestion: reel.music_suggestion, shot_list: reel.shot_list,
    total_duration_sec: reel.total_duration_sec, caption: reel.caption,
    hashtags: reel.hashtags, cta: reel.cta, status: 'drafted',
  } as never).select('id').single()
  const reelId = (created as { id?: string } | null)?.id
  await sendEmail({
    to: OWNER_EMAIL,
    subject: `🎬 Reel Script — ${reel.title}`,
    html: `<div dir="rtl" style="font-family:Tahoma;padding:20px;max-width:640px;margin:0 auto">
      <h2 style="color:#1F5F3F">🎬 ${reel.title}</h2>
      <p style="background:#1F5F3F;color:#FAF7F0;padding:16px;border-radius:8px;font-weight:bold">💥 Hook: ${reel.hook}</p>
      <p style="color:#666;font-size:11px">Reel ID: ${reelId} · ${reel.total_duration_sec}s</p>
    </div>`,
  })
  return { reel_id: reelId, title: reel.title, scenes_count: reel.scenes.length, duration: reel.total_duration_sec }
}

// CAROUSEL DESIGNER
export async function runCarouselDesigner(args?: { topic?: string }): Promise<Record<string, unknown>> {
  const topics = [
    '5 حاجات لازم تعرفها قبل ما تأجر كاميرا',
    'إزاي تختار أفضل مساحة كوورك',
    'الفرق بين الإيجار اليومي والشهري',
    'علامات إعلان إيجار محترم vs نصب',
  ]
  const topic = args?.topic ?? topics[Math.floor(Math.random() * topics.length)]
  const text = await callClaude({
    systemPrompt: CAROUSEL_DESIGNER_PROMPT,
    userMessage: JSON.stringify({ topic, category: 'عام', goal: 'educate' }),
    maxTokens: 4000, temperature: 0.8,
  })
  const carousel = parseJsonResponse<{
    title: string; topic_pillar: string; slides: Array<Record<string, unknown>>;
    caption: string; hashtags: string[]; cta: string; best_posting_time: string;
  }>(text)
  const { data: created } = await supabaseAdmin.from('content_calendar').insert({
    content_type: 'instagram_carousel', title: carousel.title, body: carousel.caption,
    hashtags: carousel.hashtags, cta: carousel.cta, status: 'drafted',
    agent_name: 'carousel-designer', category: carousel.topic_pillar, language: 'ar',
    metadata: { slides: carousel.slides, best_posting_time: carousel.best_posting_time },
  } as never).select('id').single()
  const id = (created as { id?: string } | null)?.id
  return { carousel_id: id, title: carousel.title, slides_count: carousel.slides.length }
}

// BOOKING MANAGER
export async function runBookingManager(): Promise<Record<string, unknown>> {
  const { data: bookings } = await supabaseAdmin
    .from('marketplace_bookings')
    .select('id, customer_profile_id, listing_id, total_amount, start_date, end_date, created_at')
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()).limit(20)
  type B = {
    id: string; customer_profile_id: string; listing_id: string;
    total_amount: number; start_date: string; end_date: string; created_at: string;
  }
  const rows = (bookings ?? []) as B[]
  let evaluated = 0
  for (const b of rows) {
    const { data: existing } = await supabaseAdmin.from('booking_decisions')
      .select('id').eq('booking_id', b.id).maybeSingle()
    if (existing) continue
    const { data: listing } = await supabaseAdmin.from('listings')
      .select('title, requires_id_verification').eq('id', b.listing_id).maybeSingle()
    const { data: customer } = await supabaseAdmin.from('profiles')
      .select('full_name, phone, created_at').eq('id', b.customer_profile_id).maybeSingle()
    const { count: prevBookings } = await supabaseAdmin.from('marketplace_bookings')
      .select('*', { count: 'exact', head: true }).eq('customer_profile_id', b.customer_profile_id)
    const text = await callClaude({
      systemPrompt: BOOKING_MANAGER_PROMPT,
      userMessage: JSON.stringify({
        booking: b, listing: listing ?? {},
        customer_history: {
          previous_bookings_count: prevBookings ?? 0,
          first_seen_days_ago: customer ? Math.floor((Date.now() - new Date((customer as { created_at: string }).created_at).getTime()) / 86400000) : 0,
        },
      }),
      maxTokens: 1500, temperature: 0.4,
    })
    const decision = parseJsonResponse<{
      decision: string; confidence_score: number; reasoning: string;
      risk_factors: unknown; customer_history_score: number;
      listing_match_score: number; pricing_anomaly: boolean;
      human_review_needed: boolean; recommended_action: string;
    }>(text)
    await supabaseAdmin.from('booking_decisions').insert({
      booking_id: b.id, decision: decision.decision,
      confidence_score: decision.confidence_score, reasoning: decision.reasoning,
      risk_factors: decision.risk_factors,
      customer_history_score: decision.customer_history_score,
      listing_match_score: decision.listing_match_score,
      pricing_anomaly_check: decision.pricing_anomaly,
    } as never)
    if (decision.decision !== 'auto_approve' || decision.human_review_needed) {
      await supabaseAdmin.from('agent_insights').insert({
        agent_name: 'booking-manager', insight_type: 'warning',
        title: `حجز محتاج مراجعة: ${(listing as { title?: string } | null)?.title ?? b.id}`,
        description: decision.reasoning,
        priority: decision.decision === 'suggest_reject' ? 'high' : 'medium',
        recommended_action: decision.recommended_action,
        data_points: { booking_id: b.id, decision: decision.decision },
      } as never)
    }
    evaluated++
  }
  return { evaluated, total_recent: rows.length }
}

// QUALITY CONTROL
export async function runQualityControl(): Promise<Record<string, unknown>> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data: listings } = await supabaseAdmin.from('listings')
    .select('id, title, description, city, district, category_id, status, created_at')
    .gte('created_at', oneHourAgo).eq('status', 'published').limit(10)
  type L = {
    id: string; title: string; description: string | null;
    city: string | null; district: string | null; category_id: string;
    status: string; created_at: string;
  }
  const rows = (listings ?? []) as L[]
  let reviewed = 0
  for (const l of rows) {
    const { data: existing } = await supabaseAdmin.from('qc_reports')
      .select('id').eq('listing_id', l.id).maybeSingle()
    if (existing) continue
    const { count: photosCount } = await supabaseAdmin.from('listing_photos')
      .select('*', { count: 'exact', head: true }).eq('listing_id', l.id)
    const { count: pricingCount } = await supabaseAdmin.from('pricing_rules')
      .select('*', { count: 'exact', head: true }).eq('listing_id', l.id)
    const text = await callClaude({
      systemPrompt: QUALITY_CONTROL_PROMPT,
      userMessage: JSON.stringify({
        listing: { ...l, photos_count: photosCount ?? 0, has_pricing: (pricingCount ?? 0) > 0 },
        category_avg_price: 250, category_avg_description_length: 200,
      }),
      maxTokens: 2000, temperature: 0.3,
    })
    const report = parseJsonResponse<Record<string, unknown>>(text)
    await supabaseAdmin.from('qc_reports').insert({
      listing_id: l.id, overall_score: report.overall_score,
      pass_status: report.pass_status,
      title_quality_score: report.title_quality_score,
      description_quality_score: report.description_quality_score,
      photos_quality_score: report.photos_quality_score,
      pricing_reasonable: report.pricing_reasonable,
      category_correct: report.category_correct,
      issues: report.issues, improvements: report.improvements,
      recommended_action: report.recommended_action,
      human_review_needed: report.human_review_needed,
    } as never)
    if (report.pass_status === 'fail' || report.human_review_needed) {
      await supabaseAdmin.from('agent_insights').insert({
        agent_name: 'quality-control', insight_type: 'warning',
        title: `إعلان محتاج مراجعة: ${l.title}`,
        description: `Score: ${report.overall_score}. ${(report.issues as Array<Record<string, unknown>> | null)?.length ?? 0} issues`,
        priority: report.pass_status === 'fail' ? 'high' : 'medium',
        recommended_action: report.recommended_action as string,
        data_points: { listing_id: l.id, ...report },
      } as never)
    }
    reviewed++
  }
  return { reviewed, total_recent: rows.length }
}

// FINANCE TRACKER
export async function runFinanceTracker(): Promise<Record<string, unknown>> {
  const today = new Date(); today.setHours(0,0,0,0)
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const [todayBookings, yesterdayBookings, monthBookings] = await Promise.all([
    supabaseAdmin.from('marketplace_bookings').select('total_amount').gte('created_at', today.toISOString()),
    supabaseAdmin.from('marketplace_bookings').select('total_amount').gte('created_at', yesterday.toISOString()).lt('created_at', today.toISOString()),
    supabaseAdmin.from('marketplace_bookings').select('total_amount').gte('created_at', monthStart.toISOString()),
  ])
  const sumAmount = (rows: { total_amount?: number | null }[] | null) =>
    (rows ?? []).reduce((s, r) => s + Number(r.total_amount ?? 0), 0)
  type R = { total_amount: number | null }
  const todayRev = sumAmount((todayBookings.data ?? []) as R[])
  const yestRev = sumAmount((yesterdayBookings.data ?? []) as R[])
  const monthRev = sumAmount((monthBookings.data ?? []) as R[])
  const text = await callClaude({
    systemPrompt: FINANCE_TRACKER_PROMPT,
    userMessage: JSON.stringify({
      today: today.toISOString().split('T')[0],
      today_revenue: todayRev, yesterday_revenue: yestRev,
      this_month_revenue: monthRev, last_month_same_day: monthRev * 0.7,
      pending_payouts_count: 0, pending_payouts_total: 0,
      completed_bookings_today: (todayBookings.data ?? []).length,
      cancelled_bookings_today: 0, outstanding_payments: [],
    }),
    maxTokens: 1500, temperature: 0.4,
  })
  const report = parseJsonResponse<Record<string, unknown>>(text)
  if (Array.isArray(report.alerts)) {
    for (const alert of (report.alerts as Array<Record<string, unknown>>)) {
      if (alert.severity === 'urgent' || alert.severity === 'warning') {
        await supabaseAdmin.from('agent_insights').insert({
          agent_name: 'finance-tracker', insight_type: 'warning',
          title: alert.message as string, description: alert.message as string,
          priority: alert.severity === 'urgent' ? 'high' : 'medium',
          recommended_action: alert.action as string, data_points: alert,
        } as never)
      }
    }
  }
  return { today_revenue: todayRev, growth_pct: report.growth_vs_yesterday_pct, alerts: (report.alerts as unknown[])?.length ?? 0 }
}

// CEO ASSISTANT
export async function runCEOAssistant(): Promise<Record<string, unknown>> {
  const today = new Date(); today.setHours(0,0,0,0)
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
  const todayStr = today.toISOString().split('T')[0]
  const { data: existing } = await supabaseAdmin.from('ceo_briefs')
    .select('id').eq('brief_date', todayStr).maybeSingle()
  if (existing) return { skipped: true, reason: 'already exists for today' }
  const [yestBookings, todayBookings, todayLeads, highInsights, agentRunsToday] = await Promise.all([
    supabaseAdmin.from('marketplace_bookings').select('total_amount').gte('created_at', yesterday.toISOString()).lt('created_at', today.toISOString()),
    supabaseAdmin.from('marketplace_bookings').select('total_amount').gte('created_at', today.toISOString()),
    supabaseAdmin.from('sales_leads').select('lead_score').gte('created_at', yesterday.toISOString()),
    supabaseAdmin.from('agent_insights').select('title, agent_name, recommended_action, priority').eq('priority', 'high').eq('status', 'new').limit(5),
    supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }).gte('started_at', today.toISOString()),
  ])
  type R = { total_amount: number | null }
  const yestRev = ((yestBookings.data ?? []) as R[]).reduce((s, r) => s + Number(r.total_amount ?? 0), 0)
  const todayRev = ((todayBookings.data ?? []) as R[]).reduce((s, r) => s + Number(r.total_amount ?? 0), 0)
  const leads = (todayLeads.data ?? []) as Array<{ lead_score: number }>
  const highPriorityLeads = leads.filter(l => l.lead_score >= 70).length
  const text = await callClaude({
    systemPrompt: CEO_ASSISTANT_PROMPT,
    userMessage: JSON.stringify({
      date: todayStr,
      yesterday: { revenue: yestRev, bookings: (yestBookings.data ?? []).length },
      today_so_far: { revenue: todayRev, bookings: (todayBookings.data ?? []).length, leads: leads.length, high_priority_leads: highPriorityLeads },
      ai_insights_high_priority: highInsights.data ?? [],
      agent_runs_today: agentRunsToday.count ?? 0,
    }),
    maxTokens: 4000, temperature: 0.5,
  })
  const brief = parseJsonResponse<Record<string, unknown>>(text)
  const { data: created } = await supabaseAdmin.from('ceo_briefs').insert({
    brief_date: todayStr, one_liner: brief.one_liner,
    good_news: brief.good_news, concerns: brief.concerns,
    decisions_needed: brief.decisions_needed,
    revenue_today: todayRev, revenue_yesterday: yestRev,
    revenue_change_pct: yestRev > 0 ? Math.round(((todayRev - yestRev) / yestRev) * 100) : 0,
    bookings_today: (todayBookings.data ?? []).length,
    new_users_today: 0, new_listings_today: 0,
    ai_actions_today: agentRunsToday.count ?? 0,
    top_3_priorities: brief.top_3_priorities,
    growth_opportunities: brief.growth_opportunities,
    full_brief_html: brief.full_brief_html,
  } as never).select('id').single()
  const briefId = (created as { id?: string } | null)?.id
  await sendEmail({
    to: OWNER_EMAIL,
    subject: `🌅 Brief يومي ${todayStr} — ${brief.one_liner}`,
    html: `<div dir="rtl" style="font-family:Tahoma;padding:24px;max-width:680px;margin:0 auto;background:#FAF7F0">
      <h1 style="color:#1F5F3F">🌅 صباح الخير يا محمد</h1>
      <p style="font-size:18px">${brief.one_liner}</p>
      <p style="color:#999;font-size:11px">Brief ID: ${briefId}</p>
    </div>`,
  })
  return { brief_id: briefId, one_liner: brief.one_liner, decisions_count: (brief.decisions_needed as unknown[])?.length ?? 0 }
}

// STRATEGY AGENT
export async function runStrategyAgent(): Promise<Record<string, unknown>> {
  const [listingsCount, suppliersCount, bookingsRes, leadsRes, prevPlays] = await Promise.all([
    supabaseAdmin.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabaseAdmin.from('marketplace_suppliers').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('marketplace_bookings').select('total_amount, created_at').gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    supabaseAdmin.from('sales_leads').select('lead_score').gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    supabaseAdmin.from('strategy_plays').select('title, status, lessons_learned').limit(5),
  ])
  type R = { total_amount: number | null }
  const monthlyRev = ((bookingsRes.data ?? []) as R[]).reduce((s, r) => s + Number(r.total_amount ?? 0), 0)
  const leads = (leadsRes.data ?? []) as Array<{ lead_score: number }>
  const conversionRate = leads.length > 0 ? leads.filter(l => l.lead_score >= 70).length / leads.length : 0
  const text = await callClaude({
    systemPrompt: STRATEGY_AGENT_PROMPT,
    userMessage: JSON.stringify({
      current_state: {
        total_listings: listingsCount.count ?? 0,
        total_suppliers: suppliersCount.count ?? 0,
        total_bookings_30d: (bookingsRes.data ?? []).length,
        monthly_revenue: monthlyRev,
        lead_conversion_rate: Math.round(conversionRate * 100),
        leads_30d: leads.length,
      },
      previous_plays_outcomes: prevPlays.data ?? [],
      instructions: 'اطلع 3-4 plays فقط مش 5، خليها مختصرة لكن قوية',
    }),
    maxTokens: 8000, temperature: 0.7,
  })
  const result = parseJsonResponse<{
    strategic_assessment: string;
    plays: Array<Record<string, unknown>>;
    what_to_stop_doing: string[];
    north_star_check: string;
  }>(text)
  for (const play of result.plays) {
    await supabaseAdmin.from('strategy_plays').insert({
      play_type: play.play_type, title: play.title,
      hypothesis: play.hypothesis, expected_impact: play.expected_impact,
      effort_level: play.effort_level, priority: play.priority,
      steps: play.steps, required_resources: play.required_resources,
      success_metrics: play.success_metrics, status: 'proposed',
    } as never)
  }
  await sendEmail({
    to: OWNER_EMAIL,
    subject: `🧠 Strategy Plays — ${result.plays.length} مقترحات`,
    html: `<div dir="rtl" style="font-family:Tahoma;padding:24px;max-width:680px;margin:0 auto">
      <h2 style="color:#1F5F3F">🧠 Strategy Plays</h2>
      <div style="background:#FAF7F0;padding:16px;border-radius:10px;font-size:14px;line-height:1.7">
        ${result.strategic_assessment}
      </div>
      ${result.plays.map((p, i) => `
        <div style="background:#fff;padding:16px;border-radius:10px;border-right:4px solid #1F5F3F;margin-bottom:12px">
          <h3 style="margin:0 0 8px">${i + 1}. ${p.title}</h3>
          <p style="font-size:13px"><strong>Hypothesis:</strong> ${p.hypothesis}</p>
          <p style="font-size:13px"><strong>Impact:</strong> ${p.expected_impact}</p>
          <p style="font-size:13px"><strong>Effort:</strong> ${p.effort_level} · <strong>Priority:</strong> ${p.priority}</p>
        </div>
      `).join('')}
      ${(result.what_to_stop_doing ?? []).length > 0 ? `
        <h3 style="color:#C2410C">🛑 حاجات نوقفها</h3>
        <ul>${result.what_to_stop_doing.map(x => `<li>${x}</li>`).join('')}</ul>
      ` : ''}
    </div>`,
  })
  return { plays_count: result.plays.length, assessment: result.strategic_assessment.slice(0, 100) }
}
