// src/lib/agent-runners/booking-lifecycle-runners.ts
// دفعة 2 من الـstubs — الـ4 agents اللي بيتابعوا دورة حياة الحجز بعد ما يتقفل:
// cart-abandoner (pending_payment واقفة) / upsell-agent (بعد completed) /
// follow-up-agent (بعد completed بيوم) / review-generator (بعد completed بـ3 أيام)
// + referral-agent (عميل عنده 3+ حجوزات ناجحة).
//
// كلهم بيمشوا على marketplace_bookings (نفس مصدر booking-closer) — الجدول
// الرسمي لحجوزات الإعلانات. لو العميل guest (customer_id فاضي) بنستخدم
// guest_phone/guest_name بدل ما نستبعده.

import { supabase as supabaseAdmin } from '@/lib/supabase'
import { callClaude, parseJsonResponse } from '@/lib/anthropic'
import { sendText, normalizePhone, isWhatsAppConfigured } from '@/lib/whatsapp'
import { CART_ABANDONER_PROMPT } from '@/lib/agent-prompts/cart-abandoner'
import { UPSELL_PROMPT } from '@/lib/agent-prompts/upsell-agent'
import { FOLLOW_UP_PROMPT } from '@/lib/agent-prompts/follow-up-agent'
import { REVIEW_GENERATOR_PROMPT } from '@/lib/agent-prompts/review-generator'
import { REFERRAL_AGENT_PROMPT } from '@/lib/agent-prompts/referral-agent'

const SEND_DELAY_MS = 1000
const AGENT_WA_SESSION = process.env.WA_CAMPAIGN_SESSION || 'madmona-982'

async function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

type BookingRow = {
  id: string
  customer_id: string | null
  listing_id: string
  status: string
  created_at: string
  completed_at: string | null
  guest_phone: string | null
  guest_name: string | null
  base_amount: number | null
  metadata?: Record<string, unknown> | null
}

type ListingRow = { id: string; title: string; category_id: string | null }
type ProfileRow = { id: string; full_name: string | null; phone: string | null }

/** بيرجع {name, phone} للعميل — من profile لو مسجل، أو guest fields لو مش مسجل. */
async function resolveContact(
  b: Pick<BookingRow, 'customer_id' | 'guest_phone' | 'guest_name'>
): Promise<{ name: string; phone: string } | null> {
  if (b.customer_id) {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, phone')
      .eq('id', b.customer_id)
      .maybeSingle()
    const p = data as ProfileRow | null
    const phone = p?.phone ? normalizePhone(p.phone) : ''
    if (phone) return { name: p?.full_name ?? 'صديقنا', phone }
  }
  if (b.guest_phone) {
    const phone = normalizePhone(b.guest_phone)
    if (phone) return { name: b.guest_name ?? 'صديقنا', phone }
  }
  return null
}

// ============================================================================
// 1. Cart Abandoner — pending_payment من 1-3 ساعات
// ============================================================================

export async function runCartAbandonerReal(): Promise<Record<string, unknown>> {
  if (!isWhatsAppConfigured()) return { sent: 0, error: 'WhatsApp not configured' }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()

  const { data: bookings } = await supabaseAdmin
    .from('marketplace_bookings')
    .select('id, customer_id, listing_id, status, created_at, completed_at, guest_phone, guest_name, base_amount')
    .eq('status', 'pending_payment')
    .lte('created_at', oneHourAgo)
    .gte('created_at', threeHoursAgo)
    .limit(20)

  const targets = (bookings ?? []) as BookingRow[]
  let sent = 0
  let failed = 0

  for (const b of targets) {
    const contact = await resolveContact(b)
    if (!contact) { failed++; continue }

    const { data: listing } = await supabaseAdmin
      .from('listings').select('id, title, category_id').eq('id', b.listing_id).maybeSingle()
    const l = listing as ListingRow | null
    if (!l) { failed++; continue }

    const minutesSinceAbandon = Math.round((Date.now() - new Date(b.created_at).getTime()) / 60000)

    try {
      const text = await callClaude({
        systemPrompt: CART_ABANDONER_PROMPT,
        userMessage: JSON.stringify({
          contact_name: contact.name,
          contact_phone: contact.phone,
          listing: { id: l.id, title: l.title, price: b.base_amount, dates_selected: null },
          abandoned_at_step: 'payment',
          minutes_since_abandon: minutesSinceAbandon,
        }),
        maxTokens: 500, temperature: 0.6,
      })
      const out = parseJsonResponse<{ message: string }>(text)
      const body = out.message?.trim()
      if (!body) { failed++; continue }

      const result = await sendText({
        to: contact.phone, body, agentName: 'cart-abandoner', aiGenerated: true, session: AGENT_WA_SESSION,
      })
      if (result.ok) sent++
      else failed++
    } catch {
      failed++
    }

    await sleep(SEND_DELAY_MS)
  }

  return { sent, failed, found: targets.length }
}

