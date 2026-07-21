// رد المارد داخل غرفة فريق — بيتأكد إنك عضو (بالتوكن)، يقرا الثريد، يرد، ويسجّل الرد.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseJsonResponse } from '@/lib/anthropic'
import { callMaridWithTools } from '@/lib/marid-brain'
import { CUSTOMER_CONCIERGE_PROMPT } from '@/lib/agent-prompts/customer-concierge'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  let body: { roomId?: string; text?: string }
  try { body = await request.json() } catch { return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 }) }
  const roomId = (body.roomId || '').trim()
  const text = (body.text || '').trim()
  if (!token || !roomId) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!

  // تحقّق الهوية من التوكن
  const userClient = createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  const admin = createClient(URL, SERVICE, { auth: { persistSession: false } })

  // تحقّق إنك عضو في الغرفة
  const { data: mem } = await admin.from('chat_room_members').select('room_id').eq('room_id', roomId).eq('profile_id', user.id).maybeSingle()
  if (!mem) return NextResponse.json({ ok: false, error: 'مش عضو في الغرفة دي' }, { status: 403 })

  try {
    // سياق الثريد (آخر ٢٠ رسالة)
    const { data: hist } = await admin
      .from('chat_messages').select('sender_kind, sender_name, body')
      .eq('room_id', roomId).order('created_at', { ascending: false }).limit(20)
    const rows = ((hist ?? []) as Array<{ sender_kind: string; sender_name: string | null; body: string | null }>).reverse()
    const historyText = rows.map((h) => `${h.sender_kind === 'marid' ? 'المارد' : (h.sender_name || 'عضو')}: ${h.body || ''}`).join('\n')

    // اسم/رقم صاحب الطلب
    const { data: prof } = await admin.from('profiles').select('phone, full_name').eq('id', user.id).maybeSingle()
    const phone = (prof as { phone?: string } | null)?.phone || ''
    const name = (prof as { full_name?: string } | null)?.full_name || null

    const userMessage = `دي محادثة فريق شغل على مضمونة. سياق الثريد:\n${historyText}\n\n---\nالمطلوب منك دلوقتي:\n${text || 'ساعد الفريق باللي فوق.'}`
    const raw = await callMaridWithTools({ systemPrompt: CUSTOMER_CONCIERGE_PROMPT, userMessage, senderPhone: phone, senderName: name })

    let reply = ''
    try { reply = (parseJsonResponse<{ reply?: string }>(raw).reply || '').trim() } catch { reply = (raw || '').trim() }
    if (!reply && raw.trim().length > 10) reply = raw.trim().slice(0, 1200)
    if (!reply) reply = 'ثانية واحدة — ممكن توضّح المطلوب أكتر؟'
    reply = reply.replace(/\*\*([\s\S]+?)\*\*/g, '$1').replace(/^#{1,6}\s+/gm, '').replace(/\n{3,}/g, '\n\n').trim()

    // سجّل رد المارد (service role) → realtime هيوصّله لكل الأعضاء
    await admin.from('chat_messages').insert({ room_id: roomId, sender_id: null, sender_kind: 'marid', sender_name: 'المارد', body: reply, kind: 'text' })
    return NextResponse.json({ ok: true, reply })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'unknown' }, { status: 500 })
  }
}
