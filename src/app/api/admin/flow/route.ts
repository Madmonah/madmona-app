// src/app/api/admin/flow/route.ts
// =====================================================================
// Madmona Flow Engine — owner-orchestrated agent pipelines
//
// A flow = ordered steps stored in agent_pipelines.steps (jsonb).
// Step types:
//   agent  — run a registered AI agent (dispatchAgent)
//   ai     — a generic Claude task that reads the running context
//   choice — PAUSE: present options to the owner, wait for his pick (resume)
//   email  — branded handoff email to people (TO + CC) via admin_email_outbox
//   drive  — save the produced artifact (+ publish schedule) [interim: flow_artifacts]
//
// Data flows between steps via shared_context (each step may write output_key).
//
// Actions: create | update | toggle | delete | run | resume
// Auth: admin session cookie (same-origin).
// =====================================================================
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { ADMIN_COOKIE, ADMIN_SESSION_VALUE } from '@/lib/adminGate'
import { dispatchAgent } from '@/lib/agent-runners'
import { callClaude } from '@/lib/anthropic'

export const runtime = 'nodejs'
export const maxDuration = 300

type StepType = 'agent' | 'ai' | 'choice' | 'email' | 'drive'
interface Step {
  type: StepType
  agent?: string
  prompt?: string
  output_key?: string
  options_key?: string
  to?: string[]
  cc?: string[]
  subject?: string
  body?: string
  drive_title?: string
  note?: string
}
type Ctx = Record<string, unknown>

function gate(): boolean {
  try { return cookies().get(ADMIN_COOKIE)?.value === ADMIN_SESSION_VALUE }
  catch { return false }
}

const AI_STEP_SYSTEM =
  'إنت محلل ماركتنج في منصة مضمونة (Madmona) — سوق تأجير وخدمات مصري. ' +
  'بترد بالعربي العامية المصرية، عملي ومختصر. لو اتطلب منك اختيارات رجّعها واضحة. ' +
  'استخدم السياق المعطى لك واتكلم في الموضوع المطلوب على طول من غير مقدمات.'

// -------- helpers --------
function asArr(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x) => typeof x === 'string' && x.trim()) as string[]
  if (typeof v === 'string' && v.trim()) return [v.trim()]
  return []
}
function uniq(a: string[]): string[] { return [...new Set(a.map((x) => x.trim()).filter(Boolean))] }

function interp(s: string | undefined, ctx: Ctx): string {
  if (!s) return ''
  return s.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, k) => {
    const v = ctx[k]
    if (v == null) return ''
    return typeof v === 'string' ? v : JSON.stringify(v)
  })
}

function labelFor(s: Step): string {
  switch (s.type) {
    case 'agent': return s.agent || 'agent'
    case 'ai': return '🧠 ' + (s.output_key || 'ai')
    case 'choice': return '⏸ قرارك'
    case 'email': return '📧 إيميل'
    case 'drive': return '💾 Drive'
    default: return 'step'
  }
}

// normalize raw steps coming from the builder / DB (back-compat: bare {agent})
function cleanSteps(raw: unknown): Step[] {
  if (!Array.isArray(raw)) return []
  const out: Step[] = []
  for (const r0 of raw) {
    const r = (r0 || {}) as Record<string, unknown>
    let type = (r.type as StepType) || (r.agent ? 'agent' : undefined)
    if (!type) continue
    if (type === 'agent') {
      const agent = String(r.agent || '').trim()
      if (!agent) continue
      out.push({ type, agent, output_key: r.output_key ? String(r.output_key) : undefined, note: r.note ? String(r.note) : undefined })
    } else if (type === 'ai') {
      const prompt = String(r.prompt || '').trim()
      if (!prompt) continue
      out.push({ type, prompt, output_key: String(r.output_key || `ai_${out.length + 1}`), note: r.note ? String(r.note) : undefined })
    } else if (type === 'choice') {
      out.push({
        type,
        prompt: r.prompt ? String(r.prompt) : undefined,
        options_key: r.options_key ? String(r.options_key) : undefined,
        output_key: String(r.output_key || 'choice'),
        note: r.note ? String(r.note) : undefined,
      })
    } else if (type === 'email') {
      const subject = String(r.subject || '').trim()
      const to = asArr(r.to), cc = asArr(r.cc)
      if (!subject) continue
      out.push({ type, subject, body: r.body ? String(r.body) : '', to, cc, note: r.note ? String(r.note) : undefined })
    } else if (type === 'drive') {
      out.push({ type, drive_title: r.drive_title ? String(r.drive_title) : 'Madmona artifact', output_key: r.output_key ? String(r.output_key) : undefined, note: r.note ? String(r.note) : undefined })
    }
  }
  return out
}

