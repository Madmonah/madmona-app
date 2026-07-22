import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { saveMedia, type MediaInput } from '@/lib/marid-media'

export const runtime = 'nodejs'
export const maxDuration = 60

// ============================================================================
// POST /api/chat/media
// رفع ميديا في شات مضمونة (فريق/خاص/مارد). بيرفع للستوريج عبر service-role
// (نفس saveMedia بتاعة المارد) وبيسجّل رسالة chat_messages بـ kind + media_url،
// فالـrealtime بيوصّلها لكل الأعضاء. الـauth: توكن اليوزر + عضوية الغرفة.
// body: { roomId, dataBase64, mimetype, kind: 'image'|'video'|'document', filename?, caption? }
// ============================================================================
export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  let body: { roomId?: string; dataBase64?: string; mimetype?: string; kind?: string; filename?: string; caption?: string }
  try { body = await request.json() } catch { return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 }) }

  const roomId = (body.roomId || '').trim()
  const dataBase64 = (body.dataBase64 || '').replace(/^data:[^;]+;base64,/, '').trim()
  const mimetype = (body.mimetype || '').trim() || 'application/octet-stream'
  const caption = (body.caption || '').trim()
  const filename = (body.filename || '').trim() || null

  // نوع الرسالة: صورة / فيديو / ملف — بنحدده من الـmimetype لو مش متبعت
  let kind = (body.kind || '').trim()
  if (!kind) {
    if (mimetype.startsWith('image/')) kind = 'image'
    else if (mimetype.startsWith('video/')) kind = 'video'
    else kind = 'document'
  }
  const mediaType: MediaInput['type'] =
    kind === 'image' ? 'image' : kind === 'video' ? 'video' : kind === 'audio' ? 'audio' : 'document'

  if (!token || !roomId || !dataBase64) {
    return NextResponse.json({ ok: false, error: 'unauthorized or empty' }, { status: 401 })
  }

  const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!

  // تحقّق الهوية من التوكن
  const userClient = createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  const admin = createClient(URL, SERVICE, { auth: { persistSession: false } })

  // تحقّق العضوية
  const { data: mem } = await admin.from('chat_room_members').select('room_id').eq('room_id', roomId).eq('profile_id', user.id).maybeSingle()
  if (!mem) return NextResponse.json({ ok: false, error: 'مش عضو في الغرفة دي' }, { status: 403 })

  try {
    // اسم/رقم صاحب الرسالة (الرقم بيتحط في مسار الستوريج)
    const { data: prof } = await admin.from('profiles').select('phone, full_name').eq('id', user.id).maybeSingle()
    const phone = (prof as { phone?: string } | null)?.phone || 'web'
    const senderName = (prof as { full_name?: string } | null)?.full_name || 'عضو'

    const mediaUrl = await saveMedia({ type: mediaType, mimetype, data_base64: dataBase64, filename } as MediaInput, phone)
    if (!mediaUrl) return NextResponse.json({ ok: false, error: 'فشل رفع الملف' }, { status: 500 })

    const { data: ins, error } = await admin
      .from('chat_messages')
      .insert({ room_id: roomId, sender_id: user.id, sender_kind: 'user', sender_name: senderName, body: caption || null, kind, media_url: mediaUrl })
      .select('*').single()
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, message: ins })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'unknown' }, { status: 500 })
  }
}
