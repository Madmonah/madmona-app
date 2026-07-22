// app/api/team/tasks/route.ts — قايمة المهام المفتوحة + إقفال مهمة (لأي مستخدم مسجّل)
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
}
async function userFromToken(token: string) {
  const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } })
  const { data: { user } } = await c.auth.getUser()
  return user
}

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (!token || !(await userFromToken(token))) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  const { data } = await admin()
    .from('flow_tasks')
    .select('id, title, detail, assignee_name, priority, status, created_at')
    .neq('status', 'done')
    .order('created_at', { ascending: false })
    .limit(60)
  return NextResponse.json({ ok: true, tasks: data || [] })
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  let body: { taskId?: string }
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 }) }
  if (!token || !(await userFromToken(token))) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  const taskId = (body.taskId || '').trim()
  if (!taskId) return NextResponse.json({ ok: false, error: 'taskId مطلوب' }, { status: 400 })
  const now = new Date().toISOString()
  const { error } = await admin().from('flow_tasks').update({ status: 'done', completed_at: now, updated_at: now } as never).eq('id', taskId)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
