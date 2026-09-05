// app/marketplace/page.tsx
// =====================================================================
// Server Component wrapper for /marketplace (browse listings)
// Same SSR-bailout fix as /add-listing: server-rendered fallback so
// users on slow/WhatsApp browsers see real content immediately.
// =====================================================================

import { Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import MarketplaceClient from './MarketplaceClient';
// 🌍 (٦/٩/٢٠٢٦) الزائر بيشوف سوق دولته — كوكي اختياره → هيدر Vercel الجغرافي → مصر
import { getVisitorCountry } from '@/lib/visitor-country';
import T from '@/components/T';

// (22 يوليو 2026) SSR لأول دفعة إعلانات — بدل شاشة «جاري التحميل» الفاضية،
// السيرفر بيجيب الإعلانات ويرسمها في الـfallback، فالناس بتشوف إعلانات فوراً
// حتى على الموبايل البطيء/المتصفحات الجوانية قبل ما الـJS يهدرت. الحل الجذري
// لمشكلة «الماركت بيبان فاضي أول فتحة».
type SSRListing = {
  id: string; title: string; slug: string; city: string | null;
  category: { name_ar: string | null; icon: string | null } | null;
  photos: { url: string; is_primary: boolean }[] | null;
};

async function getInitialListings(country: string): Promise<SSRListing[]> {
  try {
    const supa = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    );
    const { data, error } = await supa
      .from('listings')
      .select(`
        id, title, i18n, slug, city, district, rating, reviews_count, status, created_at, requires_id_verification, price_egp,
        category:categories(name_ar, name_en, name_i18n, icon, slug),
        supplier:marketplace_suppliers(id, business_name, logo_url, kyc_status),
        photos:listing_photos(url, is_primary),
        pricing:pricing_rules(price, is_active)
      `)
      .eq('status', 'published')
      .eq('is_directory', false)
      .eq('country', country)
      .order('created_at', { ascending: false })
      .limit(30);
    if (!error && data && data.length) return (data as unknown) as SSRListing[];
    // fallback أمان: لو الكويري الغني فشل (مثلاً عمود ممنوع على anon زي kyc_status)
    // مانرجعش فاضي — نجيب أقل داتا مضمونة للـanon علشان الماركت مايبانش فاضي أبداً.
    if (error) console.error('[marketplace SSR] rich query failed:', error.message);
    const { data: basic } = await supa
      .from('listings')
      .select('id, title, i18n, slug, city, price_egp, category:categories(name_ar, name_en, name_i18n, icon, slug), photos:listing_photos(url, is_primary), pricing:pricing_rules(price, is_active)')
      .eq('status', 'published')
      .eq('is_directory', false)
      .eq('country', country)
      .order('created_at', { ascending: false })
      .limit(30);
    return ((basic || []) as unknown) as SSRListing[];
  } catch (e) {
    console.error('[marketplace SSR] getInitialListings threw:', e);
    return [];
  }
}

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export const metadata = {
  title: 'تصفّح السوق — مضمونة · بيع · إيجار · خدمات · مطاعم',
  description: 'اتصفّح آلاف العروض المضمونة في مصر على مضمونة — بيع وإيجار وخدمات ومطاعم. حماية كاملة، دفع آمن، دعم 24/7.',
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
function MarketplaceFallback({ listings = [] }: { listings?: SSRListing[] }) {
  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      <header className="bg-[#34D399] text-[#FAF7F0] px-5 py-6">
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
        <h2 className="text-lg font-bold mb-4 text-[#059669]">
          <T k="market.categories" />
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6" aria-hidden>
          {CATEGORY_PREVIEW.map((c) => (
            <div
              key={c.slug}
              className="p-4 rounded-xl bg-white border border-gray-200 flex items-center gap-3 hover:border-[#059669] transition-colors"
            >
              <span className="text-2xl">{c.emoji}</span>
              <span className="text-[#059669] font-medium"><T k={c.labelKey} /></span>
            </div>
          ))}
        </div>

        {listings.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {listings.map((l) => {
              const photo = (l.photos || []).find((p) => p.is_primary)?.url || (l.photos || [])[0]?.url || '';
              return (
                <a key={l.id} href={`/marketplace/${l.slug}`} className="block bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-[#059669] transition-colors no-underline">
                  <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center overflow-hidden">
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo} alt={l.title} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <span className="text-4xl">{l.category?.icon || '🛍️'}</span>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="text-[11px] text-gray-500 mb-0.5">{l.category?.name_ar || ''}</div>
                    <div className="font-bold text-sm text-gray-900 leading-snug line-clamp-2">{l.title}</div>
                    {l.city && <div className="text-[11px] text-gray-400 mt-1">{l.city}</div>}
                  </div>
                </a>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="inline-block animate-pulse text-gray-400">
              <T k="market.loading" />
            </div>
          </div>
        )}

        <noscript>
          <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
            <p className="font-bold mb-1">⚠️ التصفح محتاج JavaScript · Browsing needs JavaScript</p>
            <p className="text-sm">
              لو الصفحة مش بتفتح / If the page doesn't open,{' '}
              <a
                href="https://wa.me/201002229982?text=%D8%B9%D8%A7%D9%8A%D8%B2%20%D8%A3%D8%AA%D9%81%D8%B1%D8%AC%20%D8%B9%D9%84%D9%89%20%D8%A7%D9%84%D8%A5%D9%8A%D8%AC%D8%A7%D8%B1%D8%A7%D8%AA"
                className="underline text-[#059669] font-bold"
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

export default async function MarketplacePage() {
  const country = await getVisitorCountry();
  const initialListings = await getInitialListings(country);
  return (
    <Suspense fallback={<MarketplaceFallback listings={initialListings} />}>
      <MarketplaceClient initialListings={(initialListings as unknown) as never} country={country} />
    </Suspense>
  );
}
