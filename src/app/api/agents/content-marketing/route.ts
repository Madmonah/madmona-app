// src/app/api/agents/content-marketing/route.ts
// Content Marketing Agent: runs daily at 8 AM Cairo time (6 AM UTC) via Vercel Cron
// Generates a daily Instagram/Facebook post and emails it to Mohamed

import { NextRequest, NextResponse } from 'next/server'
import { callClaude, parseJsonResponse } from '@/lib/anthropic'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { CONTENT_MARKETING_PROMPT } from '@/lib/agent-prompts/content-marketing'

export const runtime = 'nodejs'
export const maxDuration = 60

interface ContentOutput {
  category: 'A' | 'B' | 'C'
  topic: string
  headline: string
  caption: string
  hashtags: string[]
  cta: string
  design_brief: string
  best_posting_time: 'morning' | 'afternoon' | 'evening'
}

function getTodaysCategoryHint(): string {
  const day = new Date().getDate()
  const mod = day % 3
  if (mod === 1) return 'A (Marketplace - general rentals)'
  if (mod === 2) return 'B (Coworking Space)'
  return 'C (Brand & Values)'
}

async function runAgent() {
  const runStart = Date.now()
  const today = new Date().toISOString().split('T')[0]
  const categoryHint = getTodaysCategoryHint()

  const { data: run } = await supabaseAdmin
    .from('agent_runs')
    .insert({
      agent_name: 'content-marketing',
      trigger_type: 'cron',
      status: 'started',
      input_payload: { date: today, category_hint: categoryHint },
    } as never)
    .select('id')
    .single()

  const runId = (run as { id?: string } | null)?.id

  try {
    const userMessage = `النهارده ${today}. اعمل بوست من فئة: ${categoryHint}.
اكتب بوست أصلي مش متكرر، مع التزام كامل بقواعد البراند.`

    const claudeText = await callClaude({
      systemPrompt: CONTENT_MARKETING_PROMPT,
      userMessage,
      maxTokens: 2048,
      temperature: 0.85,
    })

    const post = parseJsonResponse<ContentOutput>(claudeText)
    const emailHtml = buildContentEmailHtml(post, today)
    const ownerEmail = process.env.MADMONA_OWNER_EMAIL ?? 'madmona.admin@gmail.com'

    const sendResult = await sendEmail({
      to: ownerEmail,
      subject: `📝 بوست النهارده — ${post.topic} (${today})`,
      html: emailHtml,
    })

    if (!sendResult.ok) {
      throw new Error(`Email send failed: ${sendResult.error}`)
    }

    if (runId) {
      await supabaseAdmin
        .from('agent_runs')
        .update({
          status: 'success',
          finished_at: new Date().toISOString(),
          duration_ms: Date.now() - runStart,
          output_summary: {
            category: post.category,
            topic: post.topic,
            email_id: sendResult.id,
            sent_to: ownerEmail,
          },
        } as never)
        .eq('id', runId)
    }

    return { success: true, post, email_id: sendResult.id, sent_to: ownerEmail }
  } catch (err) {
    const error = err as Error
    if (runId) {
      await supabaseAdmin
        .from('agent_runs')
        .update({
          status: 'error',
          finished_at: new Date().toISOString(),
          duration_ms: Date.now() - runStart,
          error_message: error.message,
        } as never)
        .eq('id', runId)
    }
    throw error
  }
}

function buildContentEmailHtml(post: ContentOutput, date: string): string {
  const hashtagsLine = post.hashtags.join(' ')
  return `<div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; line-height: 1.8; color: #1a1a1a; max-width: 640px; margin: 0 auto; padding: 24px;">

  <div style="border-right: 4px solid #1F5F3F; padding-right: 16px; margin-bottom: 24px;">
    <h2 style="color: #1F5F3F; margin: 0 0 4px 0;">📝 بوست النهارده</h2>
    <p style="color: #666; margin: 0; font-size: 14px;">${date} — فئة ${post.category}</p>
  </div>

  <div style="background: #FAF7F0; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h3 style="color: #1F5F3F; margin: 0 0 8px 0; font-size: 16px;">الموضوع</h3>
    <p style="margin: 0; font-size: 15px;">${escapeHtml(post.topic)}</p>
  </div>

  <div style="background: #1F5F3F; color: #FAF7F0; padding: 24px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
    <p style="margin: 0 0 4px 0; opacity: 0.7; font-size: 12px;">الـ Headline في التصميم</p>
    <h2 style="margin: 0; font-size: 24px; color: #FAF7F0;">${escapeHtml(post.headline)}</h2>
  </div>

  <h3 style="color: #1F5F3F; margin-top: 24px;">الكابشن (انسخه واستخدمه زي ما هو)</h3>
  <div style="background: #fff; border: 1px solid #ddd; padding: 16px; border-radius: 8px; white-space: pre-wrap; font-size: 15px;">${escapeHtml(post.caption)}

${escapeHtml(post.cta)}

${escapeHtml(hashtagsLine)}</div>

  <h3 style="color: #1F5F3F; margin-top: 24px;">📐 الـ Design Brief (للـ Canva)</h3>
  <div style="background: #fff; border: 1px solid #ddd; padding: 16px; border-radius: 8px; font-family: Consolas, monospace; font-size: 13px; direction: ltr; text-align: left;">${escapeHtml(post.design_brief)}</div>

  <h3 style="color: #1F5F3F; margin-top: 24px;">⏰ أحسن وقت للنشر</h3>
  <p>${translatePostingTime(post.best_posting_time)}</p>

  <hr style="border: none; border-top: 1px solid #ddd; margin: 32px 0;">
  <p style="color: #999; font-size: 12px; text-align: center;">Content Marketing Agent — مضمونة 🤝</p>
</div>`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function translatePostingTime(t: string): string {
  if (t === 'morning') return 'الصبح (8-10 ص)'
  if (t === 'afternoon') return 'بعد الضهر (1-3 م)'
  return 'بالليل (8-10 م)'
}

// ============================================================================
// HTTP handlers
// ============================================================================

export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get('authorization')
  if (process.env.CRON_SECRET && cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runAgent()
    return NextResponse.json(result)
  } catch (err) {
    const error = err as Error
    console.error('Content Marketing agent error:', error)
    return NextResponse.json(
      { error: 'Agent failed', detail: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (
    !process.env.AGENT_WEBHOOK_SECRET ||
    authHeader !== `Bearer ${process.env.AGENT_WEBHOOK_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runAgent()
    return NextResponse.json(result)
  } catch (err) {
    const error = err as Error
    return NextResponse.json(
      { error: 'Agent failed', detail: error.message },
      { status: 500 }
    )
  }
}
