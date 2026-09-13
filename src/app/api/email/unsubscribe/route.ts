// src/app/api/email/unsubscribe/route.ts
// 📧 (١٣/٩/٢٠٢٦) إلغاء الاشتراك من نشرة مضمونة بالتوكن — لينك في فوتر كل رسالة تسويقية.
// بيشتغل بالـservice role (الجدول مقفول على anon) ويرجّع صفحة عربية بسيطة.
import { NextRequest, NextResponse } from 'next/server'
import { supabase as admin } from '@/lib/supabase'

export const runtime = 'nodejs'

function page(title: string, body: string) {
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;background:#FAFAF7;font-family:-apple-system,Segoe UI,Tahoma,sans-serif;color:#1A2E26"><div style="max-width:520px;margin:48px auto;background:#fff;border-radius:24px;padding:32px;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,.04)">
<h1 style="margin:0 0 12px;font-size:22px;color:#04352A">${title}</h1><p style="margin:0 0 20px;color:#555;line-height:1.7">${body}</p>
<a href="https://www.madmonacairo.com" style="display:inline-block;background:#04352A;color:#fff;text-decoration:none;padding:12px 22px;border-radius:14px;font-weight:700">الرجوع لمضمونة</a></div></body></html>`
}

export async function GET(req: NextRequest) {
  const t = req.nextUrl.searchParams.get('t') || ''
  const ok = /^[0-9a-f-]{36}$/i.test(t)
  if (!ok) return new NextResponse(page('اللينك مش صحيح', 'لو عايز تلغي الاشتراك، افتح اللينك من آخر رسالة وصلتك.'), { status: 400, headers: { 'content-type': 'text/html; charset=utf-8' } })
  const rpc = (admin as unknown as { rpc: (f: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> }).rpc
  const { data, error } = await rpc('email_unsubscribe', { p_token: t, p_reason: 'link' })
  if (error || !data) return new NextResponse(page('مش لاقيين الاشتراك ده', 'يمكن اتلغى قبل كده. لو لسه بتوصلك رسايل ابعتلنا على support@madmonacairo.com.'), { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } })
  return new NextResponse(page('اتلغى الاشتراك ✓', 'مش هتوصلك رسايل تسويقية من مضمونة تاني. رسايل حسابك وحجوزاتك بتفضل زي ما هي.'), { headers: { 'content-type': 'text/html; charset=utf-8' } })
}
