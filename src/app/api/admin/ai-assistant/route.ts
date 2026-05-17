// src/app/api/admin/ai-assistant/route.ts
// Mohamed's natural-language command interface for the AI OS.
//
// Flow:
//   1. User types Arabic/English command (e.g. "ابعت welcome للـ leads الجدد")
//   2. Claude parses → identifies which agents to run with what inputs
//   3. We insert agent_runs (and an optional workflow) and return the plan
//   4. Cron `drain` endpoint picks them up and executes

import { NextRequest, NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { callClaude, parseJsonResponse } from '@/lib/anthropic'

export const runtime = 'nodejs'
export const maxDuration = 60

interface ChatRequest {
  message: string
  user_id?: string | null
}

interface AgentSpec {
  agent_name: string
  step: number
  inputs: Record<string, unknown>
  rationale: string
}

interface ParsedPlan {
  understood: boolean
  reply: string
  needs_confirmation: boolean
  agents: AgentSpec[]
  workflow_name?: string
  workflow_goal?: string
  estimated_minutes: number
  warnings?: string[]
}

const AGENT_CATALOG = `
الـ Agents المتاحة (46 agent):

CREATIVE TEAM (7):
- ad-designer: تصميم banners و ads بـ brand colors
- carousel-designer: تصميم Instagram carousels (10 slides)
- reel-script-writer: كتابة scripts للـ reels (15-30 sec)
- listing-photographer: تنسيق صور الـ listings
- instagram-publisher: نشر على Instagram (post/carousel/reel)
- buffer-publisher: جدولة posts عبر Buffer (IG/FB/TikTok)
- auto-publisher: نشر تلقائي multi-platform

MARKETING TEAM (10):
- content-marketing: كتابة 30 post بالعامية المصرية
- competitor-watcher: تحليل المنافسين (Airbnb, Turo, etc.)
- trend-spotter: استخراج آخر trends في rental marketplace
- seo-agent: تحسين الـ SEO للـ listings/profiles
- email-campaigner: إرسال email campaigns
- whatsapp-broadcaster: إرسال WhatsApp messages للـ leads
- review-generator: متابعة customers لطلب reviews
- referral-agent: إدارة برنامج الـ referrals
- listing-optimizer: تحسين الـ listings الموجودة
- analytics-reporter: تقارير دورية

SALES TEAM (10):
- supplier-hunter: البحث عن suppliers جدد
- supplier-onboarding: ترحيب الـ suppliers الجدد
- supplier-activation: تفعيل suppliers مش عاملين listings
- supplier-reactivation: إرجاع suppliers خاملين
- lead-qualifier: تقييم cold leads
- booking-closer: متابعة bookings مفتوحة
- cart-abandoner: استرجاع سلال متروكة
- customer-concierge: خدمة عملاء
- follow-up-agent: متابعة العملاء
- upsell-agent: عروض إضافية للعملاء

INTELLIGENCE TEAM (7):
- competitor-pricing-spy: تحليل أسعار المنافسين + visual identity
- pricing-optimizer: تحسين أسعار الـ listings
- demand-forecaster: توقع الطلب
- fraud-detector: كشف الاحتيال
- performance-tracker: متابعة KPIs
- prompt-optimizer: تحسين الـ prompts
- revenue-attribution-agent: تتبع مصادر الإيرادات

GROWTH TEAM (3):
- partnership-scout: البحث عن شركاء
- customer-success-agent: نجاح العميل
- content-personalizer: تخصيص المحتوى

OPERATIONS (3):
- booking-manager: إدارة الـ bookings
- finance-tracker: متابعة الفلوس
- quality-control: مراقبة الجودة

SUPPORT (3):
- complaint-resolver: حل الشكاوى
- dispute-mediator: حل النزاعات
- email-responder: الرد على الإيميلات

STRATEGIC (3):
- ceo-assistant: تقارير تنفيذية للمحمد
- strategy-agent: استراتيجية الشركة
- orchestrator: تنسيق multi-agent workflows
`

const PARSER_SYSTEM_PROMPT = `أنت مساعد المؤسس "محمد" لـ Madmona (مضمونة - rental marketplace في مصر).
وظيفتك: استلم أوامره بالعامية المصرية وترجمها لـ tasks للـ AI agents.

عن Madmona:
- منصة إيجار شاملة في مصر
- الشعار: "احنا بتوع الإيجار"
- الفئات: شاليهات، عربيات، معدات، كاميرات، coworking، lounge، meetings
- البراند: Deep Green #1F6F5F + Gold #2FA084
- الموقع: heliopolis، فاتحين 24/7
- 7 social handles موجودة

${AGENT_CATALOG}

# قواعد:
1. رد بالعامية المصرية فقط
2. ردك warm وطبيعي زي صاحب
3. اقترح الـ agents الأنسب
4. حدد الترتيب لو محتاج steps
5. اوعى تستخدم agents مش متاحة
6. inputs لازم تكون detailed وواضحة

# Output JSON (رد بـ JSON فقط بدون أي نص إضافي):
خلي الـ reply مختصر جداً (جملتين ماكس) والـ rationale سطر واحد.
إدا لم تلتزم بالإيجاز، سيتم قطع الرد والفشل.
{
  "understood": true/false,
  "reply": "رد بالعامية",
  "needs_confirmation": false,
  "agents": [{
    "agent_name": "اسم من الـ catalog",
    "step": 1,
    "inputs": { "instruction": "...", "context": {} },
    "rationale": "ليه ده"
  }],
  "workflow_name": "اختياري",
  "workflow_goal": "الهدف",
  "estimated_minutes": 5,
  "warnings": []
}

# لو الأمر مش واضح:
- understood = false، reply = اسأل توضيح، agents = []

# لو محتاج تأكيد (إرسال >50 رسالة، تعديل أسعار، إلخ):
- needs_confirmation = true، املأ الـ agents كأنك هتنفذها

# مهم:
- ارجع JSON فقط، بدون code fences
- reply مختصر (3-5 جمل)
- لو الأمر greeting أو سؤال غير-تنفيذي، خلي agents = []`

export async function POST(request: NextRequest) {
  let userMessageId: string | undefined

  try {
    const body = (await request.json()) as ChatRequest
    if (!body.message || !body.message.trim()) {
      return NextResponse.json({ error: 'Empty message' }, { status: 400 })
    }

    const userId = body.user_id ?? null

    const { data: userMsg } = await supabaseAdmin
      .from('ai_assistant_chats')
      .insert({
        user_id: userId,
        role: 'user',
        content: body.message,
        status: 'parsing',
      } as never)
      .select('id')
      .single()
    userMessageId = (userMsg as { id?: string } | null)?.id

    const { data: history } = await supabaseAdmin
      .from('ai_assistant_chats')
      .select('role, content')
      .order('created_at', { ascending: false })
      .limit(10)

    type HistRow = { role: string; content: string }
    const historyContext = ((history ?? []) as HistRow[])
      .reverse()
      .slice(0, -1)
      .map((h) => `${h.role === 'user' ? 'محمد' : 'المساعد'}: ${h.content}`)
      .join('\n')

    const userPayload = historyContext
      ? `محادثة سابقة:\n${historyContext}\n\nالأمر الجديد من محمد:\n${body.message}`
      : `الأمر من محمد:\n${body.message}`

    const claudeResponse = await callClaude({
      systemPrompt: PARSER_SYSTEM_PROMPT,
      userMessage: userPayload,
      maxTokens: 8000,
      temperature: 0.4,
    })

    let plan: ParsedPlan
    try {
      plan = parseJsonResponse<ParsedPlan>(claudeResponse)
    } catch (parseErr) {
      await supabaseAdmin.from('ai_assistant_chats').insert({
        user_id: userId,
        role: 'assistant',
        content: 'معلش، لخبطت في فهم الأمر. ممكن تعيد بطريقة تانية؟',
        status: 'failed',
        error_message: (parseErr as Error).message,
      } as never)
      return NextResponse.json({
        ok: false,
        reply: 'معلش، لخبطت في فهم الأمر. ممكن تعيد بطريقة تانية؟',
        error: (parseErr as Error).message,
      })
    }

    if (!plan.understood || plan.agents.length === 0) {
      await supabaseAdmin.from('ai_assistant_chats').insert({
        user_id: userId,
        role: 'assistant',
        content: plan.reply,
        status: 'completed',
        parsed_intent: plan as unknown as Record<string, unknown>,
      } as never)
      return NextResponse.json({
        ok: true,
        reply: plan.reply,
        understood: plan.understood,
        agents_dispatched: 0,
      })
    }

    if (plan.needs_confirmation) {
      await supabaseAdmin.from('ai_assistant_chats').insert({
        user_id: userId,
        role: 'assistant',
        content: plan.reply,
        status: 'completed',
        parsed_intent: plan as unknown as Record<string, unknown>,
        metadata: { awaiting_confirmation: true } as unknown as Record<string, unknown>,
      } as never)
      return NextResponse.json({
        ok: true,
        reply: plan.reply,
        needs_confirmation: true,
        plan,
      })
    }

    let workflowId: string | undefined
    if (plan.agents.length > 1 && plan.workflow_name) {
      const { data: wf } = await supabaseAdmin
        .from('agent_workflows')
        .insert({
          workflow_name: plan.workflow_name,
          goal: plan.workflow_goal ?? plan.reply,
          steps: plan.agents.map((a) => ({
            step: a.step,
            agent: a.agent_name,
            rationale: a.rationale,
          })) as unknown as Record<string, unknown>[],
          status: 'queued',
          triggered_by: 'mohamed-ai-assistant',
          triggered_by_event: body.message.slice(0, 100),
        } as never)
        .select('id')
        .single()
      workflowId = (wf as { id?: string } | null)?.id
    }

    const agentRunIds: string[] = []
    for (const a of plan.agents) {
      const { data: run } = await supabaseAdmin
        .from('agent_runs')
        .insert({
          agent_name: a.agent_name,
          trigger_type: 'manual',
          status: 'pending',
          started_at: new Date().toISOString(),
          input_payload: {
            ...a.inputs,
            workflow_id: workflowId,
            step: a.step,
            triggered_by: 'mohamed-ai-assistant',
            user_message: body.message,
          },
        } as never)
        .select('id')
        .single()
      const runId = (run as { id?: string } | null)?.id
      if (runId) agentRunIds.push(runId)
    }

    await supabaseAdmin.from('ai_assistant_chats').insert({
      user_id: userId,
      role: 'assistant',
      content: plan.reply,
      status: 'dispatched',
      parsed_intent: plan as unknown as Record<string, unknown>,
      agent_runs_created: agentRunIds,
      workflow_id: workflowId ?? null,
    } as never)

    return NextResponse.json({
      ok: true,
      reply: plan.reply,
      agents_dispatched: agentRunIds.length,
      agent_run_ids: agentRunIds,
      workflow_id: workflowId,
      estimated_minutes: plan.estimated_minutes,
      warnings: plan.warnings,
    })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'unknown'

    if (userMessageId) {
      await supabaseAdmin
        .from('ai_assistant_chats')
        .update({ status: 'failed', error_message: errorMsg } as never)
        .eq('id', userMessageId)
    }

    await supabaseAdmin.from('ai_assistant_chats').insert({
      role: 'assistant',
      content: 'في مشكلة في النظام دلوقتي. جرب تاني بعد دقيقة.',
      status: 'failed',
      error_message: errorMsg,
    } as never)

    return NextResponse.json({
      ok: false,
      reply: 'في مشكلة في النظام دلوقتي. جرب تاني بعد دقيقة.',
      error: errorMsg,
    })
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '30'), 100)

  const { data: chats } = await supabaseAdmin
    .from('ai_assistant_chats')
    .select('id, role, content, status, agent_runs_created, workflow_id, created_at, parsed_intent')
    .order('created_at', { ascending: false })
    .limit(limit)

  type Chat = {
    id: string
    role: string
    content: string
    status: string
    agent_runs_created: string[] | null
    workflow_id: string | null
    created_at: string
    parsed_intent: Record<string, unknown> | null
  }
  const rows = ((chats ?? []) as Chat[]).reverse()

  const allRunIds = rows.flatMap((r) => r.agent_runs_created ?? [])
  let runStatuses: Record<string, unknown> = {}

  if (allRunIds.length > 0) {
    const { data: runs } = await supabaseAdmin
      .from('agent_runs')
      .select('id, status, output_summary, error_message, agent_name')
      .in('id', allRunIds)

    type Run = {
      id: string
      status: string
      output_summary: unknown
      error_message: string | null
      agent_name: string
    }
    runStatuses = Object.fromEntries(
      ((runs ?? []) as Run[]).map((r) => [r.id, r])
    )
  }

  return NextResponse.json({
    chats: rows,
    run_statuses: runStatuses,
  })
}
