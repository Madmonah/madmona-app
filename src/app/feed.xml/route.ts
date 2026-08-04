import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// RSS 2.0 — أحدث 50 إعلان منشور. للمجمّعات + قرّاء RSS + زواحف الـAI
export const runtime = 'nodejs'
export const revalidate = 1800

const SITE = 'https://www.madmonacairo.com'
const esc = (s: unknown) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export async function GET() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  })
  const { data: rows } = await db
    .from('listings')
    .select('slug, title, description, city, price_egp, created_at')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(50)
  const items = (rows || [])
    .map((r: any) => {
      const desc = [r.city, r.price_egp ? `${Number(r.price_egp).toLocaleString('en')} EGP` : null, String(r.description || '').slice(0, 300)]
        .filter(Boolean)
        .join(' — ')
      return `<item>
<title>${esc(r.title)}</title>
<link>${SITE}/marketplace/${esc(r.slug)}</link>
<guid isPermaLink="true">${SITE}/marketplace/${esc(r.slug)}</guid>
<pubDate>${new Date(r.created_at).toUTCString()}</pubDate>
<description>${esc(desc)}</description>
</item>`
    })
    .join('\n')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>مضمونة — أحدث الإعلانات</title>
<link>${SITE}</link>
<description>أحدث الإعلانات المضمونة على منصة مضمونة — معاملاتك مضمونة</description>
<language>ar-eg</language>
${items}
</channel>
</rss>`
  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 's-maxage=1800, stale-while-revalidate=300' },
  })
}
