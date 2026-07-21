import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// الانضمام لمجموعة عبر رابط دعوة — بيضيف صاحب الحساب لأعضاء الروم.
// service role علشان يعدّي RLS (الدعوة نفسها هي الإذن).
export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || ''
    const token = auth.replace(/^Bearer\s+/i, '').trim()
    if (!token) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    let body: { roomId?: string }
    try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 }) }
    const roomId = (body.roomId || '').trim()
    if (!roomId) return NextResponse.json({ ok: false, error: 'no room' }, { status: 400 })

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    const { data: userData, error: uErr } = await admin.auth.getUser(token)
    const user = userData?.user
    if (uErr || !user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    const { data: room } = await admin.from('chat_rooms').select('id, name').eq('id', roomId).maybeSingle()
    if (!room) return NextResponse.json({ ok: false, error: 'room not found' }, { status: 404 })

    const { data: existing } = await admin
      .from('chat_room_members').select('room_id')
      .eq('room_id', roomId).eq('profile_id', user.id).maybeSingle()
    if (!existing) {
      await admin.from('chat_room_members').insert({ room_id: roomId, profile_id: user.id, role: 'member' } as never)
    }
    return NextResponse.json({ ok: true, roomId, roomName: (room as { name?: string }).name || null })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'error' }, { status: 500 })
  }
}
