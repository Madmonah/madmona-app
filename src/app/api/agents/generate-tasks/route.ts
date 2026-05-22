// src/app/api/agents/generate-tasks/route.ts
// AI Task Generator Agent — generates realistic daily operational tasks PER ROLE
// for each business's active employees (Egyptian Arabic), then assigns them to every
// employee of that role. Booking-specific tasks are created separately by the
// trg_booking_to_task DB trigger, so this agent intentionally skips booking tasks.
//
// Triggers:
//   GET  /api/agents/generate-tasks   -> Vercel Cron (needs CRON_SECRET). Runs all active businesses.
//   POST /api/agents/generate-tasks   -> manual (needs AGENT_WEBHOOK_SECRET). Body: { supplier_id?, force? }

import { NextRequest, NextResponse } from 'next/server'
import { callClaude, parseJsonResponse } from '@/lib/anthropic'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { TASK_GENERATOR_PROMPT } from '@/lib/agent-prompts/task-generator'

export const runtime = 'nodejs'
export const maxDuration = 60

type Priority = 'low' | 'medium' | 'high'
interface GenTask { title_ar: string; priority: Priority; due_time: string | null }
interface RoleTasks { role_ar: string; tasks: GenTask[] }
interface GenOutput { roles: RoleTasks[] }

const VALID_PRIORITY: Priority[] = ['low', 'medium', 'high']

function cleanTime(t: unknown): string | null {
  if (typeof t !== 'string') return null
  const m = t.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const h = Number(m[1]); const mn = Number(m[2])
  if (h > 23 || mn > 59) return null
  return `${String(h).padStart(2, '0')}:${m[2]}`
}

interface EmpRow { id: string; full_name: string; role: string | null; role_ar: string | null; branch_id: string | null }

