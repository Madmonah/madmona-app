// src/app/api/owner/session/route.ts
// =====================================================================
// 🌉 (١٩ أغسطس ٢٠٢٦ — محمد: «فعّل [صفحات إدارة الموظفين/الفريق] لأي بيزنس
//    B2B أو نشاط كلاود») — جسر كوكي لتوكن الأونر (بوابة الشركاء /owner/*).
//
//    توكن الأونر (owner_sessions) كان متخزّن في localStorage بس، وكل نداءات
//    التحقق منه بتحصل من المتصفح مباشرة (Supabase RPC). ده كويس لصفحة
//    /owner/[supplierId] نفسها، بس أزرار القوائم فيها (الفريق، الحجوزات...)
//    بتوجّه لصفحات /admin/business-finance/<supplierId>/* — واللي بقت
//    دلوقتي محميّة بحارس middleware.ts (موظفي مضمونة بس). middleware.ts
//    بيشتغل على السيرفر قبل ما الصفحة تتحمّل خالص، فمش قادر يشوف
//    localStorage — محتاج كوكي HttpOnly عشان يتأكد إن صاحب الطلب أونر
//    حقيقي لنفس البيزنس ده بالذات.
//
//    الراوت ده بيحط/يمسح نسخة من نفس توكن owner_sessions في كوكي —
//    التوكن نفسه، مفيش سرّ جديد. middleware.ts هيتأكد منه بنداء
//    owner_check_by_token لنفس الـsupplier_id قبل ما يسمح بالدخول.
// =====================================================================

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const OWNER_TOKEN_COOKIE = 'madmona_owner_token'
const isProd = process.env.NODE_ENV === 'production'
const MAX_AGE = 60 * 60 * 24 * 30 // ٣٠ يوم — نفس مدة owner_sessions.expires_at بالظبط

export async function POST(req: Request) {
  let token = ''
  try {
    const body = await req.json()
    token = typeof body?.token === 'string' ? body.token : ''
  } catch {
    return NextResponse.json({ ok: false, error: 'طلب غير صالح' }, { status: 400 })
  }
  if (!token) return NextResponse.json({ ok: false, error: 'توكن مطلوب' }, { status: 400 })

  const res = NextResponse.json({ ok: true })
  res.cookies.set(OWNER_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(OWNER_TOKEN_COOKIE, '', { httpOnly: true, secure: isProd, sameSite: 'lax', path: '/', maxAge: 0 })
  return res
}
