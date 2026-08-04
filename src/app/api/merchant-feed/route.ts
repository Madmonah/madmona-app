import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// فيد Google Merchant (Free Listings في Google Shopping) — منتجات مضمونة/المارت
// XML بصيغة RSS 2.0 + g: namespace — جوجل بيسحبه كل 24 ساعة من Merchant Center
export const runtime = 'nodejs'
export const revalidate = 3600

const SITE = 'https://www.madmonacairo.com'
const esc = (s: unknown) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export async function GET() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  })
  const { data: rows } = await db
    .from('listings')
    .select('id, slug, title, description, price_egp, brand, product_condition, stock_quantity, categories!inner(name_ar, track)')
    .eq('status', 'published')
    .gt('price_egp', 0)
    .in('categories.track', ['products', 'daily'])
    .limit(1000)
  const ids = (rows || []).map((r: any) => r.id)
  const photoById: Record<string, string> = {}
  if (ids.length) {
    const { data: photos } = await db
      .from('listing_photos')
      .select('listing_id, url, is_primary, display_order')
      .in('listing_id', ids)
      .order('is_primary', { ascending: false })
      .order('display_order', { ascending: true })
    for (const p of photos || []) if (p?.url && !photoById[p.listing_id]) photoById[p.listing_id] = p.url
  }

  const items = (rows || [])
    .filter((r: any) => photoById[r.id])
    .map((r: any) => {
      const cond = ['new', 'used', 'refurbished'].includes(r.product_condition) ? r.product_condition : 'new'
      const avail = r.stock_quantity === 0 ? 'out_of_stock' : 'in_stock'
      const brand = r.brand ? `<g:brand>${esc(r.brand)}</g:brand>` : ''
      return `<item>
<g:id>${esc(r.slug)}</g:id>
<g:title>${esc(String(r.title).slice(0, 150))}</g:title>
<g:description>${esc(String(r.description || r.title).slice(0, 4900))}</g:description>
<g:link>${SITE}/marketplace/${esc(r.slug)}</g:link>
<g:image_link>${esc(photoById[r.id])}</g:image_link>
<g:availability>${avail}</g:availability>
<g:price>${Number(r.price_egp).toFixed(2)} EGP</g:price>
<g:condition>${cond}</g:condition>
${brand}
<g:identifier_exists>false</g:identifier_exists>
<g:product_type>${esc(r.categories?.name_ar || '')}</g:product_type>
</item>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>مضمونة — Madmona</title>
<link>${SITE}</link>
<description>منتجات مضمونة — معاملاتك مضمونة</description>
${items}
</channel>
</rss>`
  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 's-maxage=3600, stale-while-revalidate=600' },
  })
}
