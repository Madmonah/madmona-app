// src/lib/agent-runners/whatsapp-real-runners.ts
// Real WhatsApp + outreach runners — replaces all the {skipped: true} stubs.
//
// These actually send messages via WhatsApp (OpenWA — قناة المارد الوحيدة، شوف whatsapp.ts)
// ورسايلهم اتولّدت بـClaude من نفس الـpersona/prompts المكتوبة أصلاً لكل agent
// (src/lib/agent-prompts/*)، مش نصوص ثابتة — كل رسالة مخصّصة للمستلم.

import { supabase as supabaseAdmin } from '@/lib/supabase'
import { callClaude, parseJsonResponse } from '@/lib/anthropic'
import { sendText, normalizePhone, isWhatsAppConfigured } from '@/lib/whatsapp'
import { WHATSAPP_BROADCASTER_PROMPT } from '@/lib/agent-prompts/whatsapp-broadcaster'
import { SUPPLIER_ONBOARDING_PROMPT } from '@/lib/agent-prompts/supplier-onboarding'
import { SUPPLIER_REACTIVATION_PROMPT } from '@/lib/agent-prompts/supplier-reactivation'

const SEND_DELAY_MS = 1000

// 🔧 (شوف wa-queue-send/route.ts) من غير session صريحة، sendText() بتقع على
// جسر Baileys الميت وترجع 404 — لازم نحدد جلسة OpenWA شغالة دايمًا.
const AGENT_WA_SESSION = process.env.WA_CAMPAIGN_SESSION || 'madmona-982'

async function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

// ============================================================================
// 1. WhatsApp Broadcaster — sends to real customers
// ============================================================================

export async function runWhatsappBroadcasterReal(): Promise<Record<string, unknown>> {
  if (!isWhatsAppConfigured()) {
    return { drafted: false, sent: 0, error: 'WhatsApp not configured' }
  }

  const text = await callClaude({
    systemPrompt: WHATSAPP_BROADCASTER_PROMPT,
    userMessage: JSON.stringify({
      audience_segment: 'active_customers',
      audience_size: 50,
      trending_categories: ['كاميرات', 'مطاعم وكافيهات', 'سيارات'],
    }),
    maxTokens: 1024,
    temperature: 0.7,
  })

  type Msg = {
    campaign_name?: string
    audience?: string
    message_template?: string
    cta_link?: string
    best_send_time?: string
  }
  const out = parseJsonResponse<Msg>(text)
  const messageBody = out.message_template ?? ''

  if (!messageBody.trim()) {
    return { drafted: false, sent: 0, error: 'Empty message body from Claude' }
  }

  const { data: campaign } = await supabaseAdmin
    .from('marketing_campaigns')
    .insert({
      campaign_name: out.campaign_name ?? 'WhatsApp Auto Campaign',
      campaign_type: 'whatsapp',
      status: 'sending',
      audience_segment: out.audience ?? 'active_customers',
      message_template: messageBody,
      ai_generated: true,
      agent_name: 'whatsapp-broadcaster',
      channel_meta: out as unknown as Record<string, unknown>,
      started_at: new Date().toISOString(),
    } as never)
    .select('id')
    .single()

  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, phone, role')
    .not('phone', 'is', null)
    .neq('phone', '')
    .limit(100)

  type P = { id: string; full_name: string | null; phone: string; role: string }
  const targets = ((profiles ?? []) as P[]).filter(p =>
    p.role === 'customer' || p.role === 'user' || !p.role
  )

  let sent = 0
  let failed = 0
  const errors: string[] = []

  for (const target of targets) {
    const phone = normalizePhone(target.phone)
    if (!phone) {
      failed++
      continue
    }

    try {
      const result = await sendText({
        to: phone,
        body: messageBody,
        agentName: 'whatsapp-broadcaster',
        aiGenerated: true,
        session: AGENT_WA_SESSION,
      })
      if (result.ok) {
        sent++
      } else {
        failed++
        if (errors.length < 3) errors.push(`${phone}: ${result.error}`)
      }
    } catch (err) {
      failed++
      if (errors.length < 3) errors.push(`${phone}: ${err instanceof Error ? err.message : 'unknown'}`)
    }

    await sleep(SEND_DELAY_MS)
  }

  if (campaign) {
    await supabaseAdmin
      .from('marketing_campaigns')
      .update({
        status: 'completed',
        sent_count: sent,
        completed_at: new Date().toISOString(),
      } as never)
      .eq('id', (campaign as { id: string }).id)
  }

  return {
    sent,
    failed,
    targets: targets.length,
    campaign: out.campaign_name,
    errors: errors.length > 0 ? errors : undefined,
  }
}

