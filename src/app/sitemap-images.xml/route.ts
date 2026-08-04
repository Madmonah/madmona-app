import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Image Sitemap — صور الإعلانات لفهرسة Google Images (ترافيك الصور)
// Next 14 sitemap مبيدعمش الصور، فده route XML يدوي بنيمسبيس image
export const runtime = 'nodejs'
export const revalidate = 3600

const SITE = 'https://www.madmonacairo.com'
const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export async function GET() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  })
  const [{ data: listings }, { data: photos }] = await Promise.all([
    db.from('listings').select('id, slug').eq('status', 'published').limit(5000),
    db.from('listing_photos').select('listing_id, url, is_primary, display_order').limit(20000),
  ])
  const byListing: Record<string, string[]> = {}
  const sorted = (photos || []).sort(
    (a: any, b: any) => Number(b.is_primary) - Number(a.is_primary) || (a.display_order ?? 99) - (b.display_order ?? 99)
  )
  for (const p of sorted as any[]) {
    if (!p?.url) continue
    ;(byListing[p.listing_id] ||= []).length < 5 && byListing[p.listing_id].push(p.url)
  }
  const urls = (listings || [])
    .filter((l: any) => byListing[l.id]?.length)
    .map((l: any) => `<url><loc>${SITE}/marketplace/${esc(encodeURIComponent(l.slug))}</loc>${byListing[l.id]
      .map((u) => `<image:image><image:loc>${esc(u)}</image:loc></image:image>`)
      .join('')}</url>`)
    .join('\n')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>`
  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 's-maxage=3600, stale-while-revalidate=600' },
  })
}
