// src/app/api/leads/capture/route.ts
// Public endpoint: capture a new lead from landing page
// AI scoring + email runs SYNCHRONOUSLY (Vercel serverless kills void promises)

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

    // Run AI scoring SYNCHRONOUSLY (don't use void — Vercel kills the function before completing)
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
          notes: body.message?.trim() || null,
          source: 'landing_page',
          has_started_checkout: false,
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

    // Email owner (synchronously, don't void)
    const isHigh = scoringResult && scoringResult.lead_score >= 70
    try {
      await sendEmail({
        to: 'madmona.admin@gmail.com',
        subject: isHigh
          ? `🔥 Lead عالي النية: ${body.name} (${scoringResult!.lead_score}/100)`
          : `🎯 Lead جديد: ${body.name}${body.category ? ` (${body.category})` : ''}`,
        html: `<div dir="rtl" style="font-family:Tahoma;padding:20px;max-width:500px">
          <h2 style="color:${isHigh ? '#C2410C' : '#1F5F3F'}">${isHigh ? '🔥 Lead عالي النية!' : '🎯 Lead جديد!'}</h2>
          <p><strong>الاسم:</strong> ${body.name}</p>
          <p><strong>التليفون:</strong> <a href="https://wa.me/${phone}">+${phone}</a></p>
          ${body.email ? `<p><strong>الإيميل:</strong> ${body.email}</p>` : ''}
          ${body.category ? `<p><strong>الفئة:</strong> ${body.category}</p>` : ''}
          ${body.message ? `<p><strong>الرسالة:</strong> ${body.message}</p>` : ''}
          ${scoringResult ? `<p><strong>AI Score:</strong> ${scoringResult.lead_score}/100</p>
          <p><strong>التحليل:</strong><br>${scoringResult.reasoning}</p>` : ''}
          ${body.utm_source ? `<p style="color:#666;font-size:12px"><strong>المصدر:</strong> ${body.utm_source} / ${body.utm_campaign ?? 'organic'}</p>` : ''}
          <p style="color:#999;font-size:11px;margin-top:24px">Lead ID: ${leadId}</p>
          <p><a href="https://wa.me/${phone}" style="background:#25D366;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold">📱 ${isHigh ? 'كلمه فوراً!' : 'ابعت واتساب'}</a></p>
        </div>`,
      })
    } catch (e) {
      console.error('Email failed:', e)
    }

    // Log insight if high priority
    if (isHigh && scoringResult) {
      try {
        await supabaseAdmin.from('agent_insights').insert({
          agent_name: 'lead-qualifier',
          insight_type: 'opportunity',
          title: `Lead عالي النية: ${body.name}`,
          description: `Score: ${scoringResult.lead_score}. ${scoringResult.reasoning}`,
          priority: scoringResult.priority === 'high' ? 'high' : 'medium',
          recommended_action: `كلمه فوراً على ${phone}`,
          data_points: { lead_id: leadId, ...scoringResult },
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
