// src/middleware.ts
// =====================================================================
// حارس لوحة الإدارة — يعترض كل طلب على /admin/*
// لو مفيش كوكي جلسة صحيحة → يحوّل لصفحة الدخول /admin-entry
// محدش يقدر يفتح أي صفحة أدمن من غير الباسورد.
// =====================================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ADMIN_COOKIE, ADMIN_SESSION_VALUE, ADMIN_ENTRY_PATH } from './lib/adminGate'

export function middleware(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE)?.value

  // جلسة صحيحة → كمّل عادي
  if (token === ADMIN_SESSION_VALUE) {
    return NextResponse.next()
  }

  // غير مصرّح → حوّل لصفحة الدخول مع تذكّر الصفحة المطلوبة
  const url = req.nextUrl.clone()
  const wanted = req.nextUrl.pathname
  url.pathname = ADMIN_ENTRY_PATH
  url.search = ''
  url.searchParams.set('next', wanted)
  return NextResponse.redirect(url)
}

// يحرس كل ما تحت /admin (وكمان /admin نفسها)
export const config = {
  matcher: ['/admin/:path*'],
}
