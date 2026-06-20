// src/middleware.ts
// =====================================================================
// (1) نطاقات التجار الفرعية: sa3dawy.madmonacairo.com → ستورفرنت /s/sa3dawy
// (2) حارس لوحة الإدارة — يعترض /admin/* ويحوّل لصفحة الدخول لو مفيش جلسة.
// =====================================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ADMIN_COOKIE, ADMIN_SESSION_VALUE, ADMIN_ENTRY_PATH } from './lib/adminGate'

// كل subdomain تاجر → الـ slug بتاع ستورفرنته
// إضافة تاجر جديد = سطر واحد هنا + ربط الـ DNS + الدومين في Vercel.
const MERCHANT_SUBDOMAINS: Record<string, string> = {
  sa3dawy: 'sa3dawy',
}

export function middleware(req: NextRequest) {
  const host = (req.headers.get('host') || '').toLowerCase()
  const sub = host.split('.')[0]
  const path = req.nextUrl.pathname

  // (1) لو الطلب جاي من subdomain تاجر على الجذر → اعرض ستورفرنته
  //     (باقي المسارات زي /book/* بتشتغل عادي على نفس الـ subdomain)
  if (MERCHANT_SUBDOMAINS[sub] && path === '/') {
    const url = req.nextUrl.clone()
    url.pathname = `/s/${MERCHANT_SUBDOMAINS[sub]}`
    return NextResponse.rewrite(url)
  }

  // (2) حارس لوحة الإدارة — على /admin فقط
  if (path.startsWith('/admin')) {
    const token = req.cookies.get(ADMIN_COOKIE)?.value
    if (token === ADMIN_SESSION_VALUE) return NextResponse.next()
    const url = req.nextUrl.clone()
    url.pathname = ADMIN_ENTRY_PATH
    url.search = ''
    url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

// يشتغل على الجذر (لكشف الـ subdomain) وعلى /admin (للحارس)
export const config = {
  matcher: ['/', '/admin/:path*'],
}
