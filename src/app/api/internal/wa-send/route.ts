// src/app/api/internal/wa-send/route.ts
//
// 🎯 نقطة الإرسال الموحّدة — كل إرسال واتساب في مضمونة لازم يعدّي من هنا.
//
// لماذا هذا الملف موجود:
//   قبل ٢٠ يوليو ٢٠٢٦ كان فيه ١٨ مكان بينفّذ الإرسال بنفسه، كل واحد
//   بينادي graph.facebook.com مباشرة بنسخته. لما الرقم اتنقل من Cloud API
//   للمارد، الـ ١٨ وقعوا مع بعض — وكل واحد كان محتاج إصلاح منفصل.
//
//   دلوقتي: القناة بتتغيّر في مكان واحد (lib/whatsapp.ts) والكل بيمشي وراها.
//
// مين بينادي إيه:
//   • مسارات Next.js      → import { sendText } from '@/lib/whatsapp'
//   • دوال Supabase Edge  → POST على المسار ده بهيدر x-internal-secret
//
// ❌ ممنوع: أي نداء مباشر لـ graph.facebook.com للإرسال. لو لقيت واحد، حوّله هنا.

import { NextRequest, NextResponse } from 'next/server'
import { sendText, normalizePhone } from '@/lib/whatsapp'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request: NextRequest) {
  // بنقبل أي من السرّين الداخليين.
  //
  // ليه الاتنين: دوال Supabase Edge بتعيش في نظام تاني بأسراره الخاصة.
  // لو البوابة قبلت `WA_SERVICE_SECRET` بس، كل دالة Edge هتفشل بصمت
  // لو السر مش متظبط عندها — وده بالظبط نوع العطل اللي بنحاربه.
  // `CRON_SECRET` سر داخلي بنفس مستوى الثقة ومتظبط أصلاً.
  const secret = request.headers.get('x-internal-secret')
  const accepted = [process.env.WA_SERVICE_SECRET, process.env.CRON_SECRET].filter(Boolean)
  if (!accepted.length || !secret || !accepted.includes(secret)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  let body: {
    to?: string
    text?: string
    conversation_id?: string
    agent_name?: string
    ai_generated?: boolean
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 })
  }

  const to = normalizePhone(body.to || '')
  if (!to) return NextResponse.json({ ok: false, error: 'رقم غير صالح' }, { status: 400 })
  if (!body.text?.trim()) return NextResponse.json({ ok: false, error: 'text مطلوب' }, { status: 400 })

  const res = await sendText({
    to,
    body: body.text,
    conversationId: body.conversation_id,
    agentName: body.agent_name ?? 'المارد',
    aiGenerated: body.ai_generated ?? false,
  })

  return NextResponse.json(
    { ok: res.ok, wa_message_id: res.wa_message_id, error: res.error },
    { status: res.ok ? 200 : 502 }
  )
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'madmona unified whatsapp send',
    note: 'كل إرسال واتساب لازم يعدّي من هنا — ممنوع نداء graph.facebook.com مباشرة',
  })
}
