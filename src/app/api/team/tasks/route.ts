// app/api/team/tasks/route.ts — مهامي + إقفال مهمة
// ⚠️ (٢٠ أغسطس ٢٠٢٦) كان بيرجّع **كل** المهام المفتوحة على المنصة لأي حد
//    مسجّل دخول، وبيقفل أي مهمة بالـid من غير أي فحص — و`flow_tasks` مكانش
//    فيها عمود شركة أصلًا. دلوقتي الفلترة والصلاحية في الداتابيز
//    (`get_my_tasks` / `complete_my_task`).
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// عميل بجلسة اليوزر نفسه — عشان `auth.uid()` توصل للداتابيز وتفلتر صح.
// (عميل الـservice_role كان بيتخطى كل فحص.)
function userClient(token: string) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  })
}
async function userFromToken(token: string) {
  const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } })
  const { data: { user } } = await c.auth.getUser()
  return user
}

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (!token || !(await userFromToken(token))) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  const { data, error } = await userClient(token).rpc('get_my_tasks' as never, { p_limit: 60 } as never)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  const res = (data || {}) as { tasks?: unknown[] }
  return NextResponse.json({ ok: true, tasks: res.tasks || [] })
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  let body: { taskId?: string }
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 }) }
  if (!token || !(await userFromToken(token))) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  const taskId = (body.taskId || '').trim()
  if (!taskId) return NextResponse.json({ ok: false, error: 'taskId مطلوب' }, { status: 400 })
  const { data, error } = await userClient(token).rpc('complete_my_task' as never, { p_task_id: taskId } as never)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  const res = (data || {}) as { ok?: boolean; error?: string }
  if (!res.ok) return NextResponse.json({ ok: false, error: res.error || 'مالكش صلاحية' }, { status: 403 })
  return NextResponse.json({ ok: true })
}
