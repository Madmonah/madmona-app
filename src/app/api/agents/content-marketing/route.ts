// src/app/api/agents/content-marketing/route.ts
// Content Marketing Agent — Generates daily Instagram/Facebook posts.
// Saves to content_calendar table for review + emails draft.

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
  // 🧹 (٢٧ أغسطس ٢٠٢٦) كانت «B (Coworking Space)» — المشروع مبقاش كووركينج.
  if (mod === 2) return 'B (Services, restaurants & beauty)'
  return 'C (Brand & Values)'
}

async function gatherMarketContext(): Promise<Record<string, unknown>> {
  const { count: totalListings } = await supabaseAdmin
    .from('listings')
    .select('*', { count: 'exact', head: true })

  const { count: totalSuppliers } = await supabaseAdmin
    .from('marketplace_suppliers')
    .select('*', { count: 'exact', head: true })

  const { data: recentBookings } = await supabaseAdmin
    .from('marketplace_bookings')
    .select('id, total_amount, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  // 🐞 (١٥ أغسطس ٢٠٢٦ — مسح المصادر الميتة) كان `.select('category')` —
  //    **عمود مش موجود** في `listings` (اسمه `category_id` وبيشاور على جدول
  //    `categories`). الاستعلام بيفشل، `counts` بتفضل فاضية، ووكيل التسويق
  //    بالمحتوى بياخد «مفيش تصنيفات رايجة» كل مرة.
  const { data: trendingCategories } = await supabaseAdmin
    .from('listings')
    .select('category_id, categories(name_ar)')
    .limit(100)
  type C = { category_id: string | null; categories?: { name_ar: string | null } | null }
  const cats = (trendingCategories ?? []) as unknown as C[]
  const counts: Record<string, number> = {}
  cats.forEach((c) => {
    const name = c.categories?.name_ar || c.category_id
    if (!name) return
    counts[name] = (counts[name] ?? 0) + 1
  })
  const sortedCats = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([cat, count]) => ({ category: cat, count }))

  return {
    total_listings: totalListings ?? 0,
    total_suppliers: totalSuppliers ?? 0,
    recent_bookings_count: (recentBookings ?? []).length,
    top_categories: sortedCats,
  }
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
    const marketCtx = await gatherMarketContext()

    const userMessage = `النهارده ${today}. اعمل بوست من فئة: ${categoryHint}.
السياق الحالي للسوق:
${JSON.stringify(marketCtx, null, 2)}

اكتب بوست أصلي مش متكرر، مع التزام كامل بقواعد البراند.`

    const claudeText = await callClaude({
      systemPrompt: CONTENT_MARKETING_PROMPT,
      userMessage,
      maxTokens: 2048,
      temperature: 0.85,
    })

    const post = parseJsonResponse<ContentOutput>(claudeText)

    const { data: contentRow } = await supabaseAdmin
      .from('content_calendar')
      .insert({
        content_type: 'instagram_post',
        title: post.topic,
        body: post.caption,
        hashtags: post.hashtags,
        cta: post.cta,
        design_brief: post.design_brief,
        status: 'drafted',
        agent_name: 'content-marketing',
        category: post.category,
        language: 'ar',
        metadata: {
          headline: post.headline,
          best_posting_time: post.best_posting_time,
          market_context: marketCtx,
        },
      } as never)
      .select('id')
      .single()

    const contentId = (contentRow as { id?: string } | null)?.id

    const emailHtml = buildContentEmailHtml(post, today, contentId)
    const ownerEmail = process.env.MADMONA_OWNER_EMAIL ?? 'madmona.admin@gmail.com'

    const sendResult = await sendEmail({
      to: ownerEmail,
      subject: `📝 بوست النهارده — ${post.topic} (${today})`,
      html: emailHtml,
    })

    if (!sendResult.ok) throw new Error(`Email send failed: ${sendResult.error}`)

    if (runId) {
      await supabaseAdmin
        .from('agent_runs')
        .update({
          status: 'success',
          finished_at: new Date().toISOString(),
          duration_ms: Date.now() - runStart,
          output_summary: {
            content_id: contentId,
            category: post.category,
            topic: post.topic,
            email_id: sendResult.id,
          },
        } as never)
        .eq('id', runId)
    }

    return { success: true, post, content_id: contentId, email_id: sendResult.id }
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

function buildContentEmailHtml(post: ContentOutput, date: string, contentId?: string): string {
  const hashtagsLine = post.hashtags.join(' ')
  return `<div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; line-height: 1.8; color: #1a1a1a; max-width: 640px; margin: 0 auto; padding: 24px;">

  <div style="border-right: 4px solid #059669; padding-right: 16px; margin-bottom: 24px;">
    <h2 style="color: #059669; margin: 0 0 4px 0;">📝 بوست النهارده</h2>
    <p style="color: #666; margin: 0; font-size: 14px;">${date} — فئة ${post.category}</p>
    ${contentId ? `<p style="color: #999; margin: 4px 0 0; font-size: 11px;">Content ID: ${contentId}</p>` : ''}
  </div>

  <div style="background: #FAF7F0; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h3 style="color: #059669; margin: 0 0 8px 0; font-size: 16px;">الموضوع</h3>
    <p style="margin: 0; font-size: 15px;">${escapeHtml(post.topic)}</p>
  </div>

  <div style="background: #059669; color: #FAF7F0; padding: 24px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
    <p style="margin: 0 0 4px 0; opacity: 0.7; font-size: 12px;">الـ Headline في التصميم</p>
    <h2 style="margin: 0; font-size: 24px; color: #FAF7F0;">${escapeHtml(post.headline)}</h2>
  </div>

  <h3 style="color: #059669; margin-top: 24px;">الكابشن (انسخه واستخدمه زي ما هو)</h3>
  <div style="background: #fff; border: 1px solid #ddd; padding: 16px; border-radius: 8px; white-space: pre-wrap; font-size: 15px;">${escapeHtml(post.caption)}

${escapeHtml(post.cta)}

${escapeHtml(hashtagsLine)}</div>

  <h3 style="color: #059669; margin-top: 24px;">📐 الـ Design Brief (للـ Canva)</h3>
  <div style="background: #fff; border: 1px solid #ddd; padding: 16px; border-radius: 8px; font-family: Consolas, monospace; font-size: 13px; direction: ltr; text-align: left;">${escapeHtml(post.design_brief)}</div>

  <h3 style="color: #059669; margin-top: 24px;">⏰ أحسن وقت للنشر</h3>
  <p>${translatePostingTime(post.best_posting_time)}</p>

  <hr style="border: none; border-top: 1px solid #ddd; margin: 32px 0;">
  <p style="color: #999; font-size: 12px; text-align: center;">Content Marketing Agent — مضمونة 🤝<br>
  محفوظ في content_calendar — راجع وافع publish من الداشبورد</p>
</div>`
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function translatePostingTime(t: string): string {
  if (t === 'morning') return 'الصبح (8-10 ص)'
  if (t === 'afternoon') return 'بعد الضهر (1-3 م)'
  return 'بالليل (8-10 م)'
}

export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get('authorization')
  // 🔒 (١٢ أغسطس ٢٠٢٦) fail-closed: لو CRON_SECRET مش متظبط المسار يقفل مش يفتح
  if (!process.env.CRON_SECRET || cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await runAgent()
    return NextResponse.json(result)
  } catch (err) {
    const error = err as Error
    console.error('Content Marketing agent error:', error)
    return NextResponse.json({ error: 'Agent failed', detail: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.AGENT_WEBHOOK_SECRET || authHeader !== `Bearer ${process.env.AGENT_WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await runAgent()
    return NextResponse.json(result)
  } catch (err) {
    const error = err as Error
    return NextResponse.json({ error: 'Agent failed', detail: error.message }, { status: 500 })
  }
}