// ============================================================================
// 2. Upsell Agent — بعد ما عميل يخلص حجز (completed)
// ============================================================================

export async function runUpsellReal(): Promise<Record<string, unknown>> {
  if (!isWhatsAppConfigured()) return { sent: 0, error: 'WhatsApp not configured' }

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()

  const { data: bookings } = await supabaseAdmin
    .from('marketplace_bookings')
    .select('id, customer_id, listing_id, status, created_at, completed_at, guest_phone, guest_name, base_amount')
    .eq('status', 'completed')
    .lte('completed_at', oneDayAgo)
    .gte('completed_at', threeDaysAgo)
    .limit(20)

  const targets = (bookings ?? []) as BookingRow[]
  let sent = 0
  let failed = 0

  for (const b of targets) {
    const contact = await resolveContact(b)
    if (!contact || !b.customer_id) { failed++; continue }

    const { data: currentListing } = await supabaseAdmin
      .from('listings').select('id, title, category_id').eq('id', b.listing_id).maybeSingle()
    const cl = currentListing as ListingRow | null
    if (!cl) { failed++; continue }

    // ترشيح بسيط: إعلانات تانية في نفس الكاتيجوري لسه منشورة، غير الإعلان اللي حجزه
    const { data: recs } = await supabaseAdmin
      .from('listings')
      .select('id, title, category_id')
      .eq('category_id', cl.category_id ?? '')
      .eq('status', 'published')
      .neq('id', cl.id)
      .limit(3)

    const recommended = (recs ?? []) as ListingRow[]
    if (recommended.length === 0) { failed++; continue }

    // كل حجوزاته السابقة (لعرضها في السياق كـpast_bookings)
    const { data: pastBookings } = await supabaseAdmin
      .from('marketplace_bookings')
      .select('listing_id, completed_at')
      .eq('customer_id', b.customer_id)
      .eq('status', 'completed')
      .limit(10)

    try {
      const text = await callClaude({
        systemPrompt: UPSELL_PROMPT,
        userMessage: JSON.stringify({
          contact_name: contact.name,
          contact_phone: contact.phone,
          past_bookings: (pastBookings ?? []).map(pb => ({
            category: cl.category_id, listing_title: cl.title, date: (pb as { completed_at: string | null }).completed_at,
          })),
          recommended_listings: recommended.map(r => ({
            id: r.id, title: r.title, category: r.category_id, price: null, why_it_fits: 'نفس الكاتيجوري اللي حجزتها قبل كده',
          })),
        }),
        maxTokens: 500, temperature: 0.7,
      })
      const out = parseJsonResponse<{ message: string; recommended_listing_id?: string }>(text)
      const body = out.message?.trim()
      if (!body) { failed++; continue }

      const result = await sendText({
        to: contact.phone, body, agentName: 'upsell-agent', aiGenerated: true, session: AGENT_WA_SESSION,
      })
      if (result.ok) sent++
      else failed++
    } catch {
      failed++
    }

    await sleep(SEND_DELAY_MS)
  }

  return { sent, failed, found: targets.length }
}

// ============================================================================
// 3. Follow-up Agent — بعد يوم من اكتمال الحجز
// ============================================================================

