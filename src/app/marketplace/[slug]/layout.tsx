import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'

// ============================================================================
// /marketplace/[slug]/layout.tsx
//
// Server component that generates Open Graph metadata for listing pages.
// When users share a listing link on WhatsApp/Facebook/etc, the preview
// card shows the listing title, description, and primary photo.
//
// The page.tsx itself remains a client component; this layout only
// provides metadata.
// ============================================================================

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { slug } = await params

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // @ts-expect-error new schema
    const { data: listing } = await supabase
      .from('listings')
      .select(`
        title, description, city, district,
        category:categories(name_ar),
        photos:listing_photos(url, is_primary, display_order),
        supplier:marketplace_suppliers(business_name)
      `)
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle()

    if (!listing) {
      return {
        title: 'Madmona Marketplace',
        description: 'مساحات وخدمات من موردين معتمدين على مضمونة',
      }
    }

    const photos = (listing.photos || []) as Array<{
      url: string
      is_primary: boolean
      display_order: number
    }>
    const primary = photos.find(p => p.is_primary)
      || photos.sort((a, b) => a.display_order - b.display_order)[0]
    const photoUrl = primary?.url

    const location = [listing.district, listing.city].filter(Boolean).join('، ')
    const supplierName = (listing.supplier as { business_name?: string } | null)?.business_name
    const categoryName = (listing.category as { name_ar?: string } | null)?.name_ar

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
      openGraph: {
        title,
        description,
        url: `https://madmonacairo.com/marketplace/${slug}`,
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

export default function MarketplaceListingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
