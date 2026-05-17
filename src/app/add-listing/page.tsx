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
      className="min-h-screen bg-[#1F6F5F] text-[#FAF7F0]"
    >
      <header className="px-5 pt-8 pb-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3" aria-hidden>
              📝
            </div>
            <h1 className="text-2xl md:text-3xl font-black mb-2">
              أضف إعلانك في <span className="text-[#2FA084]">5 خطوات</span>
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
                className={`h-1.5 rounded-full ${n === 1 ? 'bg-[#2FA084]' : 'bg-[#FAF7F0]/15'}`}
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
                className="underline text-[#2FA084] font-bold"
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
            className="inline-block text-xs text-[#FAF7F0]/60 hover:text-[#2FA084] underline"
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
// DB FETCH (May 17 2026 root-cause fix): the wizard is now fully
// DB-driven. ALL active top-level categories are fetched here and
// passed to the client as `dbExtraCategories` (legacy prop name kept
// to avoid breaking the client signature — semantically it's now "all"
// categories, not just extras). The hardcoded MAIN_CATEGORIES array in
// AddListingClient.tsx has been removed.
//
// Cross-listing: subs with a non-empty `also_show_in` array appear under
// multiple mains' subs lists. This preserves the discoverability we had
// when the wizard manually duplicated subs (e.g. makeup-artists under
// workspaces + beauty + professionals) — now driven from DB instead.
//
// See system_runbook: categories_db_driven_consolidation_may17.
// ====================================================================
async function getDBExtraCategories(): Promise<MainCategory[]> {
  try {
    // Phase E (May 18 2026): wizard metadata columns added — read them here
    // so the client can use category-specific placeholders + pricing periods
    // instead of hardcoded values. Null/missing values → client falls back to
    // existing hardcoded defaults (zero-regression guarantee).
    const WIZARD_META_COLS = 'id, slug, name_ar, icon, track, display_order, title_placeholder, description_placeholder, district_placeholder, allowed_pricing_periods, default_pricing_period, pricing_unit_label';

    const { data: tops, error: topsErr } = await supabase
      .from('categories')
      .select(WIZARD_META_COLS)
      .is('parent_id', null)
      .eq('is_active', true)
      .order('display_order');
    if (topsErr || !tops?.length) return [];

    const { data: allSubs } = await supabase
      .from('categories')
      .select(WIZARD_META_COLS + ', parent_id, also_show_in')
      .in('parent_id', tops.map((t) => t.id))
      .eq('is_active', true)
      .order('display_order');

    type WizardMetaRow = {
      title_placeholder: string | null;
      description_placeholder: string | null;
      district_placeholder: string | null;
      allowed_pricing_periods: string[] | null;
      default_pricing_period: string | null;
      pricing_unit_label: string | null;
    };
    type SubRow = WizardMetaRow & {
      id: string;
      slug: string;
      name_ar: string;
      icon: string | null;
      parent_id: string;
      also_show_in: string[] | null;
    };
    const subs = (allSubs || []) as SubRow[];

    return tops.map((top) => {
      const topMeta = top as unknown as WizardMetaRow;
      // Subs whose primary parent IS this main, OR who list this main in also_show_in.
      const matchingSubs = subs.filter(
        (s) =>
          s.parent_id === top.id ||
          (Array.isArray(s.also_show_in) && s.also_show_in.includes(top.id)),
      );
      return {
        slug: top.slug,
        name_ar: top.name_ar,
        emoji: top.icon || '📁',
        track: (top.track as 'rentals' | 'services' | 'hybrid' | null) || null,
        title_placeholder: topMeta.title_placeholder ?? null,
        description_placeholder: topMeta.description_placeholder ?? null,
        district_placeholder: topMeta.district_placeholder ?? null,
        allowed_pricing_periods: topMeta.allowed_pricing_periods ?? null,
        default_pricing_period: topMeta.default_pricing_period ?? null,
        pricing_unit_label: topMeta.pricing_unit_label ?? null,
        subs: matchingSubs.map((s) => ({
          slug: s.slug,
          name_ar: s.name_ar,
          emoji: s.icon || '📁',
          title_placeholder: s.title_placeholder ?? null,
          description_placeholder: s.description_placeholder ?? null,
          district_placeholder: s.district_placeholder ?? null,
          allowed_pricing_periods: s.allowed_pricing_periods ?? null,
          default_pricing_period: s.default_pricing_period ?? null,
          pricing_unit_label: s.pricing_unit_label ?? null,
        })),
      };
    });
  } catch (e) {
    console.warn('[add-listing] Failed to load categories from DB:', e);
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
