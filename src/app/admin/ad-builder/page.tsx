// src/app/admin/ad-builder/page.tsx
// Ad Builder — for each listing, generates a ready-to-use Meta ad URL.

import { supabase as supabaseAdmin } from '@/lib/supabase'
import AdBuilderClient from './AdBuilderClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface ListingWithExtras {
  id: string
  title: string
  slug: string
  city: string | null
  district: string | null
  rating: number | null
  bookings_count: number
  views_count: number
  category_name: string | null
  hero_photo: string | null
  lowest_price: number | null
}

async function getListings(): Promise<ListingWithExtras[]> {
  const { data: listings } = await supabaseAdmin
    .from('listings')
    .select('id, title, slug, city, district, rating, bookings_count, views_count, category_id')
    .eq('status', 'published')
    .order('bookings_count', { ascending: false })
    .limit(50)

  type L = {
    id: string; title: string; slug: string; city: string | null; district: string | null;
    rating: number | null; bookings_count: number; views_count: number; category_id: string;
  }
  const rows = (listings ?? []) as L[]
  if (rows.length === 0) return []

  const ids = rows.map(r => r.id)
  const catIds = [...new Set(rows.map(r => r.category_id))]

  const [photos, prices, cats] = await Promise.all([
    supabaseAdmin.from('listing_photos').select('listing_id, url, display_order').in('listing_id', ids),
    supabaseAdmin.from('pricing_rules').select('listing_id, base_price').in('listing_id', ids),
    supabaseAdmin.from('categories').select('id, name_ar').in('id', catIds),
  ])

  type P = { listing_id: string; url: string; display_order: number }
  type Pr = { listing_id: string; base_price: number | null }
  type C = { id: string; name_ar: string | null }

  const photoMap = new Map<string, string>()
  ;((photos.data ?? []) as P[])
    .sort((a, b) => a.display_order - b.display_order)
    .forEach(p => { if (!photoMap.has(p.listing_id)) photoMap.set(p.listing_id, p.url) })

  const priceMap = new Map<string, number>()
  ;((prices.data ?? []) as Pr[]).forEach(p => {
    const existing = priceMap.get(p.listing_id)
    const price = Number(p.base_price ?? 0)
    if (price > 0 && (existing === undefined || price < existing)) priceMap.set(p.listing_id, price)
  })

  const catMap = new Map<string, string>()
  ;((cats.data ?? []) as C[]).forEach(c => { if (c.name_ar) catMap.set(c.id, c.name_ar) })

  return rows.map(r => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    city: r.city,
    district: r.district,
    rating: r.rating,
    bookings_count: r.bookings_count,
    views_count: r.views_count,
    category_name: catMap.get(r.category_id) ?? null,
    hero_photo: photoMap.get(r.id) ?? null,
    lowest_price: priceMap.get(r.id) ?? null,
  }))
}

export default async function AdBuilderPage() {
  const listings = await getListings()

  return (
    <div dir="rtl" style={{
      fontFamily: 'Tahoma, Arial, sans-serif',
      background: '#FAF7F0',
      minHeight: '100vh',
      padding: '24px',
      color: '#1a1a1a',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ color: '#1F5F3F', margin: 0, fontSize: 26 }}>📣 Ad Builder</h1>
            <p style={{ color: '#666', margin: '4px 0 0', fontSize: 13 }}>اختار إعلان واحصل على لينك جاهز لـ Meta ads</p>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
            <a href="/admin/agents" style={{ color: '#1F5F3F' }}>← Agents</a>
            <a href="/admin/leads-feed" style={{ color: '#1F5F3F' }}>← Leads</a>
            <a href="/admin/activity" style={{ color: '#1F5F3F' }}>← Activity</a>
          </div>
        </div>

        <div style={{ background: '#fff', padding: 16, borderRadius: 12, marginBottom: 20, border: '1px solid #eee' }}>
          <h3 style={{ color: '#1F5F3F', margin: '0 0 8px', fontSize: 14 }}>📌 إزاي تستخدم الـ Ad Builder؟</h3>
          <ol style={{ margin: 0, paddingRight: 20, fontSize: 13, color: '#444', lineHeight: 1.8 }}>
            <li>اختار إعلان من القائمة تحت</li>
            <li>اعمل campaign name بسيط (مثلاً <code style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: 4 }}>cam_sony_oct</code>)</li>
            <li>انسخ الـ URL وحطه في Meta Ads Manager كـ destination</li>
            <li>راقب الـ leads في <a href="/admin/leads-feed" style={{ color: '#1F5F3F' }}>Leads Feed</a></li>
          </ol>
        </div>

        <AdBuilderClient listings={listings} />
      </div>
    </div>
  )
}
