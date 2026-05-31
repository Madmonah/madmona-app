import type { Metadata, Viewport } from 'next'
import { Tajawal, Inter } from 'next/font/google'
import { LanguageProvider } from '@/lib/i18n/LanguageProvider'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Suspense } from 'react'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'
import NotificationPrompt from '@/components/NotificationPrompt'
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics'
import MetaPixel from '@/components/analytics/MetaPixel'
import AnalyticsTracker from '@/components/AnalyticsTracker'
import MadmonaListingClaimer from '@/components/MadmonaListingClaimer'
import DailyMessageBanner from '@/components/DailyMessageBanner'
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

// English/Latin face — used when the app is switched to English (LTR).
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-inter',
})

// Runs before paint: reads the saved language and sets <html lang/dir>
// so switching to English never flashes RTL first.
const NO_FLASH_LANG = `(function(){try{var m=document.cookie.match(/(?:^|; )madmona_lang=(ar|en)/);var l=(localStorage.getItem('madmona_lang')||(m&&m[1])||'ar');var e=document.documentElement;e.lang=l;e.dir=(l==='en'?'ltr':'rtl');}catch(e){}})();`

export const metadata: Metadata = {
  title: {
    default: 'مضمونة | معاملاتك مضمونة — تأجير · بيع · خدمات · مطاعم · بيوتي',
    template: '%s | مضمونة',
  },
  description:
    'مضمونة - منصة إيجار كل حاجة في مصر. شاليهات، عربيات، منتجات، مطاعم، وخدمات. حماية كاملة على كل صفقة، دفع مستحقات سريع، ودعم ٢٤/٧. معاملاتك مضمونة.',
  keywords: [
    'مضمونة', 'madmona', 'معاملاتك مضمونة',
    'إيجار', 'تأجير', 'rental', 'rental Egypt', 'marketplace',
    'تأجير شاليهات', 'إيجار شاليه', 'شاليهات الساحل', 'شاليهات العين السخنة',
    'تأجير عربيات', 'تأجير سيارات', 'إيجار عربية',
    'تأجير قاعات', 'قاعات اجتماعات', 'قاعات افراح', 'meeting room Cairo',
    'تأجير كاميرات', 'تأجير معدات تصوير', 'camera rental Egypt',
    'بيع وشراء', 'منتجات', 'مطاعم', 'بيوتي', 'خدمات', 'مصر الجديدة', 'النزهة', 'القاهرة',
    'سوق مصر', 'حجز اونلاين', 'دفع آمن',
    'منصة حجز', 'booking platform',
  ],
  authors: [{ name: 'Madmona' }],
  creator: 'Madmona',
  publisher: 'Madmona',
  manifest: '/manifest.json',
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: 'مضمونة | احنا بتوع الإيجار',
    description:
      'منصة إيجار كل حاجة في مصر — شاليهات، عربيات، قاعات، كاميرات، ومساحات شغل. حماية كاملة + دفع سريع + دعم ٢٤/٧.',
    url: SITE_URL,
    siteName: 'مضمونة',
    locale: 'ar_EG',
    type: 'website',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'مضمونة - منصة إيجار كل حاجة في مصر',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'مضمونة | احنا بتوع الإيجار',
    description: 'منصة إيجار كل حاجة في مصر — شاليهات، عربيات، قاعات، كاميرات.',
    images: ['/opengraph-image'],
    site: '@madmonacairo',
    creator: '@madmonacairo',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  appleWebApp: { capable: true, title: 'مضمونة', statusBarStyle: 'default' },
  category: 'business',
  other: {
    'p:domain_verify': '17411bdfcac6fbb3fa1286d6074aa8a4',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#1F6F5F',
}

const businessJsonLd = {
  '@context': 'https://schema.org',
  '@type': ['LocalBusiness', 'RentalAgency'],
  '@id': `${SITE_URL}/#business`,
  name: 'مضمونة',
  alternateName: 'Madmona',
  description:
    'منصة إيجار كل حاجة في مصر — شاليهات، عربيات، قاعات، كاميرات، ومساحات شغل. حماية كاملة، دفع سريع، ودعم ٢٤/٧.',
  slogan: 'معاملاتك مضمونة',
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
      opens: '00:00',
      closes: '23:59',
    },
  ],
  priceRange: 'EGP',
  areaServed: { '@type': 'Country', name: 'Egypt' },
  foundingDate: '2019',
  image: `${SITE_URL}/opengraph-image`,
  logo: `${SITE_URL}/madmona-logo.png`,
  sameAs: [
    'https://www.instagram.com/madmona.cairo',
    'https://www.facebook.com/MadmonaCairo',
    'https://www.tiktok.com/@madmonacairo',
    'https://www.youtube.com/@Madmonacairo',
    'https://www.linkedin.com/in/madmona-cairo-a48a71406',
    'https://x.com/madmonacairo',
    'https://www.threads.net/@madmona.cairo',
  ],
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
  sameAs: [
    'https://www.instagram.com/madmona.cairo',
    'https://www.facebook.com/MadmonaCairo',
    'https://www.tiktok.com/@madmonacairo',
    'https://www.youtube.com/@Madmonacairo',
    'https://www.linkedin.com/in/madmona-cairo-a48a71406',
    'https://x.com/madmonacairo',
    'https://www.threads.net/@madmona.cairo',
  ],
}

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  url: SITE_URL,
  name: 'Madmona',
  alternateName: 'مضمونة',
  description: 'منصة إيجار كل حاجة في مصر — شاليهات، عربيات، قاعات، كاميرات، ومساحات شغل.',
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
    <html lang="ar" dir="rtl" className={`${tajawal.variable} ${inter.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_LANG }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(businessJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      </head>
      <body className={`${tajawal.className} bg-[#FAFAF7] text-gray-900 antialiased`}>
        <LanguageProvider>
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
        <Suspense fallback={null}>
          <DailyMessageBanner />
        </Suspense>
        </LanguageProvider>
      </body>
    </html>
  )
}
