import type { Metadata } from 'next'

// (4 Aug 2026) SEO layer لصفحة الإعلان — الصفحة نفسها client بالكامل،
// فده الـlayout السيرفر اللي بيدّي كل إعلان: عنوان/وصف فريد + OG بصورة
// الإعلان + Product JSON-LD (سعر/توفر/تقييم) من غير لمس صفحة الـ1242 سطر.
const SITE = 'https://www.madmonacairo.com'

async function getListing(slug: string) {
  try {
    const u = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/listings` +
      `?slug=eq.${encodeURIComponent(slug)}&status=eq.published&limit=1` +
      `&select=slug,title,description,city,district,price_egp,rating,reviews_count,stock_quantity,brand,product_condition,` +
      `categories(name_ar,track,group_slug),listing_photos(url,is_primary,display_order)`
    const r = await fetch(u, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}` },
      next: { revalidate: 600 },
    })
    const rows = await r.json()
    return Array.isArray(rows) && rows[0] ? rows[0] : null
  } catch { return null }
}

const firstPhoto = (l: any): string | null => {
  const ph = Array.isArray(l?.listing_photos) ? [...l.listing_photos] : []
  ph.sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || (a.display_order ?? 99) - (b.display_order ?? 99))
  return ph[0]?.url || null
}

type P = { params: { slug: string } }
// params بييجي percent-encoded في الـApp Router — لازم فكّة الأول (سبب اختفاء الميتاداتا)
const slugOf = (p: { slug: string }) => { try { return decodeURIComponent(p.slug) } catch { return p.slug } }

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const l = await getListing(slugOf(params))
  if (!l) return {}
  const place = [l.district, l.city].filter(Boolean).join('، ')
  const title = place ? `${l.title} — ${place}` : String(l.title)
  const desc = String(l.description || `${l.title} على مضمونة — معاملاتك مضمونة. حماية كاملة ودعم مستمر.`).slice(0, 160)
  const img = firstPhoto(l)
  const url = `${SITE}/marketplace/${encodeURIComponent(l.slug)}`
  return {
    title,
    description: desc,
    alternates: { canonical: url },
    openGraph: {
      title, description: desc, url, siteName: 'مضمونة', locale: 'ar_EG', type: 'website',
      ...(img ? { images: [{ url: img, width: 1200, height: 630, alt: String(l.title) }] } : {}),
    },
    twitter: { card: 'summary_large_image', title, description: desc, ...(img ? { images: [img] } : {}) },
  }
}

export default async function ListingSeoLayout({ children, params }: P & { children: React.ReactNode }) {
  const l = await getListing(slugOf(params))
  let jsonLd: object | null = null
  const track = l?.categories?.track
  const grp = l?.categories?.group_slug
  const isRealProduct = (track === 'products' || track === 'daily') && !['sale-property', 'sale-vehicles'].includes(grp)
  if (l && l.price_egp > 0 && isRealProduct) {
    jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: l.title,
      description: String(l.description || l.title).slice(0, 500),
      ...(firstPhoto(l) ? { image: [firstPhoto(l)] } : {}),
      ...(l.brand ? { brand: { '@type': 'Brand', name: l.brand } } : {}),
      offers: {
        '@type': 'Offer',
        url: `${SITE}/marketplace/${encodeURIComponent(l.slug)}`,
        price: Number(l.price_egp).toFixed(2),
        priceCurrency: 'EGP',
        availability: l.stock_quantity === 0 ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
        itemCondition: l.product_condition === 'used' ? 'https://schema.org/UsedCondition' : 'https://schema.org/NewCondition',
      },
      ...(l.rating && l.reviews_count > 0
        ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: Number(l.rating), reviewCount: Number(l.reviews_count) } }
        : {}),
    }
  }
  return (
    <>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
      {children}
    </>
  )
}
