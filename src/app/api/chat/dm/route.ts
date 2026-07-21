import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function normEg(raw: string) {
  let d = (raw || '').replace(/\D/g, '')
  if (d.startsWith('0') && d.length === 11) d = '20' + d.slice(1)
  if (d.length === 10) d = '20' + d
  return d
}

// محادثة خاصة ١:١ — بيلاقي روم direct موجود بين الاتنين أو يعمل واحد جديد.
export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || ''
    const token = auth.replace(/^Bearer\s+/i, '').trim()
    if (!token) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    let body: { phone?: string }
    try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 }) }
    const phone = normEg(body.phone || '')
    if (phone.length < 11) return NextResponse.json({ ok: false, error: 'bad phone' }, { status: 400 })

    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
    const { data: userData, error: uErr } = await admin.auth.getUser(token)
    const me = userData?.user
    if (uErr || !me) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    const local = '0' + phone.slice(2)
    const { data: other } = await admin.from('profiles').select('id, full_name').in('phone', [local, phone, '+' + phone]).limit(1).maybeSingle()
    const otherRow = other as { id?: string; full_name?: string } | null
    if (!otherRow?.id) return NextResponse.json({ ok: false, error: 'no_account' }, { status: 404 })
    if (otherRow.id === me.id) return NextResponse.json({ ok: false, error: 'self' }, { status: 400 })

    // نلاقي روم direct موجود بين الاتنين
    const { data: mine } = await admin.from('chat_room_members').select('room_id').eq('profile_id', me.id)
    const myIds = ((mine || []) as { room_id: string }[]).map((r) => r.room_id)
    let existingId: string | null = null
    if (myIds.length) {
      const { data: theirs } = await admin.from('chat_room_members').select('room_id').eq('profile_id', otherRow.id).in('room_id', myIds)
      const shared = ((theirs || []) as { room_id: string }[]).map((r) => r.room_id)
      if (shared.length) {
        const { data: direct } = await admin.from('chat_rooms').select('id').eq('kind', 'direct').in('id', shared).limit(1)
        const d = (direct || []) as { id: string }[]
        if (d.length) existingId = d[0].id
      }
    }
    if (existingId) return NextResponse.json({ ok: true, roomId: existingId, otherName: otherRow.full_name || null })

    const { data: room } = await admin.from('chat_rooms').insert({ kind: 'direct', name: null, created_by: me.id } as never).select('id').single()
    const rid = (room as { id: string }).id
    await admin.from('chat_room_members').insert([
      { room_id: rid, profile_id: me.id, role: 'owner' },
      { room_id: rid, profile_id: otherRow.id, role: 'member' },
    ] as never)
    return NextResponse.json({ ok: true, roomId: rid, otherName: otherRow.full_name || null })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'error' }, { status: 500 })
  }
}
