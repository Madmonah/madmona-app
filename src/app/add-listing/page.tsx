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
  { emoji: '🛍️', label: 'منتجات للبيع' },
  { emoji: '🏠', label: 'عقارات' },
  { emoji: '🚗', label: 'مركبات' },
  { emoji: '🍔', label: 'مطاعم وكافيهات' },
  { emoji: '🛠️', label: 'خدمات منزلية' },
  { emoji: '💄', label: 'تجميل' },
  { emoji: '🎓', label: 'تعليم وكورسات' },
  { emoji: '🏛️', label: 'قاعات ومناسبات' },
];

/**
 * Server-rendered HTML shown before client JS hydrates.
 *
 * 🐞 (٦ أغسطس ٢٠٢٦ — بلاغ محمد: «خانة ضيف بتفتح التصميم القديم الأخضر الأول»)
 *    الفولباك ده كان لسه بالثيم الأخضر الغامق القديم (`bg-[#1F6F5F]`) بينما
 *    الويزارد نفسه (AddListingClient) اتعمله ريديزاين لثيم فاتح
 *    (`bg-[#FAFAF7]` / `text-[#1A2E26]`). النتيجة: المستخدم يشوف صفحة خضرا
 *    غامقة الأول وبعدين تتقلب فاتحة لما الـJS يحمّل — «فلاش» واضح ومزعج.
 *
 *    دلوقتي الفولباك بيطابق التصميم الجديد **بالظبط** (نفس الخلفية والهيدر
 *    والعنوان وشريط التقدم)، فالانتقال بقى غير مرئي.
 *
 * ⚠️ قاعدة: أي تغيير في شكل هيدر `AddListingClient` لازم ينعكس هنا،
 *    وإلا الفلاش هيرجع تاني.
 */
function StaticPageFallback() {
  return (
    <div
      dir="rtl"
      lang="ar"
      className="min-h-screen bg-[#FAFAF7] text-[#1A2E26]"
    >
      {/* هيدر مطابق للويزارد */}
      <header className="px-5 pt-6 pb-4 border-b border-[#E5E5E0]">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold tracking-tight">مضمونة</div>
            <span className="text-xs text-[#1F6F5F] uppercase tracking-widest">MADMONA</span>
          </div>
          <a href="/" className="text-xs text-gray-600 no-underline">
            ← الرئيسية
          </a>
        </div>
        <h1 className="text-xl font-semibold mt-5 max-w-2xl mx-auto">
          ضيف منتجك في 60 ثانية
        </h1>
        <p className="text-sm text-gray-600 mt-1 max-w-2xl mx-auto">
          خطوة واحدة من 5 — مش لازم تعمل حساب دلوقتي
        </p>

        {/* شريط التقدم — نفس مقاسات الويزارد (الخطوة 1 = 20%) */}
        <div className="mt-4 max-w-2xl mx-auto">
          <div className="h-1 bg-[#F5F4F0] rounded-full overflow-hidden">
            <div className="h-full bg-[#1F6F5F]" style={{ width: '20%' }} />
          </div>
          <div className="text-xs text-gray-500 mt-2 text-center">
            خطوة 1 من 5
          </div>
        </div>
      </header>

      <main className="px-5 py-6 pb-8 max-w-2xl mx-auto">
        <h2 className="text-lg font-semibold mb-4">إيه اللي عايز تضيفه؟</h2>

        <div className="grid grid-cols-2 gap-3" aria-hidden>
          {SAMPLE_CATEGORIES.map((c, i) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-white border border-[#E5E5E0] flex items-center gap-3"
            >
              <span className="text-2xl">{c.emoji}</span>
              <span className="text-sm">{c.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center text-xs text-gray-400">
          <span className="inline-block animate-pulse">جاري التحميل…</span>
        </div>

        {/* مخرج الطوارئ لو الـJS مقفول */}
        <noscript>
          <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-[#1A2E26]">
            <p className="font-bold mb-1">⚠️ الفورم محتاج JavaScript</p>
            <p className="text-sm">
              لو الصفحة مش بتفتح،{' '}
              <a
                href="https://wa.me/201002229982?text=عايز%20أضيف%20إعلان"
                className="underline text-[#1F6F5F] font-bold"
              >
                كلمنا على واتس
              </a>{' '}
              وهنخلصلك الموضوع.
            </p>
          </div>
        </noscript>

        {/* مخرج لو الـJS حمّل بس الويزارد فشل */}
        <div className="mt-4 text-center">
          <a
            href="https://wa.me/201002229982?text=عايز%20أضيف%20إعلان%20والفورم%20مش%20شغال"
            className="inline-block text-xs text-gray-500 hover:text-[#1F6F5F] underline"
          >
            عندك مشكلة في تحميل الصفحة؟ كلمنا واتس
          </a>
        </div>
      </main>

      <footer className="px-5 pb-8 mt-4 max-w-2xl mx-auto text-center text-xs text-gray-400">
        مضمونة — معاملاتك مضمونة
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
    // Phase E + G (May 18 2026): wizard metadata + grouping columns.
    // group_* fields enable visual grouping in StepCategory and marketplace.
    // Null/missing values → client falls back to flat rendering.
    const WIZARD_META_COLS = 'id, slug, name_ar, icon, track, display_order, title_placeholder, description_placeholder, district_placeholder, allowed_pricing_periods, default_pricing_period, pricing_unit_label, group_slug, group_name_ar, group_emoji, group_display_order';

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
        group_slug: (top as { group_slug?: string | null }).group_slug ?? null,
        group_name_ar: (top as { group_name_ar?: string | null }).group_name_ar ?? null,
        group_emoji: (top as { group_emoji?: string | null }).group_emoji ?? null,
        group_display_order: (top as { group_display_order?: number | null }).group_display_order ?? null,
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
