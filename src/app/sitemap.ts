import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

// Dynamic sitemap — pulls from listings + categories at build time
// Includes: home, marketplace, browse, all published listings, all categories,
// static pages (about, privacy, terms, auth)

const SITE_URL = 'https://www.madmonacairo.com'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date()

  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${SITE_URL}/marketplace`,
      lastModified,
      changeFrequency: 'daily',
      priority: 0.95,
    },
    {
      url: `${SITE_URL}/browse`,
      lastModified,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/real-estate/market`,
      lastModified,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/auth/signup`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/supplier/register`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]

  // Dynamic: published listings + active categories
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return staticUrls
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    const [{ data: listings }, { data: categories }, { data: combos }, { data: projects }] = await Promise.all([
      // @ts-expect-error
      supabase
        .from('listings')
        .select('id, slug, updated_at')
        .eq('status', 'published')
        .limit(50000),
      // @ts-expect-error
      supabase
        .from('categories')
        .select('slug')
        .eq('is_active', true)
        .limit(200),
      // @ts-expect-error — pSEO combos (تصنيف × مدينة)
      supabase.rpc('seo_combos'),
      // @ts-expect-error — مشاريع بورصة المطوّرين (عقارات)
      supabase
        .from('property_market_items')
        .select('slug, updated_at')
        .eq('status', 'published')
        .eq('is_active', true)
        .eq('embargoed', false)
        .limit(2000),
    ])

    // صور الإعلانات الأساسية → Google Images (image sitemap)
    const { data: primaryPhotos } = await supabase
      .from('listing_photos')
      .select('listing_id, url')
      .eq('is_primary', true)
      .limit(5000)
    const imgOf: Record<string, string> = {}
    for (const p of (primaryPhotos || []) as { listing_id: string; url: string }[]) {
      if (p?.url && !imgOf[p.listing_id]) imgOf[p.listing_id] = p.url
    }

    const listingUrls: MetadataRoute.Sitemap = (listings || []).map((l: { id: string; slug: string; updated_at: string }) => ({
      url: `${SITE_URL}/marketplace/${l.slug}`,
      lastModified: l.updated_at ? new Date(l.updated_at) : lastModified,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
      ...(imgOf[l.id] ? { images: [imgOf[l.id]] } : {}),
    }))

    const categoryUrls: MetadataRoute.Sitemap = (categories || []).map((c: { slug: string }) => ({
      url: `${SITE_URL}/marketplace?category=${encodeURIComponent(c.slug)}`,
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

    // صفحات pSEO: تصنيف × مدينة (محرك الترافيك)
    const comboUrls: MetadataRoute.Sitemap = (Array.isArray(combos) ? (combos as { cat: string; city: string }[]) : []).map((c) => ({
      url: `${SITE_URL}/browse/${encodeURIComponent(c.cat)}/${encodeURIComponent(String(c.city).trim())}`,
      lastModified,
      changeFrequency: 'daily' as const,
      priority: 0.85,
    }))

    // مشاريع المطوّرين — صفحات /real-estate/projects/[slug] (عقارات)
    const projectUrls: MetadataRoute.Sitemap = (projects || []).map((p: { slug: string; updated_at: string }) => ({
      url: `${SITE_URL}/real-estate/projects/${encodeURIComponent(p.slug)}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : lastModified,
      changeFrequency: 'weekly' as const,
      priority: 0.85,
    }))

    return [...staticUrls, ...listingUrls, ...categoryUrls, ...comboUrls, ...projectUrls]
  } catch (e) {
    console.error('[sitemap] failed to fetch dynamic data:', e)
    return staticUrls
  }
}