async function generateForSupplier(supplierId: string, force: boolean) {
  const { data: sup } = await supabaseAdmin
    .from('suppliers')
    .select('id, business_name, industry')
    .eq('id', supplierId)
    .single()
  if (!sup) return { supplier_id: supplierId, skipped: 'no_supplier', tasks_created: 0 }
  const supplier = sup as { id: string; business_name: string; industry: string | null }

  const { data: emps } = await supabaseAdmin
    .from('business_employees')
    .select('id, full_name, role, role_ar, branch_id')
    .eq('supplier_id', supplierId)
    .eq('status', 'active')
  const employees = (emps ?? []) as EmpRow[]
  if (employees.length === 0) return { supplier_id: supplierId, skipped: 'no_employees', tasks_created: 0 }

  const today = new Date().toISOString().slice(0, 10)
  const empIds = employees.map((e) => e.id)

  // Idempotency: if AI (non-booking) tasks already generated today and not forced, skip
  if (!force) {
    const { count } = await supabaseAdmin
      .from('daily_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('task_date', today)
      .is('source_booking_id', null)
      .eq('is_auto_generated', true)
      .in('employee_id', empIds)
    if ((count ?? 0) > 0) return { supplier_id: supplierId, skipped: 'already_generated_today', tasks_created: 0 }
  }

  // Distinct roles (by Arabic role title)
  const roleSet = new Map<string, number>()
  for (const e of employees) {
    const r = (e.role_ar || e.role || 'موظف').trim()
    roleSet.set(r, (roleSet.get(r) ?? 0) + 1)
  }
  const roles = Array.from(roleSet.entries()).map(([role_ar, count]) => ({ role_ar, count }))

  const userMessage = `النشاط: ${supplier.business_name}${supplier.industry ? ` (${supplier.industry})` : ''}
التاريخ: ${today}

الأدوار في الفرع وعدد الموظفين في كل دور:
${roles.map((r) => `- ${r.role_ar} (${r.count})`).join('\n')}

اعملي قائمة مهام يومية تشغيلية لكل دور من دول.`

  const claudeText = await callClaude({
    systemPrompt: TASK_GENERATOR_PROMPT,
    userMessage,
    maxTokens: 3500,
    temperature: 0.6,
  })
  const parsed = parseJsonResponse<GenOutput>(claudeText)

  const roleTasks = new Map<string, GenTask[]>()
  for (const rt of parsed.roles ?? []) {
    if (rt && rt.role_ar && Array.isArray(rt.tasks)) roleTasks.set(rt.role_ar.trim(), rt.tasks)
  }

  // Existing titles today (dedupe) — one query
  const { data: existing } = await supabaseAdmin
    .from('daily_tasks')
    .select('employee_id, title_ar')
    .eq('task_date', today)
    .in('employee_id', empIds)
  const seen = new Set(
    ((existing ?? []) as Array<{ employee_id: string; title_ar: string | null }>).map(
      (x) => `${x.employee_id}|${(x.title_ar || '').trim()}`
    )
  )

  const rows: Record<string, unknown>[] = []
  for (const e of employees) {
    const r = (e.role_ar || e.role || 'موظف').trim()
    const tasks = roleTasks.get(r) ?? []
    for (const t of tasks.slice(0, 6)) {
      const title = (t?.title_ar || '').trim()
      if (!title) continue
      const key = `${e.id}|${title}`
      if (seen.has(key)) continue
      seen.add(key)
      rows.push({
        employee_id: e.id,
        branch_id: e.branch_id,
        task_date: today,
        title_ar: title.slice(0, 200),
        priority: VALID_PRIORITY.includes(t.priority) ? t.priority : 'medium',
        due_time: cleanTime(t.due_time),
        is_auto_generated: true,
        status: 'pending',
      })
    }
  }

  let created = 0
  if (rows.length > 0) {
    const { error } = await supabaseAdmin.from('daily_tasks').insert(rows as never)
    if (error) throw new Error(`insert failed: ${error.message}`)
    created = rows.length
  }

  return {
    supplier_id: supplierId,
    business_name: supplier.business_name,
    roles: roles.length,
    employees: employees.length,
    tasks_created: created,
  }
}

async function runAgent(opts: { supplierId?: string; force?: boolean }) {
  const runStart = Date.now()
  const { data: run } = await supabaseAdmin
    .from('agent_runs')
    .insert({ agent_name: 'generate-tasks', trigger_type: opts.supplierId ? 'manual' : 'cron', status: 'started' } as never)
    .select('id')
    .single()
  const runId = (run as { id?: string } | null)?.id

  try {
    let supplierIds: string[]
    if (opts.supplierId) {
      supplierIds = [opts.supplierId]
    } else {
      const { data: rows } = await supabaseAdmin
        .from('business_employees')
        .select('supplier_id')
        .eq('status', 'active')
      supplierIds = Array.from(
        new Set(((rows ?? []) as Array<{ supplier_id: string }>).map((r) => r.supplier_id).filter(Boolean))
      )
    }

    const results = []
    let totalCreated = 0
    for (const sid of supplierIds) {
      const res = await generateForSupplier(sid, opts.force ?? Boolean(opts.supplierId))
      results.push(res)
      totalCreated += res.tasks_created ?? 0
    }

    if (runId) {
      await supabaseAdmin
        .from('agent_runs')
        .update({
          status: 'success',
          finished_at: new Date().toISOString(),
          duration_ms: Date.now() - runStart,
          output_summary: { suppliers: supplierIds.length, tasks_created: totalCreated, results },
        } as never)
        .eq('id', runId)
    }
    return { success: true, suppliers: supplierIds.length, tasks_created: totalCreated, results }
  } catch (err) {
    const error = err as Error
    if (runId) {
      await supabaseAdmin
        .from('agent_runs')
        .update({ status: 'error', finished_at: new Date().toISOString(), duration_ms: Date.now() - runStart, error_message: error.message } as never)
        .eq('id', runId)
    }
    throw error
  }
}

export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get('authorization')
  if (process.env.CRON_SECRET && cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await runAgent({})
    return NextResponse.json(result)
  } catch (err) {
    const error = err as Error
    console.error('generate-tasks agent error:', error)
    return NextResponse.json({ error: 'Agent failed', detail: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.AGENT_WEBHOOK_SECRET || authHeader !== `Bearer ${process.env.AGENT_WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json().catch(() => ({}))
    const result = await runAgent({ supplierId: body?.supplier_id, force: body?.force })
    return NextResponse.json(result)
  } catch (err) {
    const error = err as Error
    return NextResponse.json({ error: 'Agent failed', detail: error.message }, { status: 500 })
  }
}
