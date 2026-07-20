// src/app/api/admin/wa-sessions/qr/route.ts
// بيمرّر صفحة الـ QR من خدمة المارد — عشان الأدمن يمسح من غير ما يفتح رابط Railway.

import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const base = (process.env.WA_SERVICE_URL || '').replace(/\/$/, '')
  if (!base) return new Response('WA_SERVICE_URL ناقص', { status: 500 })

  const session = request.nextUrl.searchParams.get('session')
  const url = session ? `${base}/qr?session=${encodeURIComponent(session)}` : `${base}/qr`

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
    const html = await res.text()
    return new Response(html, {
      status: res.status,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
    })
  } catch (e) {
    return new Response(
      `<div style="font-family:sans-serif;padding:40px;text-align:center">
        <h2>فشل الاتصال بخدمة المارد</h2><p>${e instanceof Error ? e.message : ''}</p>
      </div>`,
      { status: 502, headers: { 'content-type': 'text/html; charset=utf-8' } }
    )
  }
}
