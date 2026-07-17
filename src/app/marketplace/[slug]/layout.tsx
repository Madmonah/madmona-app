import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'

// ============================================================================
// /marketplace/[slug]/layout.tsx
//
// Server component for SEO:
//   1. Open Graph metadata (link previews on WhatsApp/Facebook/Twitter)
//   2. JSON-LD structured data (Google understands listings as Products)
// ============================================================================

interface Props {
  params: Promise<{ slug: string }>
}

const SITE_URL = 'https://madmonacairo.com'

interface ListingFull {
  title: string
  slug: string
  description: string | null
  city: string | null
  district: string | null
  address: string | null
  latitude: number | string | null
  longitude: number | string | null
  rating: number | string | null
  reviews_count: number
  category: { name_ar: string } | null
  photos: Array<{ url: string; is_primary: boolean; display_order: number }> | null
  supplier: {
    business_name: string
    profile: { phone: string | null } | null
  } | null
  pricing: Array<{ price: number | string; currency: string; period_type: string; is_active: boolean }> | null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { slug } = await params
    const listing = await fetchListing(slug)
    if (!listing) {
      return {
        title: 'Madmona Marketplace',
        description: 'مساحات وخدمات من موردين معتمدين على مضمونة',
      }
    }

    const photos = listing.photos || []
    const primary = photos.find(p => p.is_primary)
      || photos.sort((a, b) => a.display_order - b.display_order)[0]
    const photoUrl = primary?.url

    const location = [listing.district, listing.city].filter(Boolean).join('، ')
    const supplierName = listing.supplier?.business_name
    const categoryName = listing.category?.name_ar

    const title = `${listing.title} | Madmona Marketplace`
    const fullDescription = listing.description
      || [categoryName, location, supplierName ? `من ${supplierName}` : null]
        .filter(Boolean)
        .join(' · ')
    const description = fullDescription.length > 160
      ? fullDescription.substring(0, 157) + '...'
      : fullDescription

    return {
      title,
      description,
      alternates: {
        canonical: `${SITE_URL}/marketplace/${slug}`,
      },
      openGraph: {
        title,
        description,
        url: `${SITE_URL}/marketplace/${slug}`,
        siteName: 'Madmona Marketplace',
        images: photoUrl ? [{ url: photoUrl, width: 1200, height: 630, alt: listing.title }] : [],
        locale: 'ar_EG',
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: photoUrl ? [photoUrl] : [],
      },
    }
  } catch {
    return {
      title: 'Madmona Marketplace',
      description: 'مساحات وخدمات من موردين معتمدين',
    }
  }
}

async function fetchListing(rawSlug: string): Promise<ListingFull | null> {
  // FIX (Jul 17 2026): السلجات العربية بتوصل مشفّرة (%D8..) من params — لازم فك تشفير
  let slug = rawSlug
  try { slug = decodeURIComponent(rawSlug) } catch { /* keep raw */ }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  // @ts-expect-error
  const { data } = await supabase
    .from('listings')
    .select(`
      title, slug, description, city, district, address, latitude, longitude,
      rating, reviews_count,
      category:categories(name_ar),
      photos:listing_photos(url, is_primary, display_order),
      supplier:marketplace_suppliers(
        business_name,
        profile:profiles!marketplace_suppliers_profile_id_fkey(phone)
      ),
      pricing:pricing_rules(price, currency, period_type, is_active)
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()
  return data as ListingFull | null
}

// ============================================================================
// Layout component — also injects JSON-LD structured data
// ============================================================================
export default async function MarketplaceListingLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  let jsonLd: Record<string, unknown> | null = null
  try {
    const listing = await fetchListing(slug)
    if (listing) {
      jsonLd = buildJsonLd(listing, slug)
    }
  } catch {
    // ignore — render page without structured data
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  )
}

function buildJsonLd(listing: ListingFull, slug: string): Record<string, unknown> {
  const photos = listing.photos || []
  const sorted = [...photos].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1
    return a.display_order - b.display_order
  })
  const photoUrls = sorted.map(p => p.url).filter(Boolean)

  const activePricing = (listing.pricing || []).filter(p => p.is_active && Number(p.price) > 0)
  const cheapest = activePricing.length > 0
    ? activePricing.reduce((min, p) => Number(p.price) < Number(min.price) ? p : min)
    : null

  const offers = activePricing.length > 0
    ? activePricing.map(p => ({
        '@type': 'Offer',
        price: Number(p.price),
        priceCurrency: p.currency || 'EGP',
        availability: 'https://schema.org/InStock',
        priceValidUntil: futureDateIso(180),
      }))
    : []

  // Use Product as the base type — generic, supports rentals
  const product: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description: listing.description || `${listing.category?.name_ar || ''} على مضمونة`.trim(),
    image: photoUrls.length > 0 ? photoUrls : undefined,
    url: `${SITE_URL}/marketplace/${slug}`,
    sku: slug,
    category: listing.category?.name_ar,
    brand: listing.supplier?.business_name ? {
      '@type': 'Brand',
      name: listing.supplier.business_name,
    } : undefined,
  }

  // Add aggregateRating if there are reviews
  if (listing.rating && Number(listing.rating) > 0 && listing.reviews_count > 0) {
    product.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(listing.rating).toFixed(1),
      reviewCount: listing.reviews_count,
      bestRating: 5,
      worstRating: 1,
    }
  }

  // Add offers
  if (offers.length === 1) {
    product.offers = offers[0]
  } else if (offers.length > 1) {
    product.offers = {
      '@type': 'AggregateOffer',
      priceCurrency: cheapest?.currency || 'EGP',
      lowPrice: cheapest ? Number(cheapest.price) : undefined,
      offerCount: offers.length,
      offers: offers,
    }
  }

  // Cleanup undefined values
  Object.keys(product).forEach(key => {
    if (product[key] === undefined) delete product[key]
  })

  return product
}

function futureDateIso(daysFromNow: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toISOString().split('T')[0]
}
