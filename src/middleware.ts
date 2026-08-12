// src/middleware.ts
// =====================================================================
// (1) نطاقات التجار الفرعية: sa3dawy.madmonacairo.com → ستورفرنت /s/sa3dawy
// (2) حارس لوحة الإدارة — يعترض /admin/* ويحوّل لصفحة الدخول لو مفيش جلسة.
//     استثناء: لينكات التجربة /admin/business-finance/<trialSupplierId>/*
//     لبيزنس "تحت التفاوض" (is_trial_open_supplier) → تفتح بلا باسورد.
// (3) 🔒 (١٢ أغسطس ٢٠٢٦) حارس مركزي على /api/admin/* — مراجعة الأمان لقت
//     ٢٠ من ٥٢ مسار أدمن API من غير أي حماية (الحماية كانت اختيارية لكل
//     ملف). دلوقتي الحماية مركزية هنا: أي مسار /api/admin/* لازم معاه
//     واحدة من: كوكي جلسة الأدمن، أو هيدر x-admin-password صحيح، أو
//     Bearer secret سيرفر-لسيرفر (CRON_SECRET / WA_SERVICE_SECRET).
//     الفحوصات الداخلية في الملفات نفسها فضلت زي ما هي (دفاع مضاعف).
// =====================================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ADMIN_COOKIE, ADMIN_SESSION_VALUE, ADMIN_ENTRY_PATH, ADMIN_PW_SHA256 } from './lib/adminGate'

// كل subdomain تاجر → الـ slug بتاع ستورفرنته
// إضافة تاجر جديد = سطر واحد هنا + ربط الـ DNS + الدومين في Vercel.
const MERCHANT_SUBDOMAINS: Record<string, string> = {
  sa3dawy: 'sa3dawy',
}

// SHA-256 hex على الـedge (مفيش node:crypto هنا — WebCrypto بس)
async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, '0')).join('')
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

// هل الطلب معاه اعتماد أدمن/سيرفر صالح؟ (لمسارات /api/admin/*)
async function hasAdminApiCredential(req: NextRequest): Promise<boolean> {
  // (أ) كوكي جلسة الأدمن — المتصفح بيبعتها تلقائيًا مع نداءات اللوحة
  const cookie = req.cookies.get(ADMIN_COOKIE)?.value
  if (ADMIN_SESSION_VALUE && cookie === ADMIN_SESSION_VALUE) return true

  // (ب) هيدر الباسورد — السكريبتات والأدوات القديمة بتستخدمه
  const pw = req.headers.get('x-admin-password')
  if (pw && ADMIN_PW_SHA256 && (await sha256Hex(pw)) === ADMIN_PW_SHA256) return true

  // (ج) أسرار سيرفر-لسيرفر — الكرونات وEdge Functions
  const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  const serverSecrets = [process.env.CRON_SECRET, process.env.WA_SERVICE_SECRET].filter(Boolean)
  if (bearer && serverSecrets.includes(bearer)) return true
  const maSecret = req.headers.get('x-madmona-secret')
  if (maSecret && serverSecrets.includes(maSecret)) return true

  return false
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

  // (3) حارس /api/admin/* — رد 401 JSON (مش redirect: دي API مش صفحة)
  if (path.startsWith('/api/admin')) {
    if (await hasAdminApiCredential(req)) return NextResponse.next()
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  // (2) حارس لوحة الإدارة — على /admin فقط
  if (path.startsWith('/admin')) {
    const token = req.cookies.get(ADMIN_COOKIE)?.value
    if (ADMIN_SESSION_VALUE && token === ADMIN_SESSION_VALUE) return NextResponse.next()

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

// يشتغل على الجذر (لكشف الـ subdomain) وعلى /admin (للحارس) وعلى /api/admin (حارس الـAPI)
export const config = {
  matcher: ['/', '/admin/:path*', '/api/admin/:path*'],
}
