// src/app/api/internal/wa-group/route.ts
//
// 👥 بوابة الجروبات — نفس منطق /api/internal/wa-send.
//
// ليه موجود: خدمة المارد على Railway ليها سرّها الخاص (SHARED_SECRET)
// اللي مش متاح خارج Vercel. بدل ما ننشر السر ده في كل مكان محتاجه،
// المسار ده بيقعد في النص: بيتحقق بالسر الداخلي، وبينادي الخدمة
// بسرّها من متغيرات الخادم.
//
// ده بيخلّي السكريبتات المحلية والدوال الخارجية تعمل جروبات
// من غير ما تشوف سر الخدمة أصلاً.

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

function authorized(req: NextRequest): boolean {
  const secret = req.headers.get('x-internal-secret')?.trim()
  const accepted = [
    process.env.EDGE_GATEWAY_SECRET,
    process.env.WA_SERVICE_SECRET,
    process.env.CRON_SECRET,
  ]
    .map((s) => s?.trim())
    .filter(Boolean)
  return !!accepted.length && !!secret && accepted.includes(secret)
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const url = process.env.WA_SERVICE_URL
  const serviceSecret = process.env.WA_SERVICE_SECRET
  if (!url || !serviceSecret) {
    return NextResponse.json({ ok: false, error: 'خدمة الواتساب مش متظبطة' }, { status: 503 })
  }

  let body: {
    subject?: string
    participants?: string[]
    intro?: string
    action?: 'create' | 'rename' | 'picture' | 'profile_pic' | 'add_session' | 'remove_session'
    group_jid?: string
    image_url?: string
    phone?: string
    session?: string
    label?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 })
  }

  // إعادة تسمية جروب موجود — مالهاش علاقة بالإنشاء، فمالهاش
  // شرط الـintro (مفيش حد بيتضاف عشان يتشرحله).
  if (body.action === 'rename') {
    if (!body.group_jid || !body.subject) {
      return NextResponse.json(
        { ok: false, error: 'group_jid و subject مطلوبين' },
        { status: 400 }
      )
    }
    try {
      const res = await fetch(`${url.replace(/\/$/, '')}/group-subject`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-madmona-secret': serviceSecret },
        body: JSON.stringify({ group_jid: body.group_jid, subject: body.subject }),
      })
      const data = await res.json().catch(() => ({}))
      return NextResponse.json(data, { status: res.ok ? 200 : 502 })
    } catch (err) {
      return NextResponse.json(
        { ok: false, error: err instanceof Error ? err.message : 'فشل الاتصال بالخدمة' },
        { status: 502 }
      )
    }
  }

  // شيل رقم مارد — للأرقام اللي اتضافت بالغلط أو اتغيّرت
  if (body.action === 'remove_session') {
    if (!body.session) {
      return NextResponse.json({ ok: false, error: 'session مطلوب' }, { status: 400 })
    }
    try {
      const res = await fetch(
        `${url.replace(/\/$/, '')}/sessions/${encodeURIComponent(body.session)}`,
        { method: 'DELETE', headers: { 'x-madmona-secret': serviceSecret } }
      )
      const data = await res.json().catch(() => ({}))
      return NextResponse.json(data, { status: res.ok ? 200 : 502 })
    } catch (err) {
      return NextResponse.json(
        { ok: false, error: err instanceof Error ? err.message : 'فشل الاتصال بالخدمة' },
        { status: 502 }
      )
    }
  }

  // ربط رقم مارد جديد — بيرجّع لينك الـQR اللي بيتمسح من الموبايل
  if (body.action === 'add_session') {
    if (!body.session) {
      return NextResponse.json({ ok: false, error: 'session مطلوب' }, { status: 400 })
    }
    try {
      const res = await fetch(`${url.replace(/\/$/, '')}/sessions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-madmona-secret': serviceSecret },
        body: JSON.stringify({ session: body.session, label: body.label || body.session }),
      })
      const data = await res.json().catch(() => ({}))
      return NextResponse.json(
        { ...data, qr_page: `${url.replace(/\/$/, '')}/qr?session=${body.session}` },
        { status: res.ok ? 200 : 502 }
      )
    } catch (err) {
      return NextResponse.json(
        { ok: false, error: err instanceof Error ? err.message : 'فشل الاتصال بالخدمة' },
        { status: 502 }
      )
    }
  }

  // صورة البروفايل بتاعت رقم — بنجيبها عشان نحطها لوجو للجروب
  if (body.action === 'profile_pic') {
    if (!body.phone) {
      return NextResponse.json({ ok: false, error: 'phone مطلوب' }, { status: 400 })
    }
    try {
      const res = await fetch(
        `${url.replace(/\/$/, '')}/profile-picture?phone=${encodeURIComponent(body.phone)}`,
        { headers: { 'x-madmona-secret': serviceSecret } }
      )
      const data = await res.json().catch(() => ({}))
      return NextResponse.json(data, { status: res.ok ? 200 : 502 })
    } catch (err) {
      return NextResponse.json(
        { ok: false, error: err instanceof Error ? err.message : 'فشل الاتصال بالخدمة' },
        { status: 502 }
      )
    }
  }

  // صورة الجروب — لوجو الشركة
  if (body.action === 'picture') {
    if (!body.group_jid || !body.image_url) {
      return NextResponse.json(
        { ok: false, error: 'group_jid و image_url مطلوبين' },
        { status: 400 }
      )
    }
    try {
      const res = await fetch(`${url.replace(/\/$/, '')}/group-picture`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-madmona-secret': serviceSecret },
        body: JSON.stringify({ group_jid: body.group_jid, image_url: body.image_url }),
      })
      const data = await res.json().catch(() => ({}))
      return NextResponse.json(data, { status: res.ok ? 200 : 502 })
    } catch (err) {
      return NextResponse.json(
        { ok: false, error: err instanceof Error ? err.message : 'فشل الاتصال بالخدمة' },
        { status: 502 }
      )
    }
  }

  if (!body.subject || !Array.isArray(body.participants) || !body.participants.length) {
    return NextResponse.json({ ok: false, error: 'subject و participants مطلوبين' }, { status: 400 })
  }

  // ⚠️ الشرح إجباري.
  // إضافة رقم لجروب من غير سياق بتتقري كسبام، والناس بتبلّغ،
  // وواتساب بيوقف الرقم. مش مجرد لياقة — ده حماية للرقم نفسه.
  if (!body.intro || body.intro.trim().length < 40) {
    return NextResponse.json(
      { ok: false, error: 'intro مطلوب — الجروب من غير شرح بيتقري كسبام' },
      { status: 400 }
    )
  }

  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/group-create`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-madmona-secret': serviceSecret },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.ok ? 200 : 502 })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'فشل الاتصال بالخدمة' },
      { status: 502 }
    )
  }
}