export async function runFollowUpReal(): Promise<Record<string, unknown>> {
  if (!isWhatsAppConfigured()) return { sent: 0, error: 'WhatsApp not configured' }

  const twentyHoursAgo = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString()
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()

  const { data: bookings } = await supabaseAdmin
    .from('marketplace_bookings')
    .select('id, customer_id, listing_id, status, created_at, completed_at, guest_phone, guest_name, base_amount, supplier_id')
    .eq('status', 'completed')
    .lte('completed_at', twentyHoursAgo)
    .gte('completed_at', twoDaysAgo)
    .limit(20)

  type BookingWithSupplier = BookingRow & { supplier_id: string | null }
  const targets = (bookings ?? []) as BookingWithSupplier[]
  let sent = 0
  let failed = 0

  for (const b of targets) {
    const contact = await resolveContact(b)
    if (!contact) { failed++; continue }

    const { data: listing } = await supabaseAdmin
      .from('listings').select('id, title, category_id').eq('id', b.listing_id).maybeSingle()
    const l = listing as ListingRow | null
    if (!l) { failed++; continue }

    let supplierName = 'المؤجر'
    if (b.supplier_id) {
      const { data: sup } = await supabaseAdmin
        .from('marketplace_suppliers').select('business_name').eq('id', b.supplier_id).maybeSingle()
      supplierName = (sup as { business_name?: string } | null)?.business_name ?? supplierName
    }

    const hoursSinceCompletion = b.completed_at
      ? Math.round((Date.now() - new Date(b.completed_at).getTime()) / (60 * 60 * 1000))
      : 24

    try {
      const text = await callClaude({
        systemPrompt: FOLLOW_UP_PROMPT,
        userMessage: JSON.stringify({
          contact_name: contact.name,
          contact_phone: contact.phone,
          booking: { listing_title: l.title, supplier_name: supplierName, end_date: b.completed_at },
          hours_since_completion: hoursSinceCompletion,
        }),
        maxTokens: 400, temperature: 0.6,
      })
      const out = parseJsonResponse<{ message: string }>(text)
      const body = out.message?.trim()
      if (!body) { failed++; continue }

      const result = await sendText({
        to: contact.phone, body, agentName: 'follow-up-agent', aiGenerated: true, session: AGENT_WA_SESSION,
      })
      if (result.ok) sent++
      else failed++
    } catch {
      failed++
    }

    await sleep(SEND_DELAY_MS)
  }

  return { sent, failed, found: targets.length }
}

// ============================================================================
// 4. Review Generator — بعد 3 أيام من الاكتمال، وميعملش review قبل كده
// ============================================================================

export async function runReviewGeneratorReal(): Promise<Record<string, unknown>> {
  if (!isWhatsAppConfigured()) return { sent: 0, error: 'WhatsApp not configured' }

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: bookings } = await supabaseAdmin
    .from('marketplace_bookings')
    .select('id, customer_id, listing_id, status, created_at, completed_at, guest_phone, guest_name, base_amount, supplier_id')
    .eq('status', 'completed')
    .lte('completed_at', threeDaysAgo)
    .gte('completed_at', sevenDaysAgo)
    .limit(20)

  type BookingWithSupplier = BookingRow & { supplier_id: string | null }
  const targets = (bookings ?? []) as BookingWithSupplier[]
  let sent = 0
  let failed = 0

  for (const b of targets) {
    // لو فيه review اتكتب على الحجز ده قبل كده، متبعتش تاني
    const { data: existingReview } = await supabaseAdmin
      .from('reviews').select('id').eq('booking_id', b.id).maybeSingle()
    if (existingReview) continue

    const contact = await resolveContact(b)
    if (!contact) { failed++; continue }

    const { data: listing } = await supabaseAdmin
      .from('listings').select('id, title, category_id').eq('id', b.listing_id).maybeSingle()
    const l = listing as ListingRow | null
    if (!l) { failed++; continue }

    let supplierName = 'المؤجر'
    if (b.supplier_id) {
      const { data: sup } = await supabaseAdmin
        .from('marketplace_suppliers').select('business_name').eq('id', b.supplier_id).maybeSingle()
      supplierName = (sup as { business_name?: string } | null)?.business_name ?? supplierName
    }

    try {
      const text = await callClaude({
        systemPrompt: REVIEW_GENERATOR_PROMPT,
        userMessage: JSON.stringify({
          contact_name: contact.name,
          contact_phone: contact.phone,
          booking: { listing_title: l.title, supplier_name: supplierName, category: l.category_id },
        }),
        maxTokens: 300, temperature: 0.6,
      })
      const out = parseJsonResponse<{ message: string }>(text)
      const body = out.message?.trim()
      if (!body) { failed++; continue }

      const result = await sendText({
        to: contact.phone, body, agentName: 'review-generator', aiGenerated: true, session: AGENT_WA_SESSION,
      })
      if (result.ok) sent++
      else failed++
    } catch {
      failed++
    }

    await sleep(SEND_DELAY_MS)
  }

  return { sent, failed, found: targets.length }
}

