// src/app/ad-listing/[slug]/page.tsx
// Direct listing ad landing page — for Meta ads pointing to a specific listing.
// Usage: madmonacairo.com/ad-listing/{slug}?utm_source=facebook&utm_campaign=...
//
// Server-renders listing details, then client form captures lead with listing context.

import { supabase as supabaseAdmin } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import AdListingForm from './AdListingForm'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface ListingRow {
  id: string
  supplier_id: string
  title: string
  slug: string
  description: string | null
  city: string | null
  district: string | null
  rating: number | null
  reviews_count: number
  bookings_count: number
  views_count: number
  category_id: string
}

interface PhotoRow {
  url: string
  caption: string | null
}

interface PricingRow {
  rate_period: string | null
  base_price: number | null
}

interface CategoryRow {
  name_ar: string | null
  name_en: string | null
}

async function getListing(slug: string): Promise<{
  listing: ListingRow | null
  photos: PhotoRow[]
  pricing: PricingRow[]
  categoryName: string | null
} | null> {
  const { data: listingRaw } = await supabaseAdmin
    .from('listings')
    .select('id, supplier_id, title, slug, description, city, district, rating, reviews_count, bookings_count, views_count, category_id')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  const listing = listingRaw as ListingRow | null
  if (!listing) return null

  const [photosRes, pricingRes, categoryRes] = await Promise.all([
    supabaseAdmin
      .from('listing_photos')
      .select('url, caption')
      .eq('listing_id', listing.id)
      .order('display_order', { ascending: true })
      .limit(8),
    supabaseAdmin
      .from('pricing_rules')
      .select('rate_period, base_price')
      .eq('listing_id', listing.id)
      .limit(5),
    supabaseAdmin
      .from('categories')
      .select('name_ar, name_en')
      .eq('id', listing.category_id)
      .maybeSingle(),
  ])

  return {
    listing,
    photos: (photosRes.data ?? []) as PhotoRow[],
    pricing: (pricingRes.data ?? []) as PricingRow[],
    categoryName: ((categoryRes.data as CategoryRow | null)?.name_ar) ?? null,
  }
}

function formatPrice(p: PricingRow): string {
  const period = p.rate_period === 'hourly' ? '/ساعة' : p.rate_period === 'daily' ? '/يوم' : p.rate_period === 'weekly' ? '/أسبوع' : ''
  return `${Number(p.base_price ?? 0).toLocaleString()}ج ${period}`
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await getListing(slug)
  if (!data?.listing) return { title: 'الإعلان مش موجود' }
  return {
    title: `${data.listing.title} | مضمونة`,
    description: data.listing.description?.slice(0, 160) ?? 'احنا بتوع الإيجار',
    robots: { index: false, follow: false },
  }
}

export default async function AdListingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await getListing(slug)
  if (!data || !data.listing) notFound()

  const { listing, photos, pricing, categoryName } = data
  const lowestPrice = pricing.length > 0 ? pricing.reduce((a, b) => (Number(a.base_price ?? Infinity) < Number(b.base_price ?? Infinity) ? a : b)) : null
  const heroPhoto = photos[0]?.url ?? null

  return (
    <div dir="rtl" style={{
      fontFamily: 'Tajawal, Tahoma, sans-serif',
      minHeight: '100vh',
      background: '#FAF7F0',
      color: '#1a1a1a',
    }}>
      {/* Hero with image */}
      {heroPhoto && (
        <div style={{
          width: '100%',
          height: '40vh',
          minHeight: 240,
          maxHeight: 360,
          background: `linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.5) 100%), url(${heroPhoto}) center/cover no-repeat`,
          position: 'relative',
        }}>
          <div style={{ position: 'absolute', bottom: 16, right: 20, color: '#fff' }}>
            {categoryName && (
              <span style={{
                background: '#B8860B',
                color: '#fff',
                padding: '4px 12px',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 'bold',
              }}>
                📦 {categoryName}
              </span>
            )}
          </div>
        </div>
      )}

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px' }}>
        {/* Title + Location */}
        <h1 style={{ color: '#1F5F3F', fontSize: 26, margin: '0 0 8px', lineHeight: 1.3 }}>
          {listing.title}
        </h1>
        {(listing.district || listing.city) && (
          <p style={{ color: '#666', fontSize: 14, margin: '0 0 12px' }}>
            📍 {[listing.district, listing.city].filter(Boolean).join('، ')}
          </p>
        )}

        {/* Trust strip */}
        <div style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 16,
          fontSize: 12,
          color: '#666',
        }}>
          {listing.rating && Number(listing.rating) > 0 && (
            <span>⭐ {Number(listing.rating).toFixed(1)} ({listing.reviews_count} تقييم)</span>
          )}
          {listing.bookings_count > 0 && (
            <span>📅 {listing.bookings_count} حجز سابق</span>
          )}
        </div>

        {/* Price card */}
        {lowestPrice && (
          <div style={{
            background: '#1F5F3F',
            color: '#FAF7F0',
            padding: 20,
            borderRadius: 16,
            marginBottom: 20,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>السعر يبدأ من</div>
            <div style={{ fontSize: 32, fontWeight: 'bold' }}>{formatPrice(lowestPrice)}</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4, color: '#B8860B' }}>
              ✓ حماية كاملة · ✓ دفع سريع · ✓ دعم مستمر
            </div>
          </div>
        )}

        {/* Description */}
        {listing.description && (
          <div style={{
            background: '#fff',
            padding: 16,
            borderRadius: 12,
            marginBottom: 20,
            fontSize: 14,
            lineHeight: 1.7,
            color: '#444',
            whiteSpace: 'pre-wrap',
          }}>
            {listing.description.slice(0, 400)}{listing.description.length > 400 && '...'}
          </div>
        )}

        {/* Photo grid */}
        {photos.length > 1 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 6,
            marginBottom: 20,
          }}>
            {photos.slice(1, 4).map((p, i) => (
              <div key={i} style={{
                aspectRatio: '1',
                background: `url(${p.url}) center/cover`,
                borderRadius: 8,
              }} />
            ))}
          </div>
        )}

        {/* Lead capture form */}
        <AdListingForm
          listingId={listing.id}
          listingTitle={listing.title}
          categoryName={categoryName}
        />

        {/* Trust footer */}
        <div style={{
          background: '#1F5F3F',
          color: '#FAF7F0',
          padding: 16,
          borderRadius: 12,
          marginTop: 20,
          textAlign: 'center',
          fontSize: 13,
        }}>
          🤝 احنا بتوع الإيجار — منصة مضمونة لكل اللي بتأجره
        </div>
      </div>

      {/* Floating WhatsApp */}
      <a
        href={`https://wa.me/201002229982?text=${encodeURIComponent(`أهلاً، شفت إعلان "${listing.title}" على مضمونة وعايز أعرف تفاصيل أكتر`)}`}
        target="_blank"
        rel="noopener"
        style={{
          position: 'fixed',
          bottom: 20,
          left: 20,
          background: '#25D366',
          color: '#fff',
          width: 56,
          height: 56,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 26,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          textDecoration: 'none',
          zIndex: 100,
        }}
      >
        📱
      </a>
    </div>
  )
}
