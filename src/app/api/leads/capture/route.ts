// src/app/api/leads/capture/route.ts
// Public endpoint: capture a new lead from landing page
// Triggers immediate AI lead qualification + agent dispatch if high-priority

import { NextRequest, NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { callClaude, parseJsonResponse } from '@/lib/anthropic'
import { LEAD_QUALIFIER_PROMPT } from '@/lib/agent-prompts/lead-qualifier'

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
}

function normalizeEgyptianPhone(phone: string): string {
  let p = phone.replace(/[\s\-+()]/g, '')
  if (p.startsWith('00')) p = p.slice(2)
  if (p.startsWith('20')) return p
  if (p.startsWith('0')) return '20' + p.slice(1)
  if (p.startsWith('1') && p.length === 10) return '20' + p
  return p
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

  try {
    const { data: leadIdRaw, error } = await supabaseAdmin.rpc('capture_lead', {
      p_name: body.name.trim(),
      p_phone: phone,
      p_email: body.email?.trim() || null,
      p_category: body.category?.trim() || null,
      p_message: body.message?.trim() || null,
      p_source: 'landing_page',
      p_utm_source: body.utm_source || null,
      p_utm_campaign: body.utm_campaign || null,
    })

    if (error) {
      console.error('capture_lead RPC error:', error)
      return NextResponse.json({ error: 'فشل تسجيل البيانات' }, { status: 500 })
    }

    const leadId = leadIdRaw as string

    // Run AI scoring in background (don't block response)
    void runAiScoring({
      leadId,
      name: body.name.trim(),
      phone,
      email: body.email?.trim() || null,
      category: body.category?.trim() || null,
      message: body.message?.trim() || null,
      utm_source: body.utm_source || null,
      utm_campaign: body.utm_campaign || null,
    })

    // Notify owner immediately
    void sendEmail({
      to: 'madmona.admin@gmail.com',
      subject: `🎯 Lead جديد: ${body.name}${body.category ? ` (${body.category})` : ''}`,
      html: `<div dir="rtl" style="font-family:Tahoma;padding:20px;max-width:500px">
        <h2 style="color:#1F5F3F">🎯 Lead جديد!</h2>
        <p><strong>الاسم:</strong> ${body.name}</p>
        <p><strong>التليفون:</strong> <a href="https://wa.me/${phone}">+${phone}</a></p>
        ${body.email ? `<p><strong>الإيميل:</strong> ${body.email}</p>` : ''}
        ${body.category ? `<p><strong>الفئة:</strong> ${body.category}</p>` : ''}
        ${body.message ? `<p><strong>الرسالة:</strong> ${body.message}</p>` : ''}
        ${body.utm_source ? `<p style="color:#666;font-size:12px"><strong>المصدر:</strong> ${body.utm_source} / ${body.utm_campaign ?? 'organic'}</p>` : ''}
        <p style="color:#999;font-size:11px;margin-top:24px">Lead ID: ${leadId}</p>
        <p><a href="https://wa.me/${phone}" style="background:#25D366;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block">📱 ابعت واتساب فوراً</a></p>
      </div>`,
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      lead_id: leadId,
      message: 'تم استلام بياناتك، هنتواصل معاك قريباً',
    })
  } catch (err) {
    console.error('Lead capture error:', err)
    return NextResponse.json({ error: 'حصل خطأ' }, { status: 500 })
  }
}

async function runAiScoring(args: {
  leadId: string
  name: string
  phone: string
  email: string | null
  category: string | null
  message: string | null
  utm_source: string | null
  utm_campaign: string | null
}): Promise<void> {
  try {
    const text = await callClaude({
      systemPrompt: LEAD_QUALIFIER_PROMPT,
      userMessage: JSON.stringify({
        contact_name: args.name,
        contact_phone: args.phone,
        contact_email: args.email,
        interested_category: args.category,
        notes: args.message,
        source: 'landing_page',
        has_started_checkout: false,
        utm_source: args.utm_source,
        utm_campaign: args.utm_campaign,
      }),
      maxTokens: 512,
      temperature: 0.3,
    })
    const out = parseJsonResponse<{
      lead_score: number
      intent_suggested: string
      reasoning: string
      should_contact: boolean
      priority: string
    }>(text)

    await supabaseAdmin
      .from('sales_leads')
      .update({
        lead_score: out.lead_score,
        intent: out.intent_suggested,
        notes: out.reasoning,
      } as never)
      .eq('id', args.leadId)

    // For high-priority leads, log an insight
    if (out.lead_score >= 70 || out.priority === 'high') {
      await supabaseAdmin.from('agent_insights').insert({
        agent_name: 'lead-qualifier',
        insight_type: 'opportunity',
        title: `Lead عالي النية: ${args.name}`,
        description: `Score: ${out.lead_score}. ${out.reasoning}`,
        priority: out.priority === 'high' ? 'high' : 'medium',
        recommended_action: `كلمه فوراً على ${args.phone}`,
        data_points: { lead_id: args.leadId, ...out },
      } as never)

      // Notify owner about high-priority lead
      await sendEmail({
        to: 'madmona.admin@gmail.com',
        subject: `🔥 Lead عالي النية: ${args.name} (${out.lead_score}/100)`,
        html: `<div dir="rtl" style="font-family:Tahoma;padding:20px;max-width:500px">
          <h2 style="color:#C2410C">🔥 Lead عالي النية!</h2>
          <p><strong>الاسم:</strong> ${args.name}</p>
          <p><strong>التليفون:</strong> <a href="https://wa.me/${args.phone}">+${args.phone}</a></p>
          ${args.category ? `<p><strong>عايز:</strong> ${args.category}</p>` : ''}
          <p><strong>Score:</strong> ${out.lead_score}/100</p>
          <p><strong>التحليل:</strong><br>${out.reasoning}</p>
          <p><a href="https://wa.me/${args.phone}" style="background:#25D366;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold">📱 كلمه فوراً!</a></p>
        </div>`,
      })
    }
  } catch (err) {
    console.error('AI scoring failed:', err)
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
