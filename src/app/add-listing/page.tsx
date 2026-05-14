// app/add-listing/page.tsx
// =====================================================================
// Server Component wrapper for the /add-listing wizard.
//
// WHY: The wizard itself is a 'use client' component using useSearchParams,
// which causes Next.js SSR to render only a Suspense fallback. If that
// fallback is just "جاري التحميل..." users on slow WhatsApp in-app browsers
// or with broken JS see a blank-looking page and bounce.
//
// FIX: The Suspense fallback here renders a FULL static landing page
// (header + step-1 preview + WhatsApp escape hatch). When client JS loads,
// the AddListingClient replaces it with the interactive wizard. The visual
// transition is seamless because both use the same dark-green theme.
// =====================================================================

import { Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import AddListingClient, { type MainCategory, type BeautySchema } from './AddListingClient';

// Force dynamic rendering so the Suspense fallback is rendered into SSR HTML.
// Without this, Next.js detects useSearchParams() inside AddListingClient and
// bails out to client-side rendering entirely, emitting an empty body that
// WhatsApp's in-app browser cannot recover from.
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export const metadata = {
  title: 'أضف إعلانك في 5 خطوات — مضمونة',
  description:
    'أضف عقارك أو سيارتك أو معداتك على مضمونة في 5 خطوات. مفيش حساب لازم في البداية — هنعملك واحد في الآخر تلقائيًا.',
};

const SAMPLE_CATEGORIES = [
  { emoji: '🏠', label: 'عقارات للإيجار' },
  { emoji: '🚗', label: 'مركبات ونقل' },
  { emoji: '🏢', label: 'مساحات عمل' },
  { emoji: '🏝️', label: 'السياحة' },
  { emoji: '💄', label: 'تجميل' },
  { emoji: '💒', label: 'أعراس وتجهيزات' },
  { emoji: '📷', label: 'معدات ميديا' },
  { emoji: '🎯', label: 'ترفيه ورياضة' },
  { emoji: '⛵', label: 'مركبات بحرية' },
  { emoji: '🚜', label: 'معدات ثقيلة' },
  { emoji: '👨‍💼', label: 'خدمات احترافية' },
];

/**
 * Server-rendered HTML shown before client JS hydrates.
 * Matches the visual identity of the interactive wizard so users on slow
 * connections see a real page, not a "Loading..." placeholder.
 */
function StaticPageFallback() {
  return (
    <div
      dir="rtl"
      lang="ar"
      className="min-h-screen bg-[#1F5F3F] text-[#FAF7F0]"
    >
      <header className="px-5 pt-8 pb-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3" aria-hidden>
              📝
            </div>
            <h1 className="text-2xl md:text-3xl font-black mb-2">
              أضف إعلانك في <span className="text-[#B8860B]">5 خطوات</span>
            </h1>
            <p className="text-[#FAF7F0]/80 text-sm md:text-base">
              ابدأ من غير ما تعمل حساب — هنعملك واحد في الآخر تلقائيًا
            </p>
          </div>

          {/* progress dots */}
          <div className="grid grid-cols-5 gap-1 mb-2" aria-hidden>
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                className={`h-1.5 rounded-full ${n === 1 ? 'bg-[#B8860B]' : 'bg-[#FAF7F0]/15'}`}
              />
            ))}
          </div>
          <p className="text-xs text-[#FAF7F0]/60 text-center">
            الخطوة 1 من 5
          </p>
        </div>
      </header>

      <main className="px-5 pb-8 max-w-2xl mx-auto">
        <h2 className="text-lg font-bold mb-4">إيه اللي عايز تأجره؟ — اختار التصنيف الرئيسي</h2>

        <div className="grid grid-cols-2 gap-3" aria-hidden>
          {SAMPLE_CATEGORIES.map((c, i) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-[#FAF7F0]/5 border border-[#FAF7F0]/15 flex items-center gap-3"
            >
              <span className="text-2xl">{c.emoji}</span>
              <span>{c.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center text-xs text-[#FAF7F0]/50">
          <span className="inline-block animate-pulse">
            جاري تحميل الفورم التفاعلي…
          </span>
        </div>

        {/* JS-disabled escape hatch */}
        <noscript>
          <div className="mt-6 p-4 rounded-xl bg-amber-900/30 border border-amber-700/40">
            <p className="font-bold mb-1">⚠️ الفورم محتاج JavaScript</p>
            <p className="text-sm">
              لو الصفحة مش بتفتح،{' '}
              <a
                href="https://wa.me/201002229982?text=عايز%20أضيف%20إعلان"
                className="underline text-[#B8860B] font-bold"
              >
                كلمنا على واتس
              </a>{' '}
              وهنخلصلك الموضوع.
            </p>
          </div>
        </noscript>

        {/* Hydration-failure escape hatch (visible if JS loads but the
            client wizard fails to render within ~5 seconds) */}
        <div className="mt-4 text-center">
          <a
            href="https://wa.me/201002229982?text=عايز%20أضيف%20إعلان%20والفورم%20مش%20شغال"
            className="inline-block text-xs text-[#FAF7F0]/60 hover:text-[#B8860B] underline"
          >
            عندك مشكلة في تحميل الصفحة؟ كلمنا واتس
          </a>
        </div>
      </main>

      <footer className="px-5 pb-8 mt-4 max-w-2xl mx-auto text-center text-xs text-[#FAF7F0]/50">
        مضمونة — احنا بتوع الإيجار
      </footer>
    </div>
  );
}

// ====================================================================
// DB FETCH (May 14 2026 root-cause fix): any top-level category in the
// categories table that is NOT in the wizard's hardcoded MAIN_CATEGORIES
// list is auto-fetched here and passed to the client as
// `dbExtraCategories`. This means new top-level categories added to the
// DB after deploy will automatically appear at the bottom of the
// wizard's step-1 grid — no code change needed.
// See system_runbook: add_listing_wizard_db_driven_extras.
// ====================================================================
const HARDCODED_TOP_SLUGS = new Set([
  'properties', 'vehicles', 'workspaces', 'tourism', 'beauty',
  'weddings', 'media', 'recreation', 'marine', 'equipment',
  'printing', 'professionals',
]);

async function getDBExtraCategories(): Promise<MainCategory[]> {
  try {
    const { data: tops, error: topsErr } = await supabase
      .from('categories')
      .select('id, slug, name_ar, icon, display_order')
      .is('parent_id', null)
      .eq('is_active', true)
      .order('display_order');
    if (topsErr || !tops?.length) return [];

    const extras = tops.filter((t) => !HARDCODED_TOP_SLUGS.has(t.slug));
    if (!extras.length) return [];

    const { data: allSubs } = await supabase
      .from('categories')
      .select('id, slug, name_ar, icon, parent_id, display_order')
      .in('parent_id', extras.map((t) => t.id))
      .eq('is_active', true)
      .order('display_order');

    return extras.map((top) => ({
      slug: top.slug,
      name_ar: top.name_ar,
      emoji: top.icon || '📁',
      subs: (allSubs || [])
        .filter((s) => s.parent_id === top.id)
        .map((s) => ({
          slug: s.slug,
          name_ar: s.name_ar,
          emoji: s.icon || '📁',
        })),
    }));
  } catch (e) {
    console.warn('[add-listing] Failed to load DB-only top-level categories:', e);
    return [];
  }
}

// ====================================================================
// BEAUTY SCHEMAS: each beauty sub-category has an attribute_schema in
// the DB containing { price_unit, suggested_addons[] }. We fetch them
// all here so the wizard's pricing step can adapt to beauty UX:
//   - period selector shows per_service / per_session / per_package
//   - add-ons section appears below the base price with editable list
// ====================================================================
const BEAUTY_SUB_SLUGS_FOR_FETCH = [
  'bridal-beauty', 'makeup-artists', 'hair-stylists', 'nail-care',
  'skincare-facial', 'brows-lashes', 'hair-removal', 'massage-spa',
];

async function getBeautySchemas(): Promise<Record<string, BeautySchema>> {
  try {
    const { data } = await supabase
      .from('categories')
      .select('slug, attribute_schema')
      .in('slug', BEAUTY_SUB_SLUGS_FOR_FETCH);
    if (!data) return {};
    const result: Record<string, BeautySchema> = {};
    for (const row of data) {
      const schema = row.attribute_schema as BeautySchema | null;
      if (schema && schema.price_unit && Array.isArray(schema.suggested_addons)) {
        result[row.slug] = schema;
      }
    }
    return result;
  } catch (e) {
    console.warn('[add-listing] Failed to load beauty schemas:', e);
    return {};
  }
}

export default async function AddListingPage() {
  const [dbExtraCategories, beautySchemas] = await Promise.all([
    getDBExtraCategories(),
    getBeautySchemas(),
  ]);

  return (
    <Suspense fallback={<StaticPageFallback />}>
      <AddListingClient
        dbExtraCategories={dbExtraCategories}
        beautySchemas={beautySchemas}
      />
    </Suspense>
  );
}
