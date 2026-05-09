// src/lib/agent-runners/whatsapp-real-runners.ts
// Real WhatsApp + outreach runners — replaces all the {skipped: true} stubs.
//
// These actually send messages via WhatsApp Cloud API and update lead status.

import { supabase as supabaseAdmin } from '@/lib/supabase'
import { callClaude, parseJsonResponse } from '@/lib/anthropic'
import { sendText, normalizePhone, isWhatsAppConfigured } from '@/lib/whatsapp'
import { WHATSAPP_BROADCASTER_PROMPT } from '@/lib/agent-prompts/whatsapp-broadcaster'

const SEND_DELAY_MS = 1000

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
      trending_categories: ['كاميرات', 'كوورك', 'سيارات'],
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
// 2. Supplier Onboarding — welcome new pending suppliers
// ============================================================================

export async function runSupplierOnboardingReal(): Promise<Record<string, unknown>> {
  if (!isWhatsAppConfigured()) {
    return { sent: 0, error: 'WhatsApp not configured' }
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  type Sup = {
    id: string
    business_name: string
    profile_id: string
    kyc_status: string
    profiles: { full_name: string | null; phone: string | null } | null
  }

  const { data: suppliers } = await supabaseAdmin
    .from('marketplace_suppliers')
    .select('id, business_name, profile_id, kyc_status, profiles!inner(full_name, phone)')
    .eq('kyc_status', 'pending')
    .gte('created_at', sevenDaysAgo)
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
    const body = `أهلاً ${name} 👋

من فريق مضمونة. شكراً إنك سجلت معانا الـ ${sup.business_name}.

عشان نخلص KYC ونفعّل حسابك بسرعة:
1️⃣ ارفع البطاقة + السجل التجاري (لو فيه)
2️⃣ ضيف إعلان واحد على الأقل عشان نراجع الحساب

اللينك: madmonacairo.com/supplier/dashboard

محتاج مساعدة؟ رد على الرسالة دي وأنا معاك.

احنا بتوع الإيجار 🤝`

    try {
      const result = await sendText({
        to: phone,
        body,
        agentName: 'supplier-onboarding',
        aiGenerated: false,
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

  for (const sup of targets) {
    const phone = sup.profiles?.phone ? normalizePhone(sup.profiles.phone) : ''
    if (!phone) {
      failed++
      continue
    }

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
// 4. Supplier Reactivation
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
    const body = `أهلاً ${name} 👋

من مضمونة. شفنا إنك مش داخل الحساب من فترة، وعايزين نفكرك إن إعلاناتك لسه شغّالة 📦

دلوقتي فيه طلب متزايد على ${sup.business_name}. لو محتاج تحدث الأسعار أو تضيف إعلان جديد، اللينك:
madmonacairo.com/supplier/dashboard

سعداء برجوعك 🤝`

    try {
      const result = await sendText({
        to: phone,
        body,
        agentName: 'supplier-reactivation',
        aiGenerated: false,
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
// 5. Cold Leads Outreach
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
✅ مفيش رسوم اشتراك — عمولة بس على الحجوزات الفعلية

تحبوا نتحدث؟ ابعتولنا "نعم" نبدأ.

احنا بتوع الإيجار 🤝
01002229982`

    try {
      const result = await sendText({
        to: phone,
        body,
        agentName: 'cold-leads-outreach',
        aiGenerated: false,
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

// ============================================================================
// 6. Lead Qualifier — score cold_leads with Claude
// ============================================================================

export async function runLeadQualifierReal(): Promise<Record<string, unknown>> {
  type Lead = {
    id: string
    business_name: string
    category: string | null
    city: string | null
    rating: number | null
    review_count: number | null
    notes: string | null
  }

  const { data: leads } = await supabaseAdmin
    .from('cold_leads')
    .select('id, business_name, category, city, rating, review_count, notes')
    .in('status', ['new', 'contacted'])
    .limit(10)

  const targets = (leads ?? []) as Lead[]
  if (targets.length === 0) return { qualified: 0, found: 0 }

  let qualified = 0

  for (const lead of targets) {
    try {
      const text = await callClaude({
        systemPrompt: `أنت محلل leads لمنصة مضمونة (إيجار في مصر).
تقيّم كل lead بسكور من 1 إلى 10 بناءً على:
- جودة البيزنس (rating + review_count)
- ملاءمة الكاتيجوري لمضمونة
- الموقع (القاهرة/الجيزة الأفضل)

ارجع JSON:
{ "score": 1-10, "verdict": "hot" | "warm" | "cold", "reason": "سطر واحد" }`,
        userMessage: JSON.stringify(lead),
        maxTokens: 200,
        temperature: 0.3,
      })

      const evaluation = parseJsonResponse<{
        score: number
        verdict: string
        reason: string
      }>(text)

      await supabaseAdmin.from('agent_insights').insert({
        agent_name: 'lead-qualifier',
        insight_type: 'lead_score',
        title: `${lead.business_name} — ${evaluation.verdict}`,
        description: evaluation.reason,
        priority: evaluation.score >= 7 ? 'high' : evaluation.score >= 4 ? 'medium' : 'low',
        recommended_action: evaluation.score >= 7 ? 'reach_out' : 'monitor',
        data_points: { lead_id: lead.id, ...evaluation },
      } as never)

      if (evaluation.score >= 7) qualified++
    } catch {
      // skip
    }
  }

  return { qualified, found: targets.length }
}
