// src/app/api/admin-entry/route.ts
// =====================================================================
// التحقق من باسورد الأدمن + إدارة جلسة القفل.
// POST   { password }      → يتأكد من البصمة، ويحط كوكي جلسة 30 يوم
// GET    ?logout           → يمسح الجلسة ويرجّع لصفحة الدخول (لينك خروج)
// DELETE                   → يمسح الجلسة (للاستخدام البرمجي)
// الباسورد نفسها مش متخزّنة — بنقارن بصمة SHA-256 بطريقة timing-safe.
// =====================================================================

import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_VALUE,
  ADMIN_PW_SHA256,
  ADMIN_MAX_AGE,
  ADMIN_ENTRY_PATH,
} from '@/lib/adminGate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const isProd = process.env.NODE_ENV === 'production'

function sha256(s: string): string {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex')
}

function passwordMatches(password: string): boolean {
  if (!password) return false
  const a = Buffer.from(sha256(password), 'hex')
  const b = Buffer.from(ADMIN_PW_SHA256, 'hex')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export async function POST(req: Request) {
  let password = ''
  try {
    const body = await req.json()
    password = typeof body?.password === 'string' ? body.password : ''
  } catch {
    /* body فاضي أو مش JSON */
  }

  if (!passwordMatches(password)) {
    return NextResponse.json({ ok: false, error: 'الباسورد غلط' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, ADMIN_SESSION_VALUE, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: ADMIN_MAX_AGE,
  })
  return res
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  if (url.searchParams.get('logout') !== null) {
    const res = NextResponse.redirect(new URL(ADMIN_ENTRY_PATH, req.url))
    res.cookies.set(ADMIN_COOKIE, '', {
      httpOnly: true, secure: isProd, sameSite: 'lax', path: '/', maxAge: 0,
    })
    return res
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, '', {
    httpOnly: true, secure: isProd, sameSite: 'lax', path: '/', maxAge: 0,
  })
  return res
}
