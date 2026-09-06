// src/app/api/admin/delivery/route.ts
// ============================================================================
// 🛵 بوابة لوحة الأدمن لسيستم الدليفري (٦ سبتمبر ٢٠٢٦)
//
// /api/delivery محمي بهيدر x-madmona-secret (للسيرفر والمارد) — المتصفح
// مايقدرش يناديه. المسار ده تحت /api/admin/* (الميدل وير بيحرسه بكوكي
// اللوحة) وبيمرّر الطلب زي ما هو للمسار الأصلي بالسر من جوّه السيرفر.
// مفيش منطق هنا عن قصد — مصدر واحد للدليفري.
// ============================================================================
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function target(req: NextRequest, path: string) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`
  return `${origin.replace(/\/$/, '')}/api/delivery${path}`
}

async function relay(req: NextRequest, method: 'GET' | 'POST') {
  const secret = process.env.WA_SERVICE_SECRET || ''
  if (!secret) return NextResponse.json({ ok: false, error: 'WA_SERVICE_SECRET ناقص' }, { status: 500 })
  const qs = req.nextUrl.search || ''
  const body = method === 'POST' ? await req.text() : undefined
  const r = await fetch(target(req, qs), {
    method,
    headers: { 'content-type': 'application/json', 'x-madmona-secret': secret },
    body,
    cache: 'no-store',
  })
  const text = await r.text()
  return new NextResponse(text, { status: r.status, headers: { 'content-type': 'application/json' } })
}

export async function GET(req: NextRequest) { return relay(req, 'GET') }
export async function POST(req: NextRequest) { return relay(req, 'POST') }
