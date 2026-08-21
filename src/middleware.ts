// src/middleware.ts
// =====================================================================
// (1) نطاقات التجار الفرعية: sa3dawy.madmonacairo.com → ستورفرنت /s/sa3dawy
// (2) حارس لوحة الإدارة — يعترض /admin/* ويحوّل لصفحة الدخول لو مفيش جلسة.
//     استثناءات على /admin/business-finance/<supplierId>/*:
//       (أ) بيزنس "تحت التفاوض" (is_trial_open_supplier) → تفتح بلا حساب.
//       (ب) أونر/مدير حقيقي لنفس البيزنس ده بالذات (كوكي madmona_owner_token
//           + owner_check_by_token) — انظر ملاحظة ١٩ أغسطس تحت.
// (3) 🔒 (١٢ أغسطس ٢٠٢٦) حارس مركزي على /api/admin/* — مراجعة الأمان لقت
//     ٢٠ من ٥٢ مسار أدمن API من غير أي حماية (الحماية كانت اختيارية لكل
//     ملف). دلوقتي الحماية مركزية هنا: أي مسار /api/admin/* لازم معاه
//     واحدة من: جلسة موظف مضمونة صحيحة، أو Bearer secret سيرفر-لسيرفر
//     (CRON_SECRET / WA_SERVICE_SECRET). الفحوصات الداخلية في الملفات
//     نفسها فضلت زي ما هي (دفاع مضاعف).
//
// 🔐 (١٩ أغسطس ٢٠٢٦ — محمد: «عايز الدخول للأدمن يكون عن طريق ايميل - رقم
//    تليفون - باسورد») — الباسورد المشترك الواحد (ADMIN_PW_SHA256) اتلغى
//    بالكامل. كل موظف بقى ليه جلسة مستقلة في platform_admin_sessions —
//    بنتأكد منها هنا بنداء REST خفيف (مفيش node:crypto على الـedge).
//
// 🌉 (نفس اليوم — محمد: «فعّل ده لأي صفحة B2B أو نشاط كلاود») — لوحة
//    الشركاء (/owner/[supplierId]) بتوجّه كل أزرارها (الفريق، الحجوزات...)
//    لصفحات /admin/business-finance/<supplierId>/* — واللي بقت دلوقتي
//    مقفولة على موظفي مضمونة بس. أصحاب بيزنس B2B الحقيقيين (بره فترة
//    التجربة) كانوا هيتقفوا برة صفحات بيزنسهم هم نفسهم. الحل: نفس منطق
//    استثناء التجربة، بس بدل ما نتأكد إن البيزنس "تحت تفاوض"، نتأكد إن
//    صاحب الطلب أونر/مدير فعّال لنفس البيزنس ده (owner_check_by_token).
// =====================================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ADMIN_ENTRY_PATH } from './lib/adminGate'
import { PLATFORM_ADMIN_COOKIE } from './lib/platformAdminConst'

// كل subdomain تاجر → الـ slug بتاع ستورفرنته
// إضافة تاجر جديد = سطر واحد هنا + ربط الـ DNS + الدومين في Vercel.
const MERCHANT_SUBDOMAINS: Record<string, string> = {
  sa3dawy: 'sa3dawy',
}


// هل توكن الجلسة ده صالح؟ — نداء REST خفيف على جدول الجلسات (edge-safe)
async function isValidAdminSession(token: string): Promise<boolean> {
  if (!token) return false
  try {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!base || !serviceKey) return false
    const nowIso = new Date().toISOString()
    const res = await fetch(
      `${base}/rest/v1/platform_admin_sessions?token=eq.${encodeURIComponent(token)}&expires_at=gt.${encodeURIComponent(nowIso)}&select=token`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
    )
    if (!res.ok) return false
    const rows = await res.json()
    return Array.isArray(rows) && rows.length > 0
  } catch {
    return false
  }
}

// هل الطلب معاه اعتماد أدمن/سيرفر صالح؟ (لمسارات /api/admin/*)
async function hasAdminApiCredential(req: NextRequest): Promise<boolean> {
  // (أ) جلسة موظف مضمونة — المتصفح بيبعتها تلقائيًا مع نداءات اللوحة
  const cookie = req.cookies.get(PLATFORM_ADMIN_COOKIE)?.value
  if (cookie && (await isValidAdminSession(cookie))) return true

  // (ب) أسرار سيرفر-لسيرفر — الكرونات وEdge Functions
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
    const token = req.cookies.get(PLATFORM_ADMIN_COOKIE)?.value
    if (token && (await isValidAdminSession(token))) return NextResponse.next()

    // استثناءات /admin/business-finance/<uuid>[/...]:
    //   (أ) البيزنس تحت التفاوض (تجربة مفتوحة) — بلا حساب خالص
    //   (ب) أونر/مدير حقيقي لنفس البيزنس ده — بوابة الشركاء /owner/*
    const m = path.match(/^\/admin\/business-finance\/([0-9a-fA-F-]{36})(?:\/|$)/)
    if (m) {
      /* 🚪 (٢١ أغسطس ٢٠٢٦) لوحة البيزنس بتعدّي من الحارس ده، والصفحة نفسها
         هي اللي بتقرر.

         محمد: «الداشبورد أو لوحة الإدارة اللي في تاب حسابي مبقتش تفتح».

         السبب: جلسة الأبليكيشن متخزّنة في **localStorage** مش في كوكي
         (`supabase-browser.ts` بيستخدم `safeStorage`) — والـmiddleware
         بيشتغل على الـedge ومابيشوف غير الكوكيز. يعني الموظف أو صاحب
         البيزنس اللي مسجّل دخول عادي، الحارس **مايقدرش يشوف جلسته أصلًا**
         فبيرميه على `/admin-entry`. وده بيحصل **قبل** ما حارس الصفحة
         نفسها يشتغل — وهو اللي بيعرف يتعامل مع كل الحالات.

         أنا اللي كشفت المشكلة دي لما حطيت تابات اللوحة في «حسابي»
         (كوميت 00d252ab) — اللينكات بقت بتوصل لمكان الحارس بيقفله.

         مش خطر: `layout.tsx` بتاع اللوحة بيفحص أربع حالات (كوكي الأدمن ·
         توكن المالك · عضوية البيزنس عن طريق `my_supplier_access` ·
         التجربة المفتوحة) وبيوقف العرض لو مفيش حق. والداتا كلها محميّة
         بالـRLS على مستوى الداتابيز مهما حصل. */
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