// ============================================================================
// 5. Referral Agent — عميل عنده 3+ حجوزات ناجحة، ومحصلش تواصل قبل كده
// ============================================================================

export async function runReferralAgentReal(): Promise<Record<string, unknown>> {
  if (!isWhatsAppConfigured()) return { sent: 0, error: 'WhatsApp not configured' }

  // عملاء بقالهم حجوزات مكتملة 3+ — نجمعهم من marketplace_bookings مباشرة
  const { data: rows } = await supabaseAdmin
    .from('marketplace_bookings')
    .select('customer_id, listing_id, completed_at')
    .eq('status', 'completed')
    .not('customer_id', 'is', null)
    .limit(500)

  type Row = { customer_id: string; listing_id: string; completed_at: string | null }
  const byCustomer = new Map<string, Row[]>()
  for (const r of (rows ?? []) as Row[]) {
    const arr = byCustomer.get(r.customer_id) ?? []
    arr.push(r)
    byCustomer.set(r.customer_id, arr)
  }

  const eligible = [...byCustomer.entries()].filter(([, v]) => v.length >= 3).slice(0, 15)
  if (eligible.length === 0) return { sent: 0, failed: 0, found: 0 }

  let sent = 0
  let failed = 0

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  for (const [customerId, customerBookings] of eligible) {
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('id, full_name, phone').eq('id', customerId).maybeSingle()
    const p = profile as ProfileRow | null
    if (!p) { failed++; continue }

    const phone = p.phone ? normalizePhone(p.phone) : ''
    if (!phone) { failed++; continue }

    // ماتبعتش تاني لو اتبعتله دعوة إحالة قبل كده في آخر 30 يوم — بنستخدم
    // agent_insights كسجل، مفيش عمود مخصص على profiles لده.
    const { data: recentInvite } = await supabaseAdmin
      .from('agent_insights')
      .select('id')
      .eq('agent_name', 'referral-agent')
      .eq('insight_type', 'referral_invite_sent')
      .gte('created_at', thirtyDaysAgo)
      .contains('data_points', { customer_id: customerId })
      .limit(1)
      .maybeSingle()
    if (recentInvite) continue

    const lastBooking = customerBookings.sort((a, b) =>
      new Date(b.completed_at ?? 0).getTime() - new Date(a.completed_at ?? 0).getTime()
    )[0]
    const { data: lastListing } = await supabaseAdmin
      .from('listings').select('category_id').eq('id', lastBooking.listing_id).maybeSingle()

    try {
      const text = await callClaude({
        systemPrompt: REFERRAL_AGENT_PROMPT,
        userMessage: JSON.stringify({
          contact_name: p.full_name ?? 'صديقنا',
          contact_phone: phone,
          successful_bookings_count: customerBookings.length,
          last_booking_category: (lastListing as { category_id?: string } | null)?.category_id ?? null,
        }),
        maxTokens: 400, temperature: 0.6,
      })
      const out = parseJsonResponse<{ message: string }>(text)
      const body = out.message?.trim()
      if (!body) { failed++; continue }

      const result = await sendText({
        to: phone, body, agentName: 'referral-agent', aiGenerated: true, session: AGENT_WA_SESSION,
      })

      if (result.ok) {
        sent++
        await supabaseAdmin.from('agent_insights').insert({
          agent_name: 'referral-agent',
          insight_type: 'referral_invite_sent',
          title: `${p.full_name ?? 'عميل'} — دعوة شير واكسب`,
          description: `${customerBookings.length} حجوزات ناجحة`,
          priority: 'low',
          recommended_action: null,
          data_points: { customer_id: customerId, bookings_count: customerBookings.length },
        } as never)
      } else {
        failed++
      }
    } catch {
      failed++
    }

    await sleep(SEND_DELAY_MS)
  }

  return { sent, failed, found: eligible.length }
}
