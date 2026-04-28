import type { Metadata, Viewport } from 'next'
import { Tajawal } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

const SITE_URL = 'https://madmonacairo.com'

// Tajawal — modern, clean Arabic typeface that pairs well with the
// Aesop/Byredo minimal-luxury aesthetic. Loaded with the latin subset too
// since the wordmark uses both scripts.
const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '700'],
  display: 'swap',
  variable: '--font-tajawal',
})

export const metadata: Metadata = {
  title: {
    default: 'مضمونة | مساحة عمل مشتركة في مصر الجديدة',
    template: '%s | مضمونة',
  },
  description:
    'مضمونة - مساحة عمل بوتيك في مصر الجديدة. مساحات داخلية وحديقة، مكاتب خاصة، وغرف اجتماعات. مساحتك اللي بتخصك.',
  keywords: [
    'مضمونة',
    'madmona',
    'coworking',
    'مساحة عمل',
    'مساحة عمل مشتركة',
    'مصر الجديدة',
    'القاهرة',
    'فريلانسر',
    'remote work',
    'meeting room',
    'مكتب خاص',
  ],
  authors: [{ name: 'Madmona' }],
  creator: 'Madmona',
  publisher: 'Madmona',
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: 'مضمونة | مساحة عمل بوتيك في مصر الجديدة',
    description: 'مساحتك اللي بتخصك — Coworking · Meeting Rooms · Private Office',
    url: SITE_URL,
    siteName: 'مضمونة',
    locale: 'ar_EG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'مضمونة - Your Space, Guaranteed',
    description: 'مساحة عمل بوتيك في مصر الجديدة. مساحتك اللي بتخصك.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  appleWebApp: {
    capable: true,
    title: 'مضمونة',
    statusBarStyle: 'default',
  },
  category: 'business',
}

// Next.js 14 wants themeColor and viewport in a separate export
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#1F5F3F',
}

// JSON-LD structured data for LocalBusiness — helps Google understand
// the business and may surface us in local search results.
const businessJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': `${SITE_URL}/#business`,
  name: 'مضمونة',
  alternateName: 'Madmona',
  description: 'مساحة عمل بوتيك في مصر الجديدة',
  url: SITE_URL,
  telephone: '+201002229982',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '٧ شارع سليمان، متفرع من عبد الحميد بدوي',
    addressLocality: 'مصر الجديدة',
    addressRegion: 'القاهرة',
    addressCountry: 'EG',
  },
  priceRange: 'EGP',
  image: `${SITE_URL}/og-image.png`,
  sameAs: ['https://www.instagram.com/madmona.space'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl" className={tajawal.variable}>
      <head>
        {/* Structured data for search engines */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(businessJsonLd) }}
        />
      </head>
      <body className={`${tajawal.className} bg-[#FAFAF7] text-gray-900 antialiased`}>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
