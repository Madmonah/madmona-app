// app/api/admin/marid-monitor/send/route.ts
// تدخّل يدوي من شاشة مراقبة المارد: الأدمن يشوف غلطة → يبعت تصحيح فورًا
// (وممكن يوقف المارد على المحادثة عشان مايردّش فوق التصحيح).
//
// بيمرّ من نفس نقطة الإرسال الموحّدة (sendText) — فبيحترم:
//   • الرد يخرج من نفس الرقم اللي العميل كلّمه (session_id)
//   • حل الـ LID للـ JID المحفوظ (metadata.wa_jid) عشان الرسالة ماتضيعش
//   • تسجيل الرسالة الصادرة تلقائيًا (ai_generated=false → بتبان «رد يدوي»)
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ADMIN_COOKIE, ADMIN_SESSION_VALUE } from '@/lib/adminGate'
import { sendText } from '@/lib/whatsapp'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

export const dynamic = 'force-dynamic'

// نفس حماية اسم البراند بتاعت مسار المراجعة — التدخّل اليدوي مايكسرش القاعدة
function enforceBrandName(text: string): string {
  if (!text) return text
  return text
    .replace(/مدمونة/g, 'مضمونة')
    .replace(/مدمونه/g, 'مضمونة')
    .replace(/مظمونة/g, 'مضمونة')
    .replace(/مظمونه/g, 'مضمونة')
    .replace(/Madmoonah?/gi, 'Madmona')
    .replace(/\/categories\//g, '/marketplace/')
    .replace(/\/list-your-asset/g, '/add-listing')
    .replace(/\/supplier\/register/g, '/add-listing')
}

export async function POST(req: NextRequest) {
  // 🔒 أدمن بس — نفس كوكي حارس /admin
  if (req.cookies.get(ADMIN_COOKIE)?.value !== ADMIN_SESSION_VALUE) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  let body: { conversationId?: string; text?: string; pause?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 })
  }

  const conversationId = (body.conversationId || '').trim()
  const text = (body.text || '').trim()
  if (!conversationId || !text) {
    return NextResponse.json({ ok: false, error: 'conversationId و text مطلوبين' }, { status: 400 })
  }

  // نجيب رقم المحادثة + الرقم اللي جت عليه + الـ JID المحفوظ (للـ LID)
  const { data: conv, error: cErr } = await supabase
    .from('whatsapp_conversations')
    .select('id, contact_phone, session_id, metadata')
    .eq('id', conversationId)
    .maybeSingle()

  if (cErr || !conv) {
    return NextResponse.json({ ok: false, error: 'المحادثة مش موجودة' }, { status: 404 })
  }

  const sessionId = (conv as { session_id: string | null }).session_id

  // محادثات الويب مش على واتساب — الرد اليدوي من هنا لسه مش متاح ليها
  if (sessionId === 'web') {
    return NextResponse.json(
      { ok: false, error: 'دي محادثة ويب — الرد اليدوي من هنا لواتساب بس دلوقتي' },
      { status: 400 },
    )
  }

  const phone = (conv as { contact_phone: string }).contact_phone
  const savedJid = ((conv as { metadata: { wa_jid?: string } | null }).metadata || {})?.wa_jid

  const clean = enforceBrandName(text).slice(0, 4000)

  const sent = await sendText({
    to: phone,
    jid: savedJid,
    session: sessionId || undefined,
    body: clean,
    conversationId,
    agentName: 'أدمن',
    aiGenerated: false, // تدخّل بشري → بيتسجّل ويبان كـ«رد يدوي» مش رد المارد
  })

  if (!sent.ok) {
    return NextResponse.json({ ok: false, error: sent.error || 'فشل الإرسال' }, { status: 502 })
  }

  // اختياري: نوقف المارد على المحادثة دي عشان مايردّش فوق تصحيح الأدمن
  let paused = false
  if (body.pause) {
    const { error: pErr } = await supabase
      .from('whatsapp_conversations')
      .update({ status: 'paused' } as never)
      .eq('id', conversationId)
    paused = !pErr
  }

  return NextResponse.json({ ok: true, wa_message_id: sent.wa_message_id, paused })
}
