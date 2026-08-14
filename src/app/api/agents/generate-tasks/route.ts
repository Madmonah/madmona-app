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
// 🐞 (١٤ أغسطس ٢٠٢٦) كان 60 ثانية. الوكيل بيلف على **كل مورد** بنداء كلود
// منفصل (51 مورد دلوقتي وبيزيدوا)، فمن ٧ أغسطس بقى بيتقتل في النص:
// المهام بتتعمل فعلًا (232 مهمة كل يوم الساعة 04:02) بس التشغيلة بتفضل
// عالقة على `started` — لا success ولا error. يعني المراقبة بتقول إن
// الوكيل «واقف من ٦ أيام» وهو شغال — ولو وقف فعلًا مش هنعرف الفرق.
export const maxDuration = 300

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

  // Idempotency: if AI tasks already generated today and not forced, skip.
  //
  // 🐞 (٦ أغسطس ٢٠٢٦) الحارس ده كان **بيقفل التوليد بالكامل من ٤ أغسطس**:
  //    كان بيعدّ أي مهمة `is_auto_generated` لليوم، والدالة `materialize_fixed_tasks`
  //    بتنزّل مهام القوالب الثابتة (`task_kind='fixed'`, `is_auto_generated=true`)
  //    حوالي ٣ص — يعني قبل الكرون ده بساعات. فكل يوم كان بيرجع
  //    `skipped: already_generated_today` و`tasks_created: 0`، والموظفين
  //    شايفين نفس القايمة الثابتة كل يوم من غير أي مهام ذكية.
  //    الحل: نعدّ **مهام الوكيل بس** (`task_kind='variable'`) مش أي مهمة.
  if (!force) {
    const { count } = await supabaseAdmin
      .from('daily_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('task_date', today)
      .is('source_booking_id', null)
      .eq('is_auto_generated', true)
      .eq('task_kind', 'variable')
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

  // 🐞 (١٤ أغسطس ٢٠٢٦) **الرد كان بيتقطع فيموت التوليد كله.**
  //
  // كان نداء واحد لكل مورد بكل أدواره و`maxTokens: 3500`. ده اشتغل مع
  // الموردين الصغيرين (٦ أدوار وأقل)، لكن `Elite Beauty Salon & Spa`
  // عنده **٣٠ دور / ٨٦ موظف**: ٣٠ دور × ٦ مهام بالعربي بتعدّي السقف
  // بكتير، فرد كلود بيتقطع في النص و`parseJsonResponse` بترمي
  // «Failed to parse … after all repair attempts» (حصل ٨ و١٤ أغسطس).
  //
  // ورفع السقف لوحده **مش حل**: العدد بيكبر مع كل موظف جديد فالمشكلة
  // هترجع. الحل إننا نقسّم الأدوار على نداءات صغيرة مضمونة الحجم.
  //
  // ⚠️ `parseJsonResponse` عندها إصلاحات للنص المقطوع، بس آخر إستراتيجية
  //    بتدوّر على **كائن أعلى مستوى مكتمل** — وده مابيحصلش أبدًا في رد
  //    مقطوع، فبتفشل. عشان كده بنمنع القطع من أصله.
  const ROLES_PER_CALL = 8
  const roleChunks: Array<typeof roles> = []
  for (let i = 0; i < roles.length; i += ROLES_PER_CALL) {
    roleChunks.push(roles.slice(i, i + ROLES_PER_CALL))
  }

  const roleTasks = new Map<string, GenTask[]>()
  let failedChunks = 0
  for (const chunk of roleChunks) {
    const userMessage = `النشاط: ${supplier.business_name}${supplier.industry ? ` (${supplier.industry})` : ''}
التاريخ: ${today}

الأدوار في الفرع وعدد الموظفين في كل دور:
${chunk.map((r) => `- ${r.role_ar} (${r.count})`).join('\n')}

اعملي قائمة مهام يومية تشغيلية لكل دور من دول.`

    // 🛡️ كل دفعة معزولة: لو واحدة فشلت الباقي بيكمّل، بدل ما المورد كله
    //    يضيع — وقبل كده كان المورد الواحد بيوقّع التشغيلة كلها.
    try {
      const claudeText = await callClaude({
        systemPrompt: TASK_GENERATOR_PROMPT,
        userMessage,
        maxTokens: 4000,
        temperature: 0.6,
      })
      const parsed = parseJsonResponse<GenOutput>(claudeText)
      for (const rt of parsed.roles ?? []) {
        if (rt && rt.role_ar && Array.isArray(rt.tasks)) roleTasks.set(rt.role_ar.trim(), rt.tasks)
      }
    } catch (err) {
      failedChunks++
      console.error(
        `[generate-tasks] دفعة أدوار فشلت — ${supplier.business_name}:`,
        (err as Error).message,
      )
    }
  }

  if (roleTasks.size === 0) {
    return {
      supplier_id: supplierId,
      business_name: supplier.business_name,
      skipped: 'all_role_chunks_failed',
      failed_chunks: failedChunks,
      tasks_created: 0,
    }
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
        // 🔑 «variable» = مهام الوكيل الذكية (المتغيرة كل يوم). «fixed» محجوزة
        //    لقوالب `employee_fixed_tasks` عبر `materialize_fixed_tasks`،
        //    و«chat» لمهام الشات (`add_chat_task`). التفرقة دي هي اللي بتخلي
        //    حارس الـidempotency فوق يشتغل صح بدل ما يقفل التوليد.
        task_kind: 'variable',
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
    // بنطلّع الدفعات الفاشلة صراحةً — نجاح جزئي لازم يبان في التقرير
    // مش يعدّي كأنه نجاح كامل.
    ...(failedChunks > 0 ? { failed_chunks: failedChunks, role_chunks: roleChunks.length } : {}),
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

    // ⏱️ ميزانية وقت: بنوقف قبل الحد الأقصى بهامش عشان **نلحق نسجّل النتيجة**.
    // من غير ده الدالة بتتقتل جوه اللوب والتشغيلة تفضل عالقة على `started`
    // للأبد — وده بالظبط اللي كان بيحصل. الباقي بيتعمل في تشغيلة بكرة
    // (الحارس `already_generated_today` بيمنع التكرار للي اتعمل).
    const TIME_BUDGET_MS = 240_000
    const results = []
    let totalCreated = 0
    let timedOutAfter: number | null = null
    const failedSuppliers: Array<{ supplier_id: string; error: string }> = []
    for (const [i, sid] of supplierIds.entries()) {
      if (Date.now() - runStart > TIME_BUDGET_MS) { timedOutAfter = i; break }
      // 🛡️ (١٤ أغسطس ٢٠٢٦) **عزل كل مورد.**
      // قبل كده أي استثناء من `generateForSupplier` كان بيطلع لبرّه اللوب
      // ويقتل التشغيلة كلها. يوم ١٤ أغسطس مورد واحد (Elite Beauty) رد كلود
      // بتاعه اتقطع → التشغيلة ماتت → **٥١ مورد كلهم بصفر مهام**
      // (fixed=787 صح، variable=0). مورد باظ لازم يتسجّل والباقي يكمّل.
      try {
        const res = await generateForSupplier(sid, opts.force ?? Boolean(opts.supplierId))
        results.push(res)
        totalCreated += res.tasks_created ?? 0
      } catch (err) {
        const msg = (err as Error).message
        failedSuppliers.push({ supplier_id: sid, error: msg.slice(0, 300) })
        console.error(`[generate-tasks] مورد فشل (بنكمّل) ${sid}:`, msg)
      }
    }

    if (runId) {
      await supabaseAdmin
        .from('agent_runs')
        .update({
          status: 'success',
          finished_at: new Date().toISOString(),
          duration_ms: Date.now() - runStart,
          output_summary: {
            suppliers: supplierIds.length,
            processed: results.length,
            tasks_created: totalCreated,
            // ⚠️ الموردين الفاشلين لازم يبانوا في التقرير — من غير كده
            //    «success» بيغطّي على شغل ناقص في صمت.
            ...(failedSuppliers.length > 0
              ? { failed_suppliers: failedSuppliers.length, failures: failedSuppliers.slice(0, 10) }
              : {}),
            // لو الميزانية خلصت بنقول ده صراحةً بدل ما نسجّل «نجاح» كامل
            // على شغل ناقص — الباقي بيتعمل بكرة.
            ...(timedOutAfter !== null
              ? { partial: true, stopped_at_supplier_index: timedOutAfter,
                  remaining: supplierIds.length - results.length }
              : {}),
            results,
          },
        } as never)
        .eq('id', runId)
    }
    return {
      success: true, suppliers: supplierIds.length, processed: results.length,
      tasks_created: totalCreated,
      ...(failedSuppliers.length > 0 ? { failed_suppliers: failedSuppliers.length } : {}),
      ...(timedOutAfter !== null ? { partial: true, remaining: supplierIds.length - results.length } : {}),
      results,
    }
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
  // 🔒 (١٢ أغسطس ٢٠٢٦) fail-closed: لو CRON_SECRET مش متظبط المسار يقفل مش يفتح
  if (!process.env.CRON_SECRET || cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
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
