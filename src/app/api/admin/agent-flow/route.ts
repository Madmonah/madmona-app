// src/app/api/admin/agent-flow/route.ts
// =====================================================================
// Owner control over a single AI agent (موظف الـ AI):
//   - toggle      شغّل / نوّم   (agent_registry.enabled + next_run_at + employee status)
//   - update_meta عدّل الوصف والمعاد (cron)
//   - add_task    ضيف مهمة ثابتة للموظف
//   - update_task فعّل / عطّل مهمة
//   - delete_task احذف مهمة
// Auth: admin session cookie (same-origin).
// =====================================================================
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { ADMIN_COOKIE, ADMIN_SESSION_VALUE } from '@/lib/adminGate'

export const runtime = 'nodejs'

const MADMONA_SUPPLIER = 'c8b7b9d7-6178-4d0c-abdf-66f34b628e9d'

function gate(): boolean {
  try { return cookies().get(ADMIN_COOKIE)?.value === ADMIN_SESSION_VALUE }
  catch { return false }
}

// resolve the ai_agent employee row for a given agent_name
async function employeeIdForAgent(agentName: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('business_employees')
    .select('id')
    .eq('supplier_id', MADMONA_SUPPLIER)
    .eq('employee_type', 'ai_agent')
    .eq('agent_name', agentName)
    .maybeSingle()
  return (data as { id?: string } | null)?.id ?? null
}

export async function POST(req: NextRequest) {
  if (!gate()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }
  const action = String(body.action || '')

  try {
    switch (action) {
      // -------- شغّل / نوّم --------
      case 'toggle': {
        const agent_name = String(body.agent_name || '')
        const active = Boolean(body.active)
        if (!agent_name) return NextResponse.json({ error: 'agent_name required' }, { status: 400 })

        const { error: e1 } = await supabaseAdmin.from('agent_registry').update({
          enabled: active,
          next_run_at: active ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        }).eq('agent_name', agent_name)
        if (e1) return NextResponse.json({ error: e1.message }, { status: 500 })

        // mirror to the employee row (status active/on_leave)
        await supabaseAdmin.from('business_employees')
          .update({ status: active ? 'active' : 'on_leave' })
          .eq('supplier_id', MADMONA_SUPPLIER)
          .eq('employee_type', 'ai_agent')
          .eq('agent_name', agent_name)

        return NextResponse.json({ success: true, agent_name, active })
      }

      // -------- عدّل الوصف + المعاد --------
      case 'update_meta': {
        const agent_name = String(body.agent_name || '')
        if (!agent_name) return NextResponse.json({ error: 'agent_name required' }, { status: 400 })
        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
        if (typeof body.description === 'string') patch.description = body.description
        if (typeof body.schedule_cron === 'string' && body.schedule_cron.trim()) patch.schedule_cron = body.schedule_cron.trim()
        // @ts-expect-error untyped
        const { error } = await supabaseAdmin.from('agent_registry').update(patch).eq('agent_name', agent_name)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
      }

      // -------- ضيف مهمة ثابتة --------
      case 'add_task': {
        const agent_name = String(body.agent_name || '')
        const title_ar = String(body.title_ar || '').trim()
        if (!agent_name || !title_ar) return NextResponse.json({ error: 'agent_name + title_ar required' }, { status: 400 })
        const empId = await employeeIdForAgent(agent_name)
        if (!empId) return NextResponse.json({ error: 'employee row not found for agent' }, { status: 404 })
        const { error } = await supabaseAdmin.from('employee_fixed_tasks').insert({
          employee_id: empId,
          supplier_id: MADMONA_SUPPLIER,
          title_ar,
          recurrence: 'daily',
          priority: 'medium',
          active: true,
        })
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
      }

      // -------- فعّل / عطّل مهمة --------
      case 'update_task': {
        const task_id = String(body.task_id || '')
        if (!task_id) return NextResponse.json({ error: 'task_id required' }, { status: 400 })
        const { error } = await supabaseAdmin.from('employee_fixed_tasks')
          .update({ active: Boolean(body.active) }).eq('id', task_id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
      }

      // -------- احذف مهمة --------
      case 'delete_task': {
        const task_id = String(body.task_id || '')
        if (!task_id) return NextResponse.json({ error: 'task_id required' }, { status: 400 })
        const { error } = await supabaseAdmin.from('employee_fixed_tasks').delete().eq('id', task_id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: `unknown action: ${action}` }, { status: 400 })
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
