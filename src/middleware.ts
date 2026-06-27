// src/middleware.ts
// =====================================================================
// (1) نطاقات التجار الفرعية: sa3dawy.madmonacairo.com → ستورفرنت /s/sa3dawy
// (2) حارس لوحة الإدارة — يعترض /admin/* ويحوّل لصفحة الدخول لو مفيش جلسة.
//     استثناء: لينكات التجربة /admin/business-finance/<trialSupplierId>/*
//     لبيزنس "تحت التفاوض" (is_trial_open_supplier) → تفتح بلا باسورد.
// =====================================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ADMIN_COOKIE, ADMIN_SESSION_VALUE, ADMIN_ENTRY_PATH } from './lib/adminGate'

// كل subdomain تاجر → الـ slug بتاع ستورفرنته
// إضافة تاجر جديد = سطر واحد هنا + ربط الـ DNS + الدومين في Vercel.
const MERCHANT_SUBDOMAINS: Record<string, string> = {
  sa3dawy: 'sa3dawy',
}

// هل البيزنس ده "تجربة مفتوحة" (negotiating + ERP)؟ — يُستدعى على الـedge فقط
// لمسارات business-finance، وبيرجّع false عند أي خطأ (يرجع للحارس العادي).
async function isTrialOpenSupplier(supplierId: string): Promise<boolean> {
  try {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!base || !anon) return false
    const res = await fetch(`${base}/rest/v1/rpc/is_trial_open_supplier`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anon,
        Authorization: `Bearer ${anon}`,
      },
      body: JSON.stringify({ p_supplier_id: supplierId }),
      // edge: لا نخزّن، ونحدد مهلة قصيرة عبر AbortController
    })
    if (!res.ok) return false
    const data = await res.json()
    return data === true
  } catch {
    return false
  }
}

export async function middleware(req: NextRequest) {
  const host = (req.headers.get('host') || '').toLowerCase()
  const sub = host.split('.')[0]
  const path = req.nextUrl.pathname

  // (1) لو الطلب جاي من subdomain تاجر على الجذر → اعرض ستورفرنته
  if (MERCHANT_SUBDOMAINS[sub] && path === '/') {
    const url = req.nextUrl.clone()
    url.pathname = `/s/${MERCHANT_SUBDOMAINS[sub]}`
    return NextResponse.rewrite(url)
  }

  // (2) حارس لوحة الإدارة — على /admin فقط
  if (path.startsWith('/admin')) {
    const token = req.cookies.get(ADMIN_COOKIE)?.value
    if (token === ADMIN_SESSION_VALUE) return NextResponse.next()

    // استثناء التجربة: /admin/business-finance/<uuid>[/...] لو البيزنس تحت التفاوض
    const m = path.match(/^\/admin\/business-finance\/([0-9a-fA-F-]{36})(?:\/|$)/)
    if (m && (await isTrialOpenSupplier(m[1]))) {
      return NextResponse.next()
    }

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
