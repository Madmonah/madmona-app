// src/app/admin/listing-performance/page.tsx
// Listing Performance Tracker — find which listings make revenue, which sit idle

import { supabase as supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface ListingPerf {
  id: string
  title: string
  slug: string
  category_name: string | null
  city: string | null
  bookings_count: number
  views_count: number
  rating: number | null
  reviews_count: number
  total_revenue: number
  avg_booking_value: number
  conversion_rate: number  // bookings/views
  last_booking_at: string | null
  hero_photo: string | null
  price: number | null
  status: string
}

async function getPerformance(): Promise<ListingPerf[]> {
  const { data: listings } = await supabaseAdmin
    .from('listings')
    .select('id, title, slug, category_id, city, bookings_count, views_count, rating, reviews_count, status')
    .eq('status', 'published')
    .order('bookings_count', { ascending: false })
    .limit(100)

  type L = {
    id: string; title: string; slug: string; category_id: string;
    city: string | null; bookings_count: number; views_count: number;
    rating: number | null; reviews_count: number; status: string;
  }
  const rows = (listings ?? []) as L[]
  if (rows.length === 0) return []

  const ids = rows.map(r => r.id)
  const catIds = [...new Set(rows.map(r => r.category_id))]

  const [bookingsRes, photosRes, pricesRes, catsRes] = await Promise.all([
    supabaseAdmin
      .from('marketplace_bookings')
      .select('listing_id, total_amount, created_at')
      .in('listing_id', ids),
    supabaseAdmin
      .from('listing_photos')
      .select('listing_id, url, display_order')
      .in('listing_id', ids),
    supabaseAdmin
      .from('pricing_rules')
      .select('listing_id, price, period_type')
      .in('listing_id', ids)
      .eq('is_active', true),
    supabaseAdmin
      .from('categories')
      .select('id, name_ar')
      .in('id', catIds),
  ])

  type B = { listing_id: string; total_amount: number | null; created_at: string }
  type P = { listing_id: string; url: string; display_order: number }
  type Pr = { listing_id: string; price: number | null; period_type: string }
  type C = { id: string; name_ar: string | null }

  const bookings = (bookingsRes.data ?? []) as B[]
  const photos = (photosRes.data ?? []) as P[]
  const prices = (pricesRes.data ?? []) as Pr[]
  const cats = (catsRes.data ?? []) as C[]

  const revenueMap = new Map<string, { total: number; count: number; lastAt: string | null }>()
  for (const b of bookings) {
    const ex = revenueMap.get(b.listing_id) ?? { total: 0, count: 0, lastAt: null }
    ex.total += Number(b.total_amount ?? 0)
    ex.count += 1
    if (!ex.lastAt || b.created_at > ex.lastAt) ex.lastAt = b.created_at
    revenueMap.set(b.listing_id, ex)
  }

  const photoMap = new Map<string, string>()
  photos
    .sort((a, b) => a.display_order - b.display_order)
    .forEach(p => { if (!photoMap.has(p.listing_id)) photoMap.set(p.listing_id, p.url) })

  const priceMap = new Map<string, number>()
  for (const p of prices) {
    const price = Number(p.price ?? 0)
    if (price > 0) {
      const ex = priceMap.get(p.listing_id)
      if (ex === undefined || price < ex) priceMap.set(p.listing_id, price)
    }
  }

  const catMap = new Map<string, string>()
  cats.forEach(c => { if (c.name_ar) catMap.set(c.id, c.name_ar) })

  return rows.map(r => {
    const rev = revenueMap.get(r.id) ?? { total: 0, count: 0, lastAt: null }
    return {
      id: r.id,
      title: r.title,
      slug: r.slug,
      category_name: catMap.get(r.category_id) ?? null,
      city: r.city,
      bookings_count: r.bookings_count,
      views_count: r.views_count,
      rating: r.rating,
      reviews_count: r.reviews_count,
      total_revenue: rev.total,
      avg_booking_value: rev.count > 0 ? rev.total / rev.count : 0,
      conversion_rate: r.views_count > 0 ? (rev.count / r.views_count) * 100 : 0,
      last_booking_at: rev.lastAt,
      hero_photo: photoMap.get(r.id) ?? null,
      price: priceMap.get(r.id) ?? null,
      status: r.status,
    }
  })
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'لسه ولا حجز'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days === 0) return 'النهارده'
  if (days === 1) return 'إمبارح'
  if (days < 30) return `من ${days} يوم`
  if (days < 365) return `من ${Math.floor(days / 30)} شهر`
  return `من ${Math.floor(days / 365)} سنة`
}

