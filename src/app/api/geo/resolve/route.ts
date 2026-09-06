// src/app/api/geo/resolve/route.ts
// ============================================================================
// 📍 فك لينك لوكيشن قصير (maps.app.goo.gl · goo.gl/maps · wa.me location)
//    لإحداثيات — (٦ سبتمبر ٢٠٢٦)
//
// محمد: «الـcheckout يسجّل موقع العميل». أغلب الناس بتبعت اللوكيشن من واتساب
// كلينك قصير، والمتصفح مايقدرش يتبعه (CORS) — فالسيرفر بيتبع التحويل ويطلّع
// lat/lng من اللينك النهائي. صفر مفاتيح، صفر API مدفوع: fetch + regex بس.
// ============================================================================
import { NextRequest, NextResponse } from 'next/server'
import { parseLatLng } from '@/components/marketplace/LocationPicker'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED = /^https?:\/\/([a-z0-9-]+\.)?(google\.[a-z.]+|goo\.gl|maps\.app\.goo\.gl|apple\.com|waze\.com|openstreetmap\.org|bing\.com)\//i

export async function GET(req: NextRequest) {
  const url = (req.nextUrl.searchParams.get('url') || '').trim()
  if (!url || !ALLOWED.test(url)) return NextResponse.json({ ok: false, error: 'لينك خرايط بس' })

  // جرّب اللينك زي ما هو الأول (لينك طويل فيه الإحداثيات)
  const direct = parseLatLng(url)
  if (direct) return NextResponse.json({ ok: true, ...direct, source: 'direct' })

  try {
    const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(8000), headers: { 'user-agent': 'Mozilla/5.0 (madmona-geo)' } })
    const finalUrl = r.url || url
    const fromUrl = parseLatLng(finalUrl)
    if (fromUrl) return NextResponse.json({ ok: true, ...fromUrl, source: 'redirect' })
    // بعض اللينكات بتحط الإحداثيات جوّه الصفحة مش في العنوان
    const html = (await r.text()).slice(0, 200_000)
    const m = html.match(/center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/) || html.match(/\[(-?\d{1,2}\.\d{4,}),(-?\d{1,3}\.\d{4,})\]/) || html.match(/"(-?\d{1,2}\.\d{4,})","(-?\d{1,3}\.\d{4,})"/)
    if (m) return NextResponse.json({ ok: true, latitude: Number(m[1]), longitude: Number(m[2]), source: 'html' })
  } catch { /* لينك مش شغّال */ }
  return NextResponse.json({ ok: false, error: 'مالقيناش إحداثيات في اللينك' })
}