// ============================================================================
// 2. Supplier Onboarding — welcome new pending suppliers (رسالة AI شخصية)
// ============================================================================

export async function runSupplierOnboardingReal(): Promise<Record<string, unknown>> {
  if (!isWhatsAppConfigured()) {
    return { sent: 0, error: 'WhatsApp not configured' }
  }

  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()

  type Sup = {
    id: string
    business_name: string
    profile_id: string
    kyc_status: string
    account_type?: string | null
    created_at: string
    profiles: { full_name: string | null; phone: string | null } | null
  }

  // دوره الحقيقي (شوف supplier-onboarding prompt): supplier سجّل من 2-6 ساعات
  // ولسه مضافش listing — مش أي pending. لو مفيش created_at نطاق نرجع لكل pending
  // حديث بدل ما نسيبها فاضية (fallback آمن).
  const { data: suppliers } = await supabaseAdmin
    .from('marketplace_suppliers')
    .select('id, business_name, profile_id, kyc_status, created_at, listings_count, profiles!inner(full_name, phone)')
    .eq('kyc_status', 'pending')
    .eq('listings_count', 0)
    .lte('created_at', twoHoursAgo)
    .gte('created_at', sixHoursAgo)
    .limit(20)

  const targets = (suppliers ?? []) as unknown as Sup[]

  let sent = 0
  let failed = 0

  for (const sup of targets) {
    const phone = sup.profiles?.phone ? normalizePhone(sup.profiles.phone) : ''
    if (!phone) {
      failed++
      continue
    }

    const name = sup.profiles?.full_name ?? sup.business_name ?? 'صديقنا'
    const hoursSinceSignup = Math.round((Date.now() - new Date(sup.created_at).getTime()) / (60 * 60 * 1000))

    try {
      const text = await callClaude({
        systemPrompt: SUPPLIER_ONBOARDING_PROMPT,
        userMessage: JSON.stringify({
          full_name: name,
          business_name: sup.business_name,
          account_type: sup.account_type ?? 'supplier',
          listings_count: 0,
          hours_since_signup: hoursSinceSignup,
        }),
        maxTokens: 500,
        temperature: 0.7,
      })
      const out = parseJsonResponse<{ message: string; next_action_link?: string }>(text)
      const body = out.message?.trim()
      if (!body) { failed++; continue }

      const result = await sendText({
        to: phone,
        body,
        agentName: 'supplier-onboarding',
        aiGenerated: true,
        session: AGENT_WA_SESSION,
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
// 3. Supplier Activation — KYC-approved with 0 listings
// ============================================================================

export async function runSupplierActivationReal(): Promise<Record<string, unknown>> {
  if (!isWhatsAppConfigured()) {
    return { sent: 0, error: 'WhatsApp not configured' }
  }

  type Sup = {
    id: string
    business_name: string
    listings_count: number
    profiles: { full_name: string | null; phone: string | null } | null
  }

  const { data: suppliers } = await supabaseAdmin
    .from('marketplace_suppliers')
    .select('id, business_name, listings_count, profiles!inner(full_name, phone)')
    .eq('kyc_status', 'approved')
    .eq('listings_count', 0)
    .limit(20)

  const targets = (suppliers ?? []) as unknown as Sup[]

  let sent = 0
  let failed = 0

  // ماتبعتش تاني لنفس المورد في آخر 7 أيام — من غير حارس ده كان هيبعت نفس
  // الرسالة كل مرة يتشغل فيها الـagent طول ما listings_count فاضل صفر.
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  for (const sup of targets) {
    const phone = sup.profiles?.phone ? normalizePhone(sup.profiles.phone) : ''
    if (!phone) {
      failed++
      continue
    }

    const { data: recentNudge } = await supabaseAdmin
      .from('agent_insights')
      .select('id')
      .eq('agent_name', 'supplier-activation')
      .eq('insight_type', 'activation_nudge_sent')
      .gte('created_at', sevenDaysAgo)
      .contains('data_points', { supplier_id: sup.id })
      .limit(1)
      .maybeSingle()
    if (recentNudge) continue

    const name = sup.profiles?.full_name ?? sup.business_name ?? 'صديقنا'
    const body = `أهلاً ${name} ✓

حسابك على مضمونة معتمد بالكامل، بس لسه ما عملتش إعلان.

عايزين نساعدك تنشر إعلانك في 5 دقائق:
1️⃣ ارفع صورة واحدة + وصف بسيط
2️⃣ حدد سعر اليوم/الساعة
3️⃣ انشر — وإحنا هنبدأ نسوّق

ابدأ من هنا: madmonacairo.com/supplier/listings/new

محتاج مساعدة في الصور أو الأسعار؟ رد علي 🤝`

    try {
      const result = await sendText({
        to: phone,
        body,
        agentName: 'supplier-activation',
        aiGenerated: false,
        session: AGENT_WA_SESSION,
      })
      if (result.ok) {
        sent++
        await supabaseAdmin.from('agent_insights').insert({
          agent_name: 'supplier-activation',
          insight_type: 'activation_nudge_sent',
          title: `تذكير تفعيل — ${sup.business_name}`,
          description: null,
          priority: 'low',
          recommended_action: null,
          data_points: { supplier_id: sup.id },
        } as never)
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

// ============================================================================
// 4. Supplier Reactivation (رسالة AI شخصية)
// ============================================================================

export async function runSupplierReactivationReal(): Promise<Record<string, unknown>> {
  if (!isWhatsAppConfigured()) {
    return { sent: 0, error: 'WhatsApp not configured' }
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  type Sup = {
    id: string
    business_name: string
    listings_count: number
    bookings_count: number
    updated_at: string
    profiles: { full_name: string | null; phone: string | null } | null
  }

  const { data: suppliers } = await supabaseAdmin
    .from('marketplace_suppliers')
    .select('id, business_name, listings_count, bookings_count, updated_at, profiles!inner(full_name, phone)')
    .eq('kyc_status', 'approved')
    .gt('listings_count', 0)
    .lt('updated_at', thirtyDaysAgo)
    .limit(15)

  const targets = (suppliers ?? []) as unknown as Sup[]

  let sent = 0
  let failed = 0

  for (const sup of targets) {
    const phone = sup.profiles?.phone ? normalizePhone(sup.profiles.phone) : ''
    if (!phone) {
      failed++
      continue
    }

    const name = sup.profiles?.full_name ?? sup.business_name ?? 'صديقنا'
    const daysInactive = Math.round((Date.now() - new Date(sup.updated_at).getTime()) / (24 * 60 * 60 * 1000))

    try {
      const text = await callClaude({
        systemPrompt: SUPPLIER_REACTIVATION_PROMPT,
        userMessage: JSON.stringify({
          full_name: name,
          business_name: sup.business_name,
          last_listing_date: sup.updated_at,
          total_past_bookings: sup.bookings_count ?? 0,
          days_inactive: daysInactive,
        }),
        maxTokens: 500,
        temperature: 0.7,
      })
      const out = parseJsonResponse<{ message: string }>(text)
      const body = out.message?.trim()
      if (!body) { failed++; continue }

      const result = await sendText({
        to: phone,
        body,
        agentName: 'supplier-reactivation',
        aiGenerated: true,
        session: AGENT_WA_SESSION,
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
// 5. Cold Leads Outreach (مسار ثانوي — مش في الـ51 agent الحاليين، سايبينه
//    كما هو لأي استخدام يدوي مستقبلي، بس مش موصّل في RUNNERS)
// ============================================================================

export async function runColdLeadsOutreachReal(): Promise<Record<string, unknown>> {
  if (!isWhatsAppConfigured()) {
    return { sent: 0, error: 'WhatsApp not configured' }
  }

  type Lead = {
    id: string
    business_name: string
    phone: string
    category: string | null
    city: string | null
    contact_count: number | null
  }

  const { data: leads } = await supabaseAdmin
    .from('cold_leads')
    .select('id, business_name, phone, category, city, contact_count')
    .in('status', ['contacted', 'new'])
    .or('contact_count.is.null,contact_count.eq.0')
    .limit(10)

  const targets = (leads ?? []) as Lead[]

  let sent = 0
  let failed = 0

  for (const lead of targets) {
    const phone = normalizePhone(lead.phone)
    if (!phone) {
      failed++
      continue
    }

    const body = `السلام عليكم 👋

من فريق مضمونة (madmonacairo.com) — منصة إيجار في مصر بنساعد المؤجرين زيكم يوصلوا لعملاء جداد.

شفنا ${lead.business_name} وحبينا نعرض عليكم تجربة مجانية:
✅ نشر إعلان واحد مجاناً
✅ بيانات الشركة بتاعتكم تظهر للعملاء
✅ مفيش رسوم اشتراك — والسعر اللي بتطلبه هو اللي بتاخده

تحبوا نتحدث؟ ابعتولنا "نعم" نبدأ.

معاملاتك مضمونة 🤝
01002229982`

    try {
      const result = await sendText({
        to: phone,
        body,
        agentName: 'cold-leads-outreach',
        aiGenerated: false,
        session: AGENT_WA_SESSION,
      })
      if (result.ok) {
        sent++
        await supabaseAdmin
          .from('cold_leads')
          .update({
            status: 'reached',
            last_contacted: new Date().toISOString(),
            contact_count: (lead.contact_count ?? 0) + 1,
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
