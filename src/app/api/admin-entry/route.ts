// src/app/api/admin-entry/route.ts
// =====================================================================
// 🔐 (١٩ أغسطس ٢٠٢٦) الدخول للوحة الأدمن بقى: إيميل أو تليفون + باسورد،
//    لكل موظف مضمونة حساب مستقل — بدل الباسورد المشترك الواحد القديم.
// POST  { identifier, password }  → إيميل أو تليفون + الباسورد. جلسة جديدة.
// GET   ?logout                   → يمسح الجلسة الحالية بس ويرجّع لصفحة الدخول.
// DELETE                          → يمسح الجلسة الحالية (للاستخدام البرمجي).
// =====================================================================

import { NextResponse } from 'next/server'
import {
  PLATFORM_ADMIN_COOKIE,
  PLATFORM_ADMIN_SESSION_DAYS,
  platformAdminDb,
  verifyPassword,
  newSessionToken,
} from '@/lib/platformAdmin'
import { normalizePhone } from '@/lib/auth-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const isProd = process.env.NODE_ENV === 'production'
const MAX_AGE = 60 * 60 * 24 * PLATFORM_ADMIN_SESSION_DAYS

function cookieFromToken(token: string) {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: MAX_AGE,
  }
}

export async function POST(req: Request) {
  let identifier = ''
  let password = ''
  try {
    const body = await req.json()
    identifier = typeof body?.identifier === 'string' ? body.identifier.trim() : ''
    password = typeof body?.password === 'string' ? body.password : ''
  } catch {
    /* body فاضي أو مش JSON */
  }

  if (!identifier || !password) {
    return NextResponse.json({ ok: false, error: 'اكتب الإيميل أو التليفون والباسورد' }, { status: 400 })
  }

  const db = platformAdminDb()
  const isEmail = identifier.includes('@')
  const phone = isEmail ? null : normalizePhone(identifier)

  let query = db.from('platform_admins').select('id, password_hash, status')
  if (isEmail) {
    query = query.eq('email', identifier.toLowerCase())
  } else if (phone) {
    // نقبل أي صيغة للرقم اتخزنت بيها وقت الإضافة (محلي أو دولي)
    const local = '0' + phone.slice(3)
    query = query.in('phone', [phone, phone.replace('+', ''), local])
  } else {
    return NextResponse.json({ ok: false, error: 'الإيميل أو رقم التليفون مش صحيح' }, { status: 400 })
  }

  const { data: row } = await query.limit(1).maybeSingle()
  if (!row) {
    return NextResponse.json({ ok: false, error: 'الحساب ده مش موجود' }, { status: 401 })
  }
  const admin = row as { id: string; password_hash: string; status: string }
  if (admin.status !== 'active') {
    return NextResponse.json({ ok: false, error: 'الحساب ده متعطّل — كلّم صاحب النظام' }, { status: 403 })
  }
  // 🔑 (٢٠ أغسطس ٢٠٢٦ — محمد: «وحّد الباسورد وده يبقى نظام») الباسورد اللي
  //    بتتكتب في **جدول الموظفين** بقت هي المصدر الوحيد، وبتتزامن هنا
  //    تلقائيًا بتريجر. بس هي bcrypt والنظام القديم هنا scrypt — فبندعم
  //    الاتنين عشان مايتكسرش أي حساب قديم:
  //      • '$2…'       → bcrypt، بيتحقق منه في الداتابيز (مفيش bcrypt في Node)
  //      • 'salt:hash' → scrypt، بيتحقق منه هنا زي ما هو
  let passwordOk = false
  if (typeof admin.password_hash === 'string' && admin.password_hash.startsWith('$2')) {
    const { data: bcryptOk } = await (db.rpc as unknown as (
      fn: string, args: Record<string, unknown>,
    ) => Promise<{ data: boolean | null }>)(
      'platform_admin_verify_bcrypt', { p_admin_id: admin.id, p_password: password },
    )
    passwordOk = bcryptOk === true
  } else {
    passwordOk = verifyPassword(password, admin.password_hash)
  }

  if (!passwordOk) {
    return NextResponse.json({ ok: false, error: 'الباسورد غلط' }, { status: 401 })
  }

  const token = newSessionToken()
  const expiresAt = new Date(Date.now() + MAX_AGE * 1000).toISOString()
  const ua = req.headers.get('user-agent') || null
  await db.from('platform_admin_sessions').insert({
    token,
    admin_id: admin.id,
    expires_at: expiresAt,
    user_agent: ua,
  } as never)
  await db.from('platform_admins').update({ last_login_at: new Date().toISOString() } as never).eq('id', admin.id)

  const res = NextResponse.json({ ok: true })
  res.cookies.set(PLATFORM_ADMIN_COOKIE, token, cookieFromToken(token))
  return res
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  if (url.searchParams.get('logout') !== null) {
    const raw = req.headers.get('cookie') || ''
    const hit = raw.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${PLATFORM_ADMIN_COOKIE}=`))
    const token = hit ? decodeURIComponent(hit.slice(PLATFORM_ADMIN_COOKIE.length + 1)) : ''
    if (token) {
      const db = platformAdminDb()
      await db.from('platform_admin_sessions').delete().eq('token', token)
    }
    const res = NextResponse.redirect(new URL('/admin-entry', req.url))
    res.cookies.set(PLATFORM_ADMIN_COOKIE, '', { httpOnly: true, secure: isProd, sameSite: 'lax', path: '/', maxAge: 0 })
    return res
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const raw = req.headers.get('cookie') || ''
  const hit = raw.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${PLATFORM_ADMIN_COOKIE}=`))
  const token = hit ? decodeURIComponent(hit.slice(PLATFORM_ADMIN_COOKIE.length + 1)) : ''
  if (token) {
    const db = platformAdminDb()
    await db.from('platform_admin_sessions').delete().eq('token', token)
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set(PLATFORM_ADMIN_COOKIE, '', { httpOnly: true, secure: isProd, sameSite: 'lax', path: '/', maxAge: 0 })
  return res
}
