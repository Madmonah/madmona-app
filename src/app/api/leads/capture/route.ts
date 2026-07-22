// src/app/api/leads/capture/route.ts
// Public endpoint: capture a new lead from landing page or direct listing page
// Pipeline: insert lead → AI score → notify owner → auto-WhatsApp if high-priority

import { NextRequest, NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { callClaude, parseJsonResponse } from '@/lib/anthropic'
import { LEAD_QUALIFIER_PROMPT } from '@/lib/agent-prompts/lead-qualifier'
import { sendText, isWhatsAppConfigured, upsertConversation } from '@/lib/whatsapp'

export const runtime = 'nodejs'
export const maxDuration = 30

interface LeadInput {
  name: string
  phone: string
  email?: string
  category?: string
  message?: string
  utm_source?: string
  utm_campaign?: string
  listing_id?: string
  listing_title?: string
}

function normalizeEgyptianPhone(phone: string): string {
  let p = phone.replace(/[\s\-+()]/g, '')
  if (p.startsWith('00')) p = p.slice(2)
  if (p.startsWith('20')) return p
  if (p.startsWith('0')) return '20' + p.slice(1)
  if (p.startsWith('1') && p.length === 10) return '20' + p
  return p
}

const CATEGORY_LABELS: Record<string, string> = {
  apartments: 'شقق وعقارات',
  cars: 'سيارات',
  cameras: 'كاميرات ومعدات تصوير',
  restaurants: 'مطاعم وكافيهات',
  event: 'معدات فعاليات',
  other: 'حاجة تانية',
}

export async function POST(request: NextRequest) {
  let body: LeadInput
  try {
    body = (await request.json()) as LeadInput
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  if (!body.name || body.name.trim().length < 2) {
    return NextResponse.json({ error: 'الاسم مطلوب' }, { status: 400 })
  }
  if (!body.phone || body.phone.trim().length < 8) {
    return NextResponse.json({ error: 'رقم التليفون مطلوب' }, { status: 400 })
  }

  const phone = normalizeEgyptianPhone(body.phone.trim())
  if (!/^20\d{10}$/.test(phone)) {
    return NextResponse.json({ error: 'رقم تليفون مصري غير صحيح' }, { status: 400 })
  }

  const sourceLabel = body.listing_id ? 'listing_direct' : 'landing_page'

  try {
    const { data: leadIdRaw, error } = await supabaseAdmin.rpc('capture_lead', {
      p_name: body.name.trim(),
      p_phone: phone,
      p_email: body.email?.trim() || null,
      p_category: body.category?.trim() || null,
      p_message: body.message?.trim() || null,
      p_source: sourceLabel,
      p_utm_source: body.utm_source || null,
      p_utm_campaign: body.utm_campaign || null,
      p_listing_id: body.listing_id || null,
    })

    if (error) {
      console.error('capture_lead RPC error:', error)
      return NextResponse.json({ error: 'فشل تسجيل البيانات' }, { status: 500 })
    }

    const leadId = leadIdRaw as string

    // ============ AI Scoring (synchronous) ============
    let scoringResult: {
      lead_score: number
      intent_suggested: string
      reasoning: string
      should_contact: boolean
      priority: string
    } | null = null
    try {
      const text = await callClaude({
        systemPrompt: LEAD_QUALIFIER_PROMPT,
        userMessage: JSON.stringify({
          contact_name: body.name.trim(),
          contact_phone: phone,
          contact_email: body.email?.trim() || null,
          interested_category: body.category?.trim() || null,
          interested_listing: body.listing_title || null,
          notes: body.message?.trim() || null,
          source: sourceLabel,
          has_started_checkout: !!body.listing_id, // listing-direct = stronger intent
          utm_source: body.utm_source || null,
          utm_campaign: body.utm_campaign || null,
        }),
        maxTokens: 512,
        temperature: 0.3,
      })
      scoringResult = parseJsonResponse(text)

      if (scoringResult) {
        await supabaseAdmin
          .from('sales_leads')
          .update({
            lead_score: scoringResult.lead_score,
            intent: scoringResult.intent_suggested,
            notes: scoringResult.reasoning,
          } as never)
          .eq('id', leadId)
      }
    } catch (err) {
      console.error('AI scoring failed:', err)
    }

    const isHigh = !!(scoringResult && scoringResult.lead_score >= 70)
    const categoryLabel = body.category ? (CATEGORY_LABELS[body.category] ?? body.category) : null
    const listingContext = body.listing_title ? `إعلان "${body.listing_title}"` : null

    // ============ Auto-WhatsApp (high-priority only, if configured) ============
    let whatsappResult: { sent: boolean; error?: string } = { sent: false }
    if (isHigh && isWhatsAppConfigured()) {
      try {
        // 💬 لينك دخول تلقائي لشات مضمونة (قناة مملوكة، توصيل مضمون). نعمل توكن
        //    زي اللينكات الممغنطة عشان العميل يدخل بضغطة واحدة بهويته.
        let chatUrl = 'https://www.madmonacairo.com/chat/marid'
        try {
          const { data: tok } = await supabaseAdmin
            .from('wa_login_tokens')
            .insert({
              phone,
              next_path: '/chat/marid',
              expires_at: new Date(Date.now() + 7 * 24 * 3600_000).toISOString(),
              max_uses: 5,
            } as never)
            .select('token')
            .maybeSingle()
          const t = (tok as { token?: string } | null)?.token
          if (t) chatUrl = `https://www.madmonacairo.com/l/${t}`
        } catch { /* اللينك العادي يكفّي */ }

        const greeting = `أهلاً ${body.name.split(' ')[0]} 👋

شكراً إنك سجلت على مضمونة!${listingContext ? `\nشفت إنك مهتم بـ ${listingContext}.` : categoryLabel ? `\nشفت إنك مهتم بـ ${categoryLabel}.` : ''}

أنا من فريق مضمونة، وأنا هنا عشان أساعدك تلاقي اللي محتاجه بأفضل سعر وحماية كاملة.

ابعتلي أي سؤال وأنا هرد فوراً 💬

ولو حابب تكمّل معايا على طول ادخل من هنا 👇
${chatUrl}

— معاملاتك مضمونة 🤝`

        const convId = await upsertConversation({
          phone,
          name: body.name,
          contactType: 'customer_lead',
          agentName: 'lead-auto-reply',
        })

        const send = await sendText({
          to: phone,
          body: greeting,
          conversationId: convId ?? undefined,
          agentName: 'lead-auto-reply',
          aiGenerated: true,
        })

        whatsappResult = { sent: send.ok, error: send.error }

        if (send.ok) {
          await supabaseAdmin.from('outreach_log').insert({
            agent_name: 'lead-auto-reply',
            target_type: 'lead',
            target_id: leadId,
            channel: 'whatsapp',
            phone,
            message_text: greeting,
            body: greeting,
            status: 'sent',
            sent_at: new Date().toISOString(),
            external_id: send.wa_message_id ?? null,
            model_used: 'claude-sonnet-4-5',
            metadata: { lead_score: scoringResult?.lead_score, listing_id: body.listing_id },
          } as never)
        }
      } catch (e) {
        console.error('Auto-WhatsApp failed:', e)
        whatsappResult = { sent: false, error: 'send failed' }
      }
    }

    // ============ Email owner ============
    try {
      const subjectSuffix = listingContext ? ` — ${body.listing_title}` : (categoryLabel ? ` (${categoryLabel})` : '')
      await sendEmail({
        to: 'madmona.admin@gmail.com',
        subject: isHigh
          ? `🔥 Lead عالي النية: ${body.name} (${scoringResult!.lead_score}/100)${subjectSuffix}`
          : `🎯 Lead جديد: ${body.name}${subjectSuffix}`,
        html: `<div dir="rtl" style="font-family:Tahoma;padding:20px;max-width:560px;margin:0 auto">
          <h2 style="color:${isHigh ? '#6FCF97' : '#1F6F5F'};margin-top:0">${isHigh ? '🔥 Lead عالي النية!' : '🎯 Lead جديد!'}</h2>
          
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <tr><td style="padding:6px 0;color:#666;width:120px">الاسم:</td><td style="padding:6px 0"><strong>${body.name}</strong></td></tr>
            <tr><td style="padding:6px 0;color:#666">التليفون:</td><td style="padding:6px 0"><a href="https://wa.me/${phone}" style="color:#1F6F5F;font-weight:bold">+${phone}</a></td></tr>
            ${body.email ? `<tr><td style="padding:6px 0;color:#666">الإيميل:</td><td style="padding:6px 0">${body.email}</td></tr>` : ''}
            ${body.listing_title ? `<tr><td style="padding:6px 0;color:#666">الإعلان:</td><td style="padding:6px 0;color:#1F6F5F"><strong>${body.listing_title}</strong></td></tr>` : ''}
            ${categoryLabel ? `<tr><td style="padding:6px 0;color:#666">الفئة:</td><td style="padding:6px 0">${categoryLabel}</td></tr>` : ''}
            ${body.message ? `<tr><td style="padding:6px 0;color:#666;vertical-align:top">الرسالة:</td><td style="padding:6px 0">${body.message}</td></tr>` : ''}
          </table>

          ${scoringResult ? `<div style="background:#FAF7F0;padding:16px;border-radius:8px;border-right:4px solid ${isHigh ? '#6FCF97' : '#2FA084'};margin-bottom:20px">
            <p style="margin:0 0 4px;color:#666;font-size:12px">AI Lead Score</p>
            <p style="margin:0 0 8px;font-size:32px;font-weight:bold;color:${isHigh ? '#6FCF97' : '#1F6F5F'}">${scoringResult.lead_score}/100</p>
            <p style="margin:0;font-size:13px;line-height:1.6">${scoringResult.reasoning}</p>
          </div>` : ''}

          ${whatsappResult.sent ? `<div style="background:#d4edda;padding:12px;border-radius:8px;margin-bottom:16px">
            <strong style="color:#155724">✅ رسالة ترحيب تلقائية اتبعت على واتساب</strong>
          </div>` : whatsappResult.error ? `<div style="background:#fff3cd;padding:12px;border-radius:8px;margin-bottom:16px;font-size:13px;color:#856404">
            ⚠️ Auto-WhatsApp مش شغال: ${whatsappResult.error}
          </div>` : ''}

          <a href="https://wa.me/${phone}?text=${encodeURIComponent(body.listing_title ? `أهلاً ${body.name}، أنا من مضمونة بخصوص "${body.listing_title}"...` : `أهلاً ${body.name}، أنا من مضمونة...`)}" style="display:inline-block;background:#25D366;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold">📱 ${isHigh ? 'كلمه دلوقتي!' : 'ابعت واتساب'}</a>

          ${body.utm_source ? `<p style="color:#666;font-size:11px;margin-top:24px;border-top:1px solid #eee;padding-top:12px"><strong>المصدر:</strong> ${body.utm_source} / ${body.utm_campaign ?? 'organic'}</p>` : ''}
          <p style="color:#999;font-size:10px">Lead ID: ${leadId}${body.listing_id ? ` · Listing: ${body.listing_id}` : ''}</p>
        </div>`,
      })
    } catch (e) {
      console.error('Email failed:', e)
    }

    // ============ Log insight (high-priority) ============
    if (isHigh && scoringResult) {
      try {
        await supabaseAdmin.from('agent_insights').insert({
          agent_name: 'lead-qualifier',
          insight_type: 'opportunity',
          title: `Lead عالي النية: ${body.name}${listingContext ? ` — ${body.listing_title}` : ''}`,
          description: `Score: ${scoringResult.lead_score}. ${scoringResult.reasoning}`,
          priority: scoringResult.priority === 'high' ? 'high' : 'medium',
          recommended_action: `كلمه فوراً على ${phone}`,
          data_points: { lead_id: leadId, ...scoringResult, whatsapp_sent: whatsappResult.sent, listing_id: body.listing_id },
        } as never)
      } catch (e) {
        console.error('Insight log failed:', e)
      }
    }

    return NextResponse.json({
      success: true,
      lead_id: leadId,
      score: scoringResult?.lead_score ?? null,
      message: 'تم استلام بياناتك، هنتواصل معاك قريباً',
    })
  } catch (err) {
    console.error('Lead capture error:', err)
    return NextResponse.json({ error: 'حصل خطأ' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
