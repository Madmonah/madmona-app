// app/api/team/task/route.ts
// حوّل رسالة من شات الفريق لمهمة في نظام الشغل (flow_tasks) — بيتأكد إنك عضو بالتوكن.
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  let body: { roomId?: string; text?: string; assignee?: string }
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 }) }
  const text = (body.text || '').trim()
  const roomId = (body.roomId || '').trim()
  if (!token || !text) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const userClient = createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  const admin = createClient(URL, SERVICE, { auth: { persistSession: false } })
  if (roomId) {
    const { data: mem } = await admin.from('chat_room_members').select('room_id').eq('room_id', roomId).eq('profile_id', user.id).maybeSingle()
    if (!mem) return NextResponse.json({ ok: false, error: 'مش عضو في الغرفة' }, { status: 403 })
  }

  const { data: prof } = await admin.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
  const assignee = (body.assignee || '').trim() || (prof as { full_name?: string } | null)?.full_name || null
  const now = new Date().toISOString()
  const { data: ins, error } = await admin.from('flow_tasks').insert({
    title: text.slice(0, 180),
    detail: text.length > 180 ? text : null,
    assignee_name: assignee,
    status: 'pending',
    priority: 'medium',
    steps: [],
    source: 'team-chat',
    flow_name: 'شات الفريق',
    created_at: now,
    updated_at: now,
  } as never).select('id').single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, task_id: (ins as { id: string }).id, assignee })
}