export default async function ListingPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>
}) {
  const params = await searchParams
  const sortBy = params.sort ?? 'revenue'

  const all = await getPerformance()

  const sorted = [...all].sort((a, b) => {
    if (sortBy === 'revenue') return b.total_revenue - a.total_revenue
    if (sortBy === 'bookings') return b.bookings_count - a.bookings_count
    if (sortBy === 'views') return b.views_count - a.views_count
    if (sortBy === 'conversion') return b.conversion_rate - a.conversion_rate
    if (sortBy === 'idle') {
      // No bookings, sort by views (most viewed but no bookings = problem)
      const aIdle = a.bookings_count === 0
      const bIdle = b.bookings_count === 0
      if (aIdle !== bIdle) return aIdle ? -1 : 1
      return b.views_count - a.views_count
    }
    return 0
  })

  // Stats
  const totalRevenue = all.reduce((s, l) => s + l.total_revenue, 0)
  const totalBookings = all.reduce((s, l) => s + l.bookings_count, 0)
  const idleCount = all.filter(l => l.bookings_count === 0).length
  const topPerformer = sorted[0]

  return (
    <div dir="rtl" style={{
      fontFamily: 'Tahoma, Arial, sans-serif',
      background: '#FAF7F0',
      minHeight: '100vh',
      padding: '24px 20px',
      color: '#1a1a1a',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ color: '#059669', margin: 0, fontSize: 26 }}>📊 Listing Performance</h1>
            <p style={{ color: '#666', margin: '4px 0 0', fontSize: 13 }}>
              مين بيجيب فلوس، ومين قاعد بدون حجز
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
            <a href="/admin/marketing-hq" style={{ color: '#059669' }}>← HQ</a>
            <a href="/admin/funnel" style={{ color: '#059669' }}>← Funnel</a>
            <a href="/admin/insights" style={{ color: '#059669' }}>← Insights</a>
          </div>
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          marginBottom: 20,
        }}>
          {[
            { label: '💵 إجمالي الإيرادات', val: `${totalRevenue.toLocaleString()}ج`, color: '#059669' },
            { label: '📅 إجمالي الحجوزات', val: totalBookings, color: '#059669' },
            { label: '🌱 لسه ولا حجز', val: `${idleCount}/${all.length}`, color: '#999' },
            { label: '🏆 الأقوى', val: topPerformer?.title.slice(0, 22) ?? '—', color: '#2FA084' },
          ].map((s, i) => (
            <div key={i} style={{
              background: '#fff',
              padding: 16,
              borderRadius: 12,
              border: '1px solid #eee',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Sort buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { value: 'revenue', label: '💵 الإيرادات' },
            { value: 'bookings', label: '📅 الحجوزات' },
            { value: 'views', label: '👁️ المشاهدات' },
            { value: 'conversion', label: '⚡ نسبة التحويل' },
            { value: 'idle', label: '🌱 الميتة' },
          ].map(opt => (
            <a key={opt.value} href={`?sort=${opt.value}`} style={{
              background: sortBy === opt.value ? '#059669' : '#fff',
              color: sortBy === opt.value ? '#FAF7F0' : '#059669',
              padding: '6px 14px',
              borderRadius: 8,
              textDecoration: 'none',
              fontSize: 12,
              fontWeight: 'bold',
              border: '1px solid #059669',
            }}>{opt.label}</a>
          ))}
        </div>

        {/* Listings table */}
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #eee' }}>
          {sorted.slice(0, 50).map((l, i) => (
            <div key={l.id} style={{
              padding: '12px 16px',
              borderBottom: i < 49 ? '1px solid #f0f0f0' : 'none',
              display: 'grid',
              gridTemplateColumns: '60px 1fr auto auto auto auto',
              gap: 16,
              alignItems: 'center',
            }}>
              <div style={{
                width: 60,
                height: 60,
                background: l.hero_photo ? `url(${l.hero_photo}) center/cover` : '#FAF7F0',
                borderRadius: 8,
                fontSize: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {!l.hero_photo && '📦'}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 'bold', color: '#059669', fontSize: 13, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  #{i + 1}. {l.title}
                </div>
                <div style={{ fontSize: 11, color: '#666' }}>
                  {l.category_name && <span>📦 {l.category_name}</span>}
                  {l.city && <span style={{ marginRight: 8 }}>📍 {l.city}</span>}
                  {l.price && <span style={{ marginRight: 8 }}>💰 من {l.price.toLocaleString()}ج</span>}
                </div>
              </div>
              <div style={{ textAlign: 'center', minWidth: 70 }}>
                <div style={{ fontSize: 18, fontWeight: 'bold', color: '#059669' }}>{l.bookings_count}</div>
                <div style={{ fontSize: 9, color: '#999' }}>حجز</div>
              </div>
              <div style={{ textAlign: 'center', minWidth: 70 }}>
                <div style={{ fontSize: 16, fontWeight: 'bold', color: l.total_revenue > 0 ? '#059669' : '#ccc' }}>
                  {l.total_revenue > 0 ? `${l.total_revenue.toLocaleString()}ج` : '—'}
                </div>
                <div style={{ fontSize: 9, color: '#999' }}>إيراد</div>
              </div>
              <div style={{ textAlign: 'center', minWidth: 60 }}>
                <div style={{ fontSize: 14, fontWeight: 'bold', color: '#666' }}>{l.views_count}</div>
                <div style={{ fontSize: 9, color: '#999' }}>مشاهدة</div>
              </div>
              <div style={{ textAlign: 'center', minWidth: 80, fontSize: 10, color: l.last_booking_at ? '#666' : '#ccc' }}>
                {timeAgo(l.last_booking_at)}
              </div>
            </div>
          ))}
        </div>

        {sorted.length > 50 && (
          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#999' }}>
            بيظهر أعلى 50 — في {sorted.length - 50} إعلان كمان
          </div>
        )}
      </div>
    </div>
  )
}
