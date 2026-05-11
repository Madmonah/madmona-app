// app/marketplace/page.tsx
// =====================================================================
// Server Component wrapper for /marketplace (browse listings)
// Same SSR-bailout fix as /add-listing: server-rendered fallback so
// users on slow/WhatsApp browsers see real content immediately.
// =====================================================================

import { Suspense } from 'react';
import MarketplaceClient from './MarketplaceClient';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export const metadata = {
  title: 'تصفح الإيجارات — مضمونة',
  description: 'تصفح آلاف العقارات والعربيات والمعدات للإيجار في مصر على مضمونة. حماية كاملة، دفع آمن، دعم 24/7.',
};

const CATEGORY_PREVIEW = [
  { slug: 'properties', emoji: '🏠', label: 'عقارات' },
  { slug: 'vehicles',   emoji: '🚗', label: 'عربيات' },
  { slug: 'workspaces', emoji: '🏢', label: 'مساحات عمل' },
  { slug: 'equipment',  emoji: '🛠', label: 'معدات' },
  { slug: 'media',      emoji: '📷', label: 'كاميرات وميديا' },
  { slug: 'weddings',   emoji: '💍', label: 'أفراح' },
  { slug: 'tourism',    emoji: '🏖', label: 'سياحة' },
  { slug: 'recreation', emoji: '🎯', label: 'ترفيه' },
];

/**
 * Server-rendered HTML shown before client JS hydrates.
 * Same pattern as /add-listing: real content visible to slow browsers.
 */
function MarketplaceFallback() {
  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-[#FAFAF7]">
      <header className="bg-[#1F5F3F] text-[#FAF7F0] px-5 py-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-black mb-1">
            مضمونة <span className="text-[#B8860B]">·</span> تصفح الإيجارات
          </h1>
          <p className="text-sm text-[#FAF7F0]/80">
            احنا بتوع الإيجار — حماية كاملة، دفع آمن، دعم 24/7
          </p>
        </div>
      </header>

      <main className="px-5 py-6 max-w-6xl mx-auto">
        <h2 className="text-lg font-bold mb-4 text-[#1F5F3F]">
          الفئات
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6" aria-hidden>
          {CATEGORY_PREVIEW.map((c) => (
            <div
              key={c.slug}
              className="p-4 rounded-xl bg-white border border-gray-200 flex items-center gap-3 hover:border-[#1F5F3F] transition-colors"
            >
              <span className="text-2xl">{c.emoji}</span>
              <span className="text-[#1F5F3F] font-medium">{c.label}</span>
            </div>
          ))}
        </div>

        <div className="text-center py-12">
          <div className="inline-block animate-pulse text-gray-400">
            جاري تحميل الإيجارات…
          </div>
        </div>

        <noscript>
          <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
            <p className="font-bold mb-1">⚠️ التصفح محتاج JavaScript</p>
            <p className="text-sm">
              لو الصفحة مش بتفتح،{' '}
              <a
                href="https://wa.me/201002229982?text=عايز%20أتفرج%20على%20الإيجارات"
                className="underline text-[#1F5F3F] font-bold"
              >
                كلمنا على واتس
              </a>{' '}
              وفريقنا هيساعدك.
            </p>
          </div>
        </noscript>

        <div className="mt-6 text-center">
          <a
            href="/add-listing"
            className="inline-block px-6 py-3 bg-[#B8860B] text-white font-bold rounded-xl hover:bg-[#B8860B]/90 transition-all"
          >
            عندك حاجة تأجرها؟ سجّل ليستنجك في 60 ثانية
          </a>
        </div>
      </main>
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={<MarketplaceFallback />}>
      <MarketplaceClient />
    </Suspense>
  );
}
