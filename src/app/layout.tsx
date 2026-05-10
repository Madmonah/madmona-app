import type { Metadata, Viewport } from 'next'
import { Tajawal } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Suspense } from 'react'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'
import NotificationPrompt from '@/components/NotificationPrompt'
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics'
import MetaPixel from '@/components/analytics/MetaPixel'
import AnalyticsTracker from '@/components/AnalyticsTracker'
import MadmonaListingClaimer from '@/components/MadmonaListingClaimer'
import './globals.css'

// Madmona root layout — Arabic typography (Tajawal), brand metadata,
// JSON-LD (LocalBusiness + Organization + WebSite), and analytics.

const SITE_URL = 'https://madmonacairo.com'

const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '700'],
  display: 'swap',
  variable: '--font-tajawal',
})

export const metadata: Metadata = {
  title: {
    default: 'مضمونة | منصة حجز شاملة - مساحات، عقارات، معدات',
    template: '%s | مضمونة',
  },
  description:
    'مضمونة - منصة حجز مصرية لكل ما يمكن تأجيره. مساحات عمل، عقارات، مركبات، معدات تصوير، فعاليات. من موردين معتمدين، بضمان كامل.',
  keywords: [
    'مضمونة', 'madmona', 'مساحة عمل', 'coworking', 'مصر الجديدة', 'القاهرة',
    'تأجير', 'rental', 'marketplace', 'فريلانسر', 'remote work',
    'meeting room', 'مكتب خاص', 'تأجير معدات', 'تأجير سيارات',
    'تأجير شقق', 'تأجير عقارات', 'منصة حجز', 'booking platform',
  ],
  authors: [{ name: 'Madmona' }],
  creator: 'Madmona',
  publisher: 'Madmona',
  manifest: '/manifest.json',
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: 'مضمونة | منصة حجز شاملة',
    description: 'مساحات، عقارات، مركبات، ومعدات — في مكان واحد بضمان كامل.',
    url: SITE_URL,
    siteName: 'مضمونة',
    locale: 'ar_EG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'مضمونة - Your Space, Guaranteed',
    description: 'منصة حجز مصرية لكل ما يمكن تأجيره.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  appleWebApp: { capable: true, title: 'مضمونة', statusBarStyle: 'default' },
  category: 'business',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#1F5F3F',
}

const businessJsonLd = {
  '@context': 'https://schema.org',
  '@type': ['LocalBusiness', 'CoworkingSpace'],
  '@id': `${SITE_URL}/#business`,
  name: 'مضمونة',
  alternateName: 'Madmona',
  description: 'مساحة عمل بوتيك في مصر الجديدة + منصة حجز لكل ما يمكن تأجيره',
  url: SITE_URL,
  telephone: '+201002229982',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '٧ شارع سليمان عَزْمي',
    addressLocality: 'النزهة، مصر الجديدة',
    addressRegion: 'القاهرة',
    addressCountry: 'EG',
  },
  geo: { '@type': 'GeoCoordinates', latitude: 30.1134075, longitude: 31.3655983 },
  hasMap: 'https://share.google/QbWskGlQ49AUTJrTc',
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      opens: '09:00',
      closes: '23:00',
    },
  ],
  priceRange: 'EGP',
  image: `${SITE_URL}/og-image.png`,
  sameAs: ['https://www.instagram.com/madmona.space'],
}

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: 'Madmona',
  alternateName: 'مضمونة',
  url: SITE_URL,
  logo: `${SITE_URL}/madmona-logo.png`,
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+201002229982',
    contactType: 'customer service',
    areaServed: 'EG',
    availableLanguage: ['Arabic', 'English'],
  },
  sameAs: ['https://www.instagram.com/madmona.space'],
}

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  url: SITE_URL,
  name: 'Madmona',
  description: 'منصة حجز مصرية لكل ما يمكن تأجيره',
  inLanguage: 'ar-EG',
  publisher: { '@id': `${SITE_URL}/#organization` },
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/marketplace?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={tajawal.variable}>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(businessJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      </head>
      <body className={`${tajawal.className} bg-[#FAFAF7] text-gray-900 antialiased`}>
        {children}
        <ServiceWorkerRegister />
        <NotificationPrompt />
        <Analytics />
        <SpeedInsights />
        <GoogleAnalytics />
        <MetaPixel />
        <Suspense fallback={null}>
          <AnalyticsTracker />
        </Suspense>
        <Suspense fallback={null}>
          <MadmonaListingClaimer />
        </Suspense>
      </body>
    </html>
  )
}