// branded HTML email (Madmona look — cream + green, gold→green accent allowed)
function brandedEmail(subject: string, bodyText: string, meta: { flow?: string; stage?: string }): { html: string; text: string } {
  const safe = (bodyText || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')
  const html = `<!doctype html><html dir="rtl" lang="ar"><body style="margin:0;background:#FAFAF7;font-family:Tahoma,Arial,sans-serif;color:#1A2E26">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="border-radius:20px;overflow:hidden;border:1px solid #e7e7e1;background:#fff">
      <div style="background:linear-gradient(135deg,#D4A017 0%,#2FA084 55%,#FA8125 100%);padding:20px 24px;color:#fff">
        <div style="font-size:12px;letter-spacing:2px;opacity:.9">MADMONA · مضمونة</div>
        <div style="font-size:19px;font-weight:800;margin-top:4px">${subject}</div>
        ${meta.flow ? `<div style="font-size:12px;opacity:.92;margin-top:6px">سلسلة: ${meta.flow}${meta.stage ? ` · ${meta.stage}` : ''}</div>` : ''}
      </div>
      <div style="padding:22px 24px;font-size:15px;line-height:1.9">${safe}</div>
      <div style="padding:14px 24px;border-top:1px solid #f0f0ec;font-size:12px;color:#6B7280">
        مضمونة · سوق التأجير والخدمات · <a href="https://madmonacairo.com" style="color:#FA8125;text-decoration:none">madmonacairo.com</a>
      </div>
    </div>
  </div></body></html>`
  const text = `${subject}\n\n${bodyText}\n\n— مضمونة · madmonacairo.com`
  return { html, text }
}

// load comms defaults (owner email = reply_to, always_cc)
async function commsDefaults(): Promise<{ ownerEmail: string | null; alwaysCc: string[] }> {
  // @ts-expect-error untyped
  const { data } = await supabaseAdmin.from('comms_settings').select('owner_email, always_cc').eq('id', 'current').maybeSingle()
  const d = data as { owner_email?: string | null; always_cc?: string[] | null } | null
  return { ownerEmail: d?.owner_email || null, alwaysCc: Array.isArray(d?.always_cc) ? d!.always_cc! : [] }
}

// ---- تحويل محتوى الإيميل لـ tasks بخطوات (flow_tasks) ----
// بناخد نص الإيميل ونسأل Claude يقسّمه لمهام تنفيذية واضحة، كل مهمة بخطوات checklist
async function tasksFromEmailBody(subject: string, bodyText: string): Promise<Array<{ title: string; steps: string[] }>> {
  if (!bodyText.trim()) return []
  try {
    const text = await callClaude({
      systemPrompt:
        'إنت منسّق عمليات في مضمونة. بتاخد محتوى رسالة شغل وبتحوّله لقائمة مهام تنفيذية واضحة، ' +
        'كل مهمة مقسّمة لخطوات صغيرة قابلة للتنفيذ والتشطيب. ' +
        'رجّع JSON array بس بالشكل ده من غير أي كلام تاني: ' +
        '[{"title":"عنوان المهمة","steps":["خطوة 1","خطوة 2"]}]. ' +
        'أقصى 6 مهام، وكل مهمة من 2 ل 6 خطوات. لو المحتوى مفيهوش شغل قابل للتنفيذ رجّع [].',
      userMessage: `العنوان: ${subject}\n\nالمحتوى:\n${bodyText.slice(0, 6000)}`,
      maxTokens: 1400, temperature: 0.4,
    })
    const m = text.match(/\[[\s\S]*\]/)
    if (!m) return []
    const arr = JSON.parse(m[0]) as Array<{ title?: string; steps?: unknown }>
    return arr
      .filter((x) => x && typeof x.title === 'string' && x.title.trim())
      .map((x) => ({
        title: String(x.title).trim(),
        steps: Array.isArray(x.steps) ? x.steps.map((s) => String(s).trim()).filter(Boolean) : [],
      }))
      .slice(0, 6)
  } catch {
    return []
  }
}

// تسجيل المهام المتولّدة في flow_tasks (service-role بيتخطّى الـ RLS)
async function insertFlowTasks(
  runId: string, flowName: string, assigneeEmail: string | null,
  tasks: Array<{ title: string; steps: string[] }>,
): Promise<number> {
  if (!tasks.length) return 0
  const rows = tasks.map((tk) => ({
    pipeline_run_id: runId,
    flow_name: flowName,
    title: tk.title,
    assignee_email: assigneeEmail,
    status: 'pending',
    priority: 'medium',
    source: 'email',
    steps: tk.steps.map((tx, k) => ({ id: `st_${k + 1}`, text: tx, done: false })),
  }))
  // @ts-expect-error untyped
  const { error } = await supabaseAdmin.from('flow_tasks').insert(rows as never)
  return error ? 0 : rows.length
}

// --- step_run logging ---
async function startStep(runId: string, i: number, s: Step): Promise<string | undefined> {
  // @ts-expect-error untyped
  const { data } = await supabaseAdmin.from('pipeline_step_runs').insert({
    pipeline_run_id: runId, step_index: i, agent_name: labelFor(s),
    status: 'running', started_at: new Date().toISOString(), output_key: s.output_key ?? null,
  }).select('id').single()
  return (data as { id?: string } | null)?.id
}
async function endStep(stepId: string | undefined, started: number, status: 'completed' | 'failed', output: unknown, error?: string) {
  if (!stepId) return
  // @ts-expect-error untyped
  await supabaseAdmin.from('pipeline_step_runs').update({
    status, completed_at: new Date().toISOString(), duration_ms: Date.now() - started,
    output: (output ?? null) as never, error: error ?? null,
  }).eq('id', stepId)
}

interface StepResult { index: number; type: StepType; label: string; success: boolean; error?: string; note?: string }

// execute steps starting at index; mutates ctx; returns {results, paused?}
async function executeFrom(
  runId: string, pipelineName: string, steps: Step[], start: number, ctx: Ctx,
  comms: { ownerEmail: string | null; alwaysCc: string[] },
): Promise<{ results: StepResult[]; paused?: { index: number; output_key: string; options: unknown[] } }> {
  const results: StepResult[] = []

  for (let i = start; i < steps.length; i++) {
    const s = steps[i]
    const stepId = await startStep(runId, i, s)
    const t0 = Date.now()
    try {
      if (s.type === 'agent') {
        const res = await dispatchAgent(s.agent!, { context: ctx })
        if (s.output_key) ctx[s.output_key] = res.output_summary ?? null
        await endStep(stepId, t0, res.success ? 'completed' : 'failed', res.output_summary, res.error)
        results.push({ index: i, type: s.type, label: labelFor(s), success: res.success, error: res.error })
      }

      else if (s.type === 'ai') {
        const text = await callClaude({
          systemPrompt: AI_STEP_SYSTEM,
          userMessage: `${interp(s.prompt, ctx)}\n\n=== السياق الحالي ===\n${JSON.stringify(ctx, null, 0).slice(0, 6000)}`,
          maxTokens: 1600, temperature: 0.6,
        })
        ctx[s.output_key || `ai_${i}`] = text
        await endStep(stepId, t0, 'completed', { text }, undefined)
        results.push({ index: i, type: s.type, label: labelFor(s), success: true })
      }

      else if (s.type === 'choice') {
        // build options: from a context key, or generated by Claude
        let options: unknown[] = []
        if (s.options_key && Array.isArray(ctx[s.options_key])) {
          options = ctx[s.options_key] as unknown[]
        } else if (s.prompt) {
          const text = await callClaude({
            systemPrompt: AI_STEP_SYSTEM + ' رجّع النتيجة JSON array بس: [{"id":"1","label":"..."}] من غير أي كلام تاني.',
            userMessage: `${interp(s.prompt, ctx)}\n\nالسياق:\n${JSON.stringify(ctx).slice(0, 4000)}`,
            maxTokens: 900, temperature: 0.7,
          })
          try {
            const m = text.match(/\[[\s\S]*\]/)
            options = m ? JSON.parse(m[0]) : []
          } catch { options = [] }
        }
        const output_key = s.output_key || 'choice'
        // pause the run; persist everything needed to resume
        ctx._choice = { index: i, output_key, options }
        ctx._resume_index = i + 1
        // @ts-expect-error untyped
        await supabaseAdmin.from('pipeline_runs').update({
          status: 'awaiting_owner', current_step: i, shared_context: ctx as never,
        }).eq('id', runId)
        await endStep(stepId, t0, 'completed', { options, awaiting: true }, undefined)
        results.push({ index: i, type: s.type, label: labelFor(s), success: true, note: 'awaiting_owner' })

        // notify owner by email (if we know his address)
        if (comms.ownerEmail) {
          const lines = (options as Array<{ label?: string }>).map((o, k) => `${k + 1}. ${o?.label ?? JSON.stringify(o)}`).join('\n')
          const { html, text } = brandedEmail(`محتاج قرارك — ${pipelineName}`, `الـ flow وقف مستنّي اختيارك:\n\n${lines}\n\nادخل اللوحة واختار عشان يكمّل.`, { flow: pipelineName, stage: 'قرارك إنت' })
          // @ts-expect-error untyped
          await supabaseAdmin.from('admin_email_outbox').insert({
            to_email: comms.ownerEmail, subject: `محتاج قرارك — ${pipelineName}`,
            body_html: html, body_text: text, from_label: 'Madmona Flow', source: 'flow', status: 'pending',
            scheduled_at: new Date().toISOString(),
          })
        }
        return { results, paused: { index: i, output_key, options } }
      }

      else if (s.type === 'email') {
        const to = uniq(asArr(s.to))
        const ccAll = uniq([...asArr(s.cc), ...comms.alwaysCc]).filter((e) => !to.includes(e))
        const subject = interp(s.subject, ctx) || `رسالة من مضمونة`
        const bodyText = interp(s.body, ctx) || ''
        const { html, text } = brandedEmail(subject, bodyText, { flow: pipelineName, stage: s.note })
        const toEmail = to[0] || comms.ownerEmail || ''
        const cc = uniq([...to.slice(1), ...ccAll]).filter((e) => e && e !== toEmail)
        if (!toEmail) {
          await endStep(stepId, t0, 'failed', null, 'no recipient')
          results.push({ index: i, type: s.type, label: labelFor(s), success: false, error: 'no recipient' })
        } else {
          // @ts-expect-error untyped
          const { error } = await supabaseAdmin.from('admin_email_outbox').insert({
            to_email: toEmail, cc: cc.length ? cc : null, subject,
            body_html: html, body_text: text, reply_to: comms.ownerEmail,
            from_label: 'Madmona', source: 'flow', status: 'pending', scheduled_at: new Date().toISOString(),
          })
          // حوّل محتوى الإيميل لـ tasks بخطوات في الأدمن بانل (flow_tasks)
          let tasksCreated = 0
          if (!error) {
            try {
              const genTasks = await tasksFromEmailBody(subject, bodyText)
              tasksCreated = await insertFlowTasks(runId, pipelineName, toEmail, genTasks)
            } catch { /* مايكسرش خطوة الإيميل */ }
          }
          await endStep(stepId, t0, error ? 'failed' : 'completed', { to: toEmail, cc, tasks_created: tasksCreated }, error?.message)
          results.push({ index: i, type: s.type, label: labelFor(s), success: !error, error: error?.message, note: tasksCreated ? `${tasksCreated} مهمة بخطوات اتعملت` : undefined })
        }
      }

      else if (s.type === 'drive') {
        const title = interp(s.drive_title, ctx) || `${pipelineName} — مخرجات`
        const body = typeof ctx.last === 'string' ? ctx.last : JSON.stringify(ctx, null, 2)
        // @ts-expect-error untyped
        await supabaseAdmin.from('flow_artifacts').insert({
          pipeline_run_id: runId, pipeline_name: pipelineName, title,
          body, schedule: (ctx.schedule ?? null) as never, context: ctx as never,
          drive_status: 'pending_drive_oauth',
        })
        await endStep(stepId, t0, 'completed', { saved: 'db', drive: 'pending_oauth' }, undefined)
        results.push({ index: i, type: s.type, label: labelFor(s), success: true, note: 'drive pending oauth' })
      }

      // advance pointer
      // @ts-expect-error untyped
      await supabaseAdmin.from('pipeline_runs').update({ current_step: i + 1 }).eq('id', runId)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown'
      await endStep(stepId, t0, 'failed', null, msg)
      results.push({ index: i, type: s.type, label: labelFor(s), success: false, error: msg })
    }
  }
  return { results }
}

async function finalizeRun(runId: string, results: StepResult[], ctx: Ctx) {
  const anyFail = results.some((r) => !r.success)
  // @ts-expect-error untyped
  await supabaseAdmin.from('pipeline_runs').update({
    status: anyFail ? 'completed_with_errors' : 'completed',
    completed_at: new Date().toISOString(), shared_context: ctx as never,
  }).eq('id', runId)
}

export async function POST(req: NextRequest) {
  if (!gate()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }
  const action = String(body.action || '')

  try {
    switch (action) {
      case 'create': {
        const name = String(body.name || '').trim()
        if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
        const steps = cleanSteps(body.steps)
        // @ts-expect-error untyped
        const { data, error } = await supabaseAdmin.from('agent_pipelines').insert({
          name, description: String(body.description || ''), steps: steps as never, enabled: true,
        }).select('id').single()
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true, id: (data as { id?: string } | null)?.id })
      }

      case 'update': {
        const id = String(body.id || '')
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
        if (typeof body.name === 'string') patch.name = body.name
        if (typeof body.description === 'string') patch.description = body.description
        if (body.steps !== undefined) patch.steps = cleanSteps(body.steps)
        // @ts-expect-error untyped
        const { error } = await supabaseAdmin.from('agent_pipelines').update(patch).eq('id', id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
      }

      case 'toggle': {
        const id = String(body.id || '')
        // @ts-expect-error untyped
        const { error } = await supabaseAdmin.from('agent_pipelines')
          .update({ enabled: Boolean(body.enabled), updated_at: new Date().toISOString() }).eq('id', id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
      }

      case 'delete': {
        const id = String(body.id || '')
        // @ts-expect-error untyped
        const { error } = await supabaseAdmin.from('agent_pipelines').delete().eq('id', id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
      }

      case 'run': {
        const id = String(body.id || '')
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        // @ts-expect-error untyped
        const { data: pl } = await supabaseAdmin.from('agent_pipelines').select('id, name, steps').eq('id', id).single()
        const pipe = pl as { id: string; name: string; steps: unknown } | null
        if (!pipe) return NextResponse.json({ error: 'flow not found' }, { status: 404 })
        const steps = cleanSteps(pipe.steps)
        if (steps.length === 0) return NextResponse.json({ error: 'الـ flow مفيهوش خطوات صالحة' }, { status: 400 })

        // @ts-expect-error untyped
        const { data: runRow } = await supabaseAdmin.from('pipeline_runs').insert({
          pipeline_id: pipe.id, pipeline_name: pipe.name, status: 'running',
          started_at: new Date().toISOString(), total_steps: steps.length, current_step: 0,
          triggered_by: 'owner', shared_context: {} as never,
        }).select('id').single()
        const runId = (runRow as { id?: string } | null)?.id
        if (!runId) return NextResponse.json({ error: 'failed to create run' }, { status: 500 })

        const comms = await commsDefaults()
        const ctx: Ctx = {}
        const { results, paused } = await executeFrom(runId, pipe.name, steps, 0, ctx, comms)
        if (paused) return NextResponse.json({ ok: true, status: 'awaiting_owner', run_id: runId, options: paused.options, output_key: paused.output_key, results })
        await finalizeRun(runId, results, ctx)
        return NextResponse.json({ ok: true, status: 'completed', run_id: runId, results })
      }

      case 'resume': {
        const run_id = String(body.run_id || '')
        if (!run_id) return NextResponse.json({ error: 'run_id required' }, { status: 400 })
        // @ts-expect-error untyped
        const { data: r } = await supabaseAdmin.from('pipeline_runs').select('id, pipeline_id, pipeline_name, shared_context, status').eq('id', run_id).single()
        const run = r as { id: string; pipeline_id: string; pipeline_name: string; shared_context: Ctx; status: string } | null
        if (!run) return NextResponse.json({ error: 'run not found' }, { status: 404 })
        const ctx: Ctx = run.shared_context || {}
        const choiceInfo = (ctx._choice as { output_key?: string } | undefined)
        const resumeIndex = Number(ctx._resume_index ?? 0)
        // inject the owner's pick
        const choice = body.choice
        if (choiceInfo?.output_key) ctx[choiceInfo.output_key] = choice
        delete ctx._choice; delete ctx._resume_index

        // @ts-expect-error untyped
        const { data: pl } = await supabaseAdmin.from('agent_pipelines').select('name, steps').eq('id', run.pipeline_id).single()
        const pipe = pl as { name: string; steps: unknown } | null
        const steps = cleanSteps(pipe?.steps)

        // @ts-expect-error untyped
        await supabaseAdmin.from('pipeline_runs').update({ status: 'running', shared_context: ctx as never }).eq('id', run_id)

        const comms = await commsDefaults()
        const { results, paused } = await executeFrom(run_id, run.pipeline_name, steps, resumeIndex, ctx, comms)
        if (paused) return NextResponse.json({ ok: true, status: 'awaiting_owner', run_id, options: paused.options, output_key: paused.output_key, results })
        await finalizeRun(run_id, results, ctx)
        return NextResponse.json({ ok: true, status: 'completed', run_id, results })
      }

      default:
        return NextResponse.json({ error: `unknown action: ${action}` }, { status: 400 })
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
