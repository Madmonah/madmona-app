// src/app/api/admin/wa-sessions/route.ts
// بروكسي آمن بين الأدمن وخدمة المارد — عشان السر مايتسربش للمتصفح.

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const BASE = (process.env.WA_SERVICE_URL || '').replace(/\/$/, '')
const SECRET = process.env.WA_SERVICE_SECRET || ''

function guard() {
  if (!BASE) return NextResponse.json({ ok: false, error: 'WA_SERVICE_URL ناقص' }, { status: 500 })
  return null
}

/** قايمة الأرقام وحالتها */
export async function GET() {
  const bad = guard()
  if (bad) return bad
  try {
    const res = await fetch(`${BASE}/sessions`, { signal: AbortSignal.timeout(10000) })
    const data = await res.json()
    return NextResponse.json({
      ...data,
      qr_base: `/api/admin/wa-sessions/qr`,
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'فشل الاتصال بالخدمة' },
      { status: 502 }
    )
  }
}

/** إضافة رقم جديد → بيرجع رابط الـ QR */
export async function POST(request: NextRequest) {
  const bad = guard()
  if (bad) return bad

  let body: { session?: string; label?: string; proxy?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 })
  }

  const session = (body.session || '').replace(/[^\d]/g, '')
  if (!session || session.length < 10) {
    return NextResponse.json({ ok: false, error: 'رقم غير صالح — اكتبه بصيغة 201xxxxxxxxx' }, { status: 400 })
  }

  try {
    const res = await fetch(`${BASE}/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-madmona-secret': SECRET },
      // البروكسي بيروح مع الإضافة عشان **أول** اتصال للرقم بواتساب يطلع
      // من الـIP الصح — أخطر لحظة على رقم جديد هي أول ربط.
      body: JSON.stringify({ session, label: body.label || session, proxy: body.proxy || '' }),
      signal: AbortSignal.timeout(20000),
    })
    const data = await res.json()
    return NextResponse.json({ ...data, qr_url: `/api/admin/wa-sessions/qr?session=${session}` }, { status: res.status })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'فشل إضافة الرقم' },
      { status: 502 }
    )
  }
}

/**
 * تغيير قناة الخروج (البروكسي) لرقم — بيعيد تشغيل الرقم ده بس.
 * القيمة الفاضية = رجوع لـIP السيرفر.
 *
 * ⚠️ الرد بيرجّع البروكسي **مخفي منه اليوزر والباسورد** (`***@host:port`).
 *    بيانات البروكسي سر زي أي سر — ماتوصلش للمتصفح أبدًا.
 */
export async function PUT(request: NextRequest) {
  const bad = guard()
  if (bad) return bad

  let body: { session?: string; proxy?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 })
  }

  const session = (body.session || '').replace(/[^\d]/g, '')
  if (!session) return NextResponse.json({ ok: false, error: 'session مطلوب' }, { status: 400 })

  try {
    const res = await fetch(`${BASE}/sessions/${encodeURIComponent(session)}/proxy`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', 'x-madmona-secret': SECRET },
      body: JSON.stringify({ proxy: body.proxy ?? '' }),
      signal: AbortSignal.timeout(20000),
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'فشل تغيير القناة' },
      { status: 502 }
    )
  }
}

/** فصل رقم ومسح جلسته */
export async function DELETE(request: NextRequest) {
  const bad = guard()
  if (bad) return bad
  const session = request.nextUrl.searchParams.get('session')
  if (!session) return NextResponse.json({ ok: false, error: 'session مطلوب' }, { status: 400 })

  try {
    const res = await fetch(`${BASE}/sessions/${encodeURIComponent(session)}`, {
      method: 'DELETE',
      headers: { 'x-madmona-secret': SECRET },
      signal: AbortSignal.timeout(15000),
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'فشل الفصل' },
      { status: 502 }
    )
  }
}
