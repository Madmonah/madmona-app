// app/marketplace/page.tsx
// =====================================================================
// Server Component wrapper for /marketplace (browse listings)
// Same SSR-bailout fix as /add-listing: server-rendered fallback so
// users on slow/WhatsApp browsers see real content immediately.
// =====================================================================

import { Suspense } from 'react';
import MarketplaceClient from './MarketplaceClient';
import T from '@/components/T';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export const metadata = {
  title: 'تصفح الإيجارات — مضمونة',
  description: 'تصفح آلاف العقارات والعربيات والمعدات للإيجار في مصر على مضمونة. حماية كاملة، دفع آمن، دعم 24/7.',
};

const CATEGORY_PREVIEW = [
  { slug: 'properties', emoji: '🏠', labelKey: 'cat.properties' },
  { slug: 'vehicles',   emoji: '🚗', labelKey: 'cat.vehicles' },
  { slug: 'workspaces', emoji: '🏢', labelKey: 'cat.workspaces' },
  { slug: 'equipment',  emoji: '🛠', labelKey: 'cat.equipment' },
  { slug: 'media',      emoji: '📷', labelKey: 'cat.media' },
  { slug: 'weddings',   emoji: '💍', labelKey: 'cat.weddings' },
  { slug: 'tourism',    emoji: '🏖', labelKey: 'cat.tourism' },
  { slug: 'recreation', emoji: '🎯', labelKey: 'cat.recreation' },
];

/**
 * Server-rendered HTML shown before client JS hydrates.
 * Same pattern as /add-listing: real content visible to slow browsers.
 */
function MarketplaceFallback() {
  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      <header className="bg-[#1F6F5F] text-[#FAF7F0] px-5 py-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-black mb-1">
            <T k="common.brand" /> <span className="text-[#2FA084]">·</span> <T k="market.title_browse" />
          </h1>
          <p className="text-sm text-[#FAF7F0]/80">
            <T k="market.subtitle" />
          </p>
        </div>
      </header>

      <main className="px-5 py-6 max-w-6xl mx-auto">
        <h2 className="text-lg font-bold mb-4 text-[#1F6F5F]">
          <T k="market.categories" />
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6" aria-hidden>
          {CATEGORY_PREVIEW.map((c) => (
            <div
              key={c.slug}
              className="p-4 rounded-xl bg-white border border-gray-200 flex items-center gap-3 hover:border-[#1F6F5F] transition-colors"
            >
              <span className="text-2xl">{c.emoji}</span>
              <span className="text-[#1F6F5F] font-medium"><T k={c.labelKey} /></span>
            </div>
          ))}
        </div>

        <div className="text-center py-12">
          <div className="inline-block animate-pulse text-gray-400">
            <T k="market.loading" />
          </div>
        </div>

        <noscript>
          <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
            <p className="font-bold mb-1">⚠️ التصفح محتاج JavaScript · Browsing needs JavaScript</p>
            <p className="text-sm">
              لو الصفحة مش بتفتح / If the page doesn't open,{' '}
              <a
                href="https://wa.me/201002229982?text=%D8%B9%D8%A7%D9%8A%D8%B2%20%D8%A3%D8%AA%D9%81%D8%B1%D8%AC%20%D8%B9%D9%84%D9%89%20%D8%A7%D9%84%D8%A5%D9%8A%D8%AC%D8%A7%D8%B1%D8%A7%D8%AA"
                className="underline text-[#1F6F5F] font-bold"
              >
                WhatsApp
              </a>{' '}
              .
            </p>
          </div>
        </noscript>

        <div className="mt-6 text-center">
          <a
            href="/add-listing"
            className="inline-block px-6 py-3 bg-[#2FA084] text-white font-bold rounded-xl hover:bg-[#2FA084]/90 transition-all"
          >
            <T k="market.supplier_cta" />
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
