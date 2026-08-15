// src/app/api/admin/wa-sessions/qr/route.ts
// ============================================================================
// 📷 صفحة الـQR.
//
// 🐞 (١٥ أغسطس ٢٠٢٦ — مسح المصادر الميتة) الملف ده كان بيمرّر `/qr` من
//    `WA_SERVICE_URL` — **جسر Baileys اللي اتشال من رايلواي**. يعني الأيفريم
//    في `/admin/wa-numbers` بيطلّع «فشل الاتصال بخدمة المارد» أو ٥٠٠.
//
//    ده آخر خيط فاضل من نفس العطل: `/admin/leads` (جدول مش موجود)،
//    `transport:'baileys'` الافتراضي، و`/api/admin/wa-sessions` — التلاتة
//    اتصلّحوا امبارح والملف ده فات.
//
//    الربط دلوقتي بيتعمل من لوحة OpenWA نفسها، فبنقول كده بوضوح بدل ما
//    نضرب في خدمة مش موجودة ونرجّع خطأ غامض.
// ============================================================================

import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function page(body: string, status: number) {
  return new Response(
    `<!doctype html><html dir="rtl" lang="ar"><meta charset="utf-8">
     <body style="font-family:system-ui,sans-serif;padding:32px;text-align:center;background:#FAFAF7;color:#1A2E26">
     ${body}</body></html>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } },
  )
}

export async function GET(request: NextRequest) {
  const session = (request.nextUrl.searchParams.get('session') || '').replace(/[<>&"']/g, '')
  const openwa = (process.env.OPENWA_URL || '').replace(/\/$/, '')

  return page(
    `<h2 style="margin:0 0 12px">الربط بيتعمل من لوحة OpenWA</h2>
     <p style="color:#6B7280;line-height:1.9;max-width:520px;margin:0 auto">
       جسر Baileys القديم (اللي كان بيعرض الـQR هنا) اتشال. الأرقام دلوقتي
       بتتربط وبيبان كودها في لوحة OpenWA مباشرة.
       ${session ? `<br><br>الجلسة المطلوبة: <code style="background:#fff;padding:2px 6px;border-radius:6px">${session}</code>` : ''}
     </p>
     ${openwa
       ? `<p style="margin-top:20px"><a href="${openwa}" target="_blank" rel="noopener"
            style="display:inline-block;padding:10px 18px;background:#059669;color:#fff;border-radius:12px;text-decoration:none">افتح لوحة OpenWA</a></p>`
       : `<p style="margin-top:20px;color:#B45309">OPENWA_URL مش متظبط في الإعدادات.</p>`}
     <p style="margin-top:24px;color:#6B7280;font-size:13px">
       حالة الأرقام الحية بتبان في <a href="/admin/sending" style="color:#059669">شاشة الإرسال</a>.
     </p>`,
    501,
  )
}
