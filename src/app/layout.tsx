import type { Metadata, Viewport } from 'next'
import { Tajawal, Inter, Cairo } from 'next/font/google'
import { LanguageProvider } from '@/lib/i18n/LanguageProvider'
import SiteAnalytics from '@/components/SiteAnalytics'
import { Suspense } from 'react'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'
import DeferredWidgets from '@/components/DeferredWidgets'
import { safeStorage } from '@/lib/safe-storage'
// 🔴 شبكة أمان: أي RPC تفشل، بيظهر تنبيه أحمر بدل ما تعدّي في صمت (13 Jul 2026)
import RpcErrorToast from '@/components/RpcErrorToast'
import './globals.css'

// Madmona root layout — Arabic typography (Tajawal), brand metadata,
// JSON-LD (LocalBusiness + Organization + WebSite), and analytics.

const SITE_URL = 'https://www.madmonacairo.com'

// Tajawal مش متغيّر - أوزان ثابتة. قلّلناها للمستخدم فعلاً بدل ٤.
const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-tajawal',
})

// English/Latin face — used when the app is switched to English (LTR).
// Inter خط متغيّر - من غير weight بياخد الملف المتغيّر الواحد بدل ٥ ملفات ثابتة.
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

// 🚀 (٣٠ يوليو ٢٠٢٦) خط شات مضمونة.
// قبل كده كل صفحة شات كانت بتحمّله بـ @import جوّه <style> في كومبوننت client،
// يعني المتصفح ماكانش يكتشفه غير بعد ما الجافاسكريبت يتحمّل ويعمل hydrate —
// وبعدين يعمل DNS+TLS لـ fonts.googleapis.com، يقرا الـCSS، يكتشف إن الخط على
// fonts.gstatic.com، ويعمل DNS+TLS تاني. سلسلة كاملة بتوقف رسم النص، وكلها
// أول مرة بس (بعد كده كاش) — وده كان بالظبط سبب الديلاي اللي بيحصل أول فتحة.
// دلوقتي next/font بيستضيفه محلياً وبيحط preload في <head>، فالتحميل بيبدأ من
// أول بايت بالتوازي مع الجافاسكريبت.
// ⚠️ (31 Jul 2026) من غير weight بقصد: Cairo خط متغيّر، فده بيطلّع ملف واحد
// لكل subset بدل ملف لكل وزن. أول نسخة حطيت فيها ٥ أوزان × ٢ subsets = ١٠
// ملفات، وكلهم preload يعني بيزاحموا الجافاسكريبت أول فتحة. متحطش weight هنا.
const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  display: 'swap',
  variable: '--font-cairo',
})

// Runs before paint: reads the saved language and sets <html lang/dir>
// so switching to English never flashes RTL first.
const NO_FLASH_LANG = `(function(){try{var m=document.cookie.match(/(?:^|; )madmona_lang=(ar|en)/);var l=(safeStorage.get('madmona_lang')||(m&&m[1])||'ar');var e=document.documentElement;e.lang=l;e.dir=(l==='en'?'ltr':'rtl');}catch(e){}})();`


export const metadata: Metadata = {
  title: {
    default: 'مضمونة | معاملاتك مضمونة — تأجير · بيع · خدمات · مطاعم · بيوتي',
    template: '%s | مضمونة',
  },
  description:
    'مضمونة - سوق مصر المضمون. أجّر، اشتري، واحجز خدمات ومطاعم وبيوتي من موردين موثوقين. حماية كاملة على كل صفقة، دفع مستحقات سريع، ودعم ٢٤/٧. معاملاتك مضمونة.',
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
    title: 'مضمونة | معاملاتك مضمونة',
    description:
      'سوق مصر المضمون — أجّر، اشتري، واحجز خدمات ومطاعم وبيوتي من موردين موثوقين. حماية كاملة + دفع سريع + دعم ٢٤/٧.',
    url: SITE_URL,
    siteName: 'مضمونة',
    locale: 'ar_EG',
    type: 'website',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'مضمونة - سوق مصر المضمون',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'مضمونة | معاملاتك مضمونة',
    description: 'سوق مصر المضمون — أجّر، اشتري، واحجز خدمات ومطاعم وبيوتي. حماية كاملة.',
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
    // build marker — bump to verify which deployment actually serves the domain
    'madmona-build': 'grpfix-2026-07-17-a',
    'p:domain_verify': '17411bdfcac6fbb3fa1286d6074aa8a4',
    'facebook-domain-verification': 't7trqm1upwaaju0pn7ejmvyx6497qv',
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
    'سوق مصر المضمون — أجّر، اشتري، واحجز خدمات ومطاعم وبيوتي من موردين موثوقين. حماية كاملة، دفع سريع، ودعم ٢٤/٧.',
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
  foundingDate: '2026-05-01',
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
    'https://www.pinterest.com/madmonaCairo',
    'https://bsky.app/profile/madmonacairo.bsky.social',
    'https://t.me/madmona_cairo',
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
    'https://www.pinterest.com/madmonaCairo',
    'https://bsky.app/profile/madmonacairo.bsky.social',
    'https://t.me/madmona_cairo',
  ],
}

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  url: SITE_URL,
  name: 'Madmona',
  alternateName: 'مضمونة',
  description: 'سوق مصر المضمون — أجّر، اشتري، واحجز خدمات ومطاعم وبيوتي من موردين موثوقين.',
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
    <html lang="ar" dir="rtl" className={`${tajawal.variable} ${inter.variable} ${cairo.variable}`}>
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
        {/* (31 Jul 2026) التتبّع اتلمّ في مكوّن واحد بيتخطّى نفسه جوّه /chat */}
        <SiteAnalytics />
        <Suspense fallback={null}>
          <DeferredWidgets />
        </Suspense>
        <RpcErrorToast />
        </LanguageProvider>
      </body>
    </html>
  )
}
