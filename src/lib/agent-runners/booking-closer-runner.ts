// src/lib/agent-runners/booking-closer-runner.ts
// Booking Closer — بيتابع leads عندهم score عالي (70+) بيهتموا بـlisting
// معين بس لسه مقفلوش حجز، ويكلمهم برسالة واتساب مخصصة تقفل الحجز.
//
// مصدر الـleads: sales_leads (lead_score محسوب من compute_lead_score
// المرتبط بمصدر الـlead)، بشرط عندهم interested_listing_id ومحصلش تواصل
// من booking-closer قبل كده أو من فترة قريبة (نستخدم last_action_at/metadata
// كحارس منع التكرار).

import { supabase as supabaseAdmin } from '@/lib/supabase'
import { callClaude, parseJsonResponse } from '@/lib/anthropic'
import { sendText, normalizePhone, isWhatsAppConfigured } from '@/lib/whatsapp'
import { BOOKING_CLOSER_PROMPT } from '@/lib/agent-prompts/booking-closer'

const SEND_DELAY_MS = 1000
const AGENT_WA_SESSION = process.env.WA_CAMPAIGN_SESSION || 'madmona-982'
const SCORE_THRESHOLD = 70

async function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

export async function runBookingCloserReal(): Promise<Record<string, unknown>> {
  if (!isWhatsAppConfigured()) {
    return { sent: 0, error: 'WhatsApp not configured' }
  }

  type Lead = {
    id: string
    contact_name: string | null
    contact_phone: string | null
    interested_listing_id: string | null
    lead_score: number | null
    intent: string | null
    created_at: string
    metadata: Record<string, unknown> | null
  }

  const { data: leads } = await supabaseAdmin
    .from('sales_leads')
    .select('id, contact_name, contact_phone, interested_listing_id, lead_score, intent, created_at, metadata')
    .gte('lead_score', SCORE_THRESHOLD)
    .not('interested_listing_id', 'is', null)
    .not('contact_phone', 'is', null)
    .neq('intent', 'converted')
    .order('lead_score', { ascending: false })
    .limit(15)

  const targets = ((leads ?? []) as Lead[]).filter(
    l => !(l.metadata && (l.metadata as Record<string, unknown>).booking_closer_contacted_at)
  )

  if (targets.length === 0) return { sent: 0, failed: 0, found: 0 }

  type Listing = { id: string; title: string; price_egp: number | null; category_id: string | null; city: string | null }

  let sent = 0
  let failed = 0

  for (const lead of targets) {
    const phone = normalizePhone(lead.contact_phone ?? '')
    if (!phone || !lead.interested_listing_id) {
      failed++
      continue
    }

    const { data: listing } = await supabaseAdmin
      .from('listings')
      .select('id, title, price_egp, category_id, city')
      .eq('id', lead.interested_listing_id)
      .maybeSingle()

    const l = listing as Listing | null
    if (!l) {
      failed++
      continue
    }

    const daysSinceFirstAction = Math.round(
      (Date.now() - new Date(lead.created_at).getTime()) / (24 * 60 * 60 * 1000)
    )

    try {
      const text = await callClaude({
        systemPrompt: BOOKING_CLOSER_PROMPT,
        userMessage: JSON.stringify({
          contact_name: lead.contact_name ?? 'صديقنا',
          contact_phone: phone,
          interested_listing: {
            id: l.id,
            title: l.title,
            price: l.price_egp,
            category: l.category_id,
            available_dates: null,
          },
          lead_score: lead.lead_score,
          days_since_first_action: daysSinceFirstAction,
          conversation_history: [],
        }),
        maxTokens: 500,
        temperature: 0.6,
      })
      const out = parseJsonResponse<{ message: string; booking_link?: string }>(text)
      const body = out.message?.trim()
      if (!body) { failed++; continue }

      const result = await sendText({
        to: phone,
        body,
        agentName: 'booking-closer',
        aiGenerated: true,
        session: AGENT_WA_SESSION,
      })

      if (result.ok) {
        sent++
        await supabaseAdmin
          .from('sales_leads')
          .update({
            metadata: { ...(lead.metadata ?? {}), booking_closer_contacted_at: new Date().toISOString() },
            last_action_at: new Date().toISOString(),
          } as never)
          .eq('id', lead.id)
      } else {
        failed++
      }
    } catch {
      failed++
    }

    await sleep(SEND_DELAY_MS)
  }

  return { sent, failed, found: targets.length }
}
