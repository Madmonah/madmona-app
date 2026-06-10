'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

// ============================================================================
// Madmona "Add Listing First" — public, no-auth multi-step form
// Brand: deep green (#1F6F5F), gold (#2FA084), ivory (#FAF7F0)
//
// FIX (May 13 2026): Consolidated 2 racing useEffects into 1, removed the
// step-rollback bug that was bouncing users back to step 1 after their
// first POST, and tightened the merge logic so DB hydration never clobbers
// user typing. See system_runbook entry: add_listing_wizard_data_loss.
// ============================================================================

type Step = 1 | 2 | 3 | 4 | 5;

// Phase E (May 18 2026): wizard metadata for DB-driven placeholders & pricing.
// These fields come from categories.title_placeholder etc. When null/undefined
// the wizard falls back to hardcoded defaults — zero-regression guarantee.
type WizardMeta = {
  title_placeholder?: string | null;
  description_placeholder?: string | null;
  district_placeholder?: string | null;
  allowed_pricing_periods?: string[] | null;
  default_pricing_period?: string | null;
  pricing_unit_label?: string | null;
};

type SubCategory = {
  slug: string;
  name_ar: string;
  emoji: string;
} & WizardMeta;

export type MainCategory = {
  slug: string;
  name_ar: string;
  emoji: string;
  track?: 'rentals' | 'services' | 'hybrid' | 'restaurants' | 'products' | null;
  subs: SubCategory[];
  // Phase G (May 18 2026): group metadata for visual grouping in StepCategory.
  // When null, the wizard falls back to flat rendering (zero-regression).
  group_slug?: string | null;
  group_name_ar?: string | null;
  group_emoji?: string | null;
  group_display_order?: number | null;
} & WizardMeta;

// Resolve effective wizard metadata for a category slug, with fallback chain:
//   sub-level value → main-level value → null (caller uses hardcoded default)
function getCategoryWizardMeta(
  categorySlug: string | undefined | null,
  categories: MainCategory[],
): WizardMeta {
  if (!categorySlug) return {};
  // Try sub first (more specific)
  for (const main of categories) {
    const sub = main.subs.find((s) => s.slug === categorySlug);
    if (sub) {
      return {
        title_placeholder: sub.title_placeholder ?? main.title_placeholder ?? null,
        description_placeholder: sub.description_placeholder ?? main.description_placeholder ?? null,
        district_placeholder: sub.district_placeholder ?? main.district_placeholder ?? null,
        allowed_pricing_periods: sub.allowed_pricing_periods ?? main.allowed_pricing_periods ?? null,
        default_pricing_period: sub.default_pricing_period ?? main.default_pricing_period ?? null,
        pricing_unit_label: sub.pricing_unit_label ?? main.pricing_unit_label ?? null,
      };
    }
  }
  // Fallback to main-level if user selected a main directly
  const main = categories.find((m) => m.slug === categorySlug);
  if (main) {
    return {
      title_placeholder: main.title_placeholder ?? null,
      description_placeholder: main.description_placeholder ?? null,
      district_placeholder: main.district_placeholder ?? null,
      allowed_pricing_periods: main.allowed_pricing_periods ?? null,
      default_pricing_period: main.default_pricing_period ?? null,
      pricing_unit_label: main.pricing_unit_label ?? null,
    };
  }
  return {};
}

// Phase Y2 (May 18 2026): resolve the effective TRACK for a selected category
// slug (whether the user picked a main or a sub). Used by StepPricing to
// switch copy between rental prompts ("حضرتك بتأجره بكام") vs service
// prompts ("بكام بتقدم الخدمة") and to decide whether to show the optional
// add-ons builder. Subs don't carry track in MainCategory; we resolve via
// the parent main.
function getCategoryTrack(
  categorySlug: string | undefined | null,
  categories: MainCategory[],
): 'rentals' | 'services' | 'hybrid' | 'restaurants' | 'products' | null {
  if (!categorySlug) return null;
  const asMain = categories.find((m) => m.slug === categorySlug);
  if (asMain) return asMain.track ?? null;
  for (const main of categories) {
    if (main.subs.some((s) => s.slug === categorySlug)) {
      return main.track ?? null;
    }
  }
  return null;
}

// ============================================================================
// BEAUTY TYPES + HELPERS (May 14 2026)
// Beauty categories use a different pricing model (per service / per session /
// per package) and offer suggested add-ons defined per sub-category in the DB
// attribute_schema. The wizard's StepPricing reads these and renders a
// beauty-specific UI when the selected category is beauty or a beauty sub.
// ============================================================================
// MENU ITEMS + PRODUCT DETAILS TYPES (May 29 2026)
// Restaurants store an array of menu items in draft.attributes.menu_items.
// On submission, these become restaurant_menu_items rows.
// Products use additional fields in draft.attributes for condition/brand/etc;
// the main selling price still lives in draft.price (so existing pricing
// validation — "price > 0" — still works).
export type MenuItem = {
  name_ar: string;
  price: number;
  description_ar?: string;
  photo_url?: string;
  is_available: boolean;
};

export type ProductCondition = 'new' | 'used_like_new' | 'used_good' | 'refurbished';

export type ProductDetails = {
  stock_quantity: number;
  condition: ProductCondition;
  brand?: string;
  model?: string;
  shipping_available: boolean;
  shipping_cost?: number;
  // Task 8 (May 30 2026): made-to-order (تحت التصنيع)
  availability_type?: 'ready' | 'made_to_order';
  made_to_order_lead_days?: number;
  made_to_order_deposit_pct?: number;
  made_to_order_customizable?: boolean;
};

// WHOLESALE TIERS (May 30 2026 — Task 5)
// Suppliers can offer bulk-pricing units (e.g. "دستة 12 = 216 جنيه" =
// 18ج/وحدة). Saved to draft.attributes.wholesale_tiers and mapped to
// listings.wholesale_tiers jsonb on publish.
export type WholesaleTier = {
  unit: string;            // e.g. "دستة", "كرتونة", "شيكارة"
  qty: number;             // e.g. 12
  price_per_unit: number;  // e.g. 18 (جنيه/وحدة)
  total?: number;          // computed: qty * price_per_unit
};

// MEDICAL/CLINIC SLUGS — Task 6 (May 30 2026)
// Categories that can opt-in to accepting health insurance partners.
// The wizard renders an extra section in StepPricing for these slugs.
const MEDICAL_SLUGS = new Set([
  'medical-clinics',
  'medical-consultants',
  'physiotherapy',
  'properties-clinics',
]);
function isMedicalCategory(
  slug: string | null | undefined,
  categories: MainCategory[],
): boolean {
  if (!slug) return false;
  if (MEDICAL_SLUGS.has(slug)) return true;
  for (const main of categories) {
    if (MEDICAL_SLUGS.has(main.slug) && main.subs.some((s) => s.slug === slug)) {
      return true;
    }
  }
  return false;
}

export type AddonSuggestion = {
  slug: string;
  name_ar: string;
  emoji?: string;
  default_price_egp: number;
};

export type Addon = {
  slug: string;
  name_ar: string;
  emoji?: string;
  price_egp: number;
};

export type BeautyPriceUnit = 'per_service' | 'per_session' | 'per_package';

export type BeautySchema = {
  price_unit: BeautyPriceUnit;
  suggested_addons: AddonSuggestion[];
};

const BEAUTY_SUB_SLUGS = new Set([
  'bridal-beauty', 'makeup-artists', 'hair-stylists', 'nail-care',
  'skincare-facial', 'brows-lashes', 'hair-removal', 'massage-spa',
]);

function isBeautyCategory(slug?: string | null): boolean {
  return !!slug && (slug === 'beauty' || BEAUTY_SUB_SLUGS.has(slug));
}

// MAIN_CATEGORIES removed (May 17 2026): all categories are now loaded
// from the DB via getDBExtraCategories in page.tsx. The wizard is fully
// DB-driven. Cross-listing (a sub appearing under multiple mains) is
// handled via the categories.also_show_in column.
// See system_runbook: categories_db_driven_consolidation_may17.

const CITIES = [
  'القاهرة', 'الجيزة', 'الإسكندرية', 'الساحل الشمالي',
  'العين السخنة', 'رأس الحكمة', 'الغردقة', 'شرم الشيخ',
  'مرسى علم', 'دهب', 'الأقصر', 'أسوان',
  'المنصورة', 'طنطا', 'بورسعيد', 'الإسماعيلية', 'السويس',
  'دمياط', 'الزقازيق', 'الفيوم', 'بني سويف', 'المنيا', 'أسيوط',
  'سوهاج', 'قنا', 'العاشر من رمضان', 'مدينة 6 أكتوبر',
];

interface DraftPayload {
  claim_token?: string;
  category_slug?: string;
  title?: string;
  description?: string;
  city?: string;
  district?: string;
  price?: number;
  price_period?: string;
  photos?: { url: string; caption?: string }[];
  contact_name?: string;
  contact_phone?: string;
  account_type?: 'individual' | 'business';
  business_name?: string;
  current_step?: number;
  status?: string;
  source?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  attributes?: Record<string, unknown> & {
    addons?: Addon[];
    menu_items?: MenuItem[];
    product_details?: ProductDetails;
    wholesale_tiers?: WholesaleTier[];
    accepts_insurance?: boolean;
    insurance_partners?: string[];
    insurance_deposit_pct?: number;
    branches?: { name?: string; city?: string; address?: string; phone?: string }[];
  };
}

// Treat "(جاري التحرير)" as no real title so it doesn't show up in form fields
const PLACEHOLDER_TITLE = '(جاري التحرير)';

export default function AddListingClient({
  dbExtraCategories = [],
  beautySchemas = {},
}: {
  dbExtraCategories?: MainCategory[];
  beautySchemas?: Record<string, BeautySchema>;
} = {}) {
  return (
    <Suspense fallback={null}>
      <AddListingPageInner
        dbExtraCategories={dbExtraCategories}
        beautySchemas={beautySchemas}
      />
    </Suspense>
  );
}

function AddListingPageInner({
  dbExtraCategories,
  beautySchemas,
}: {
  dbExtraCategories: MainCategory[];
  beautySchemas: Record<string, BeautySchema>;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const [step, setStep] = useState<Step>(1);
  const [draft, setDraft] = useState<DraftPayload>({ source: 'whatsapp_link' });
  const [token, setToken] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // FIX (May 29 2026): pendingResume banner — was bouncing users straight
  // into Step N from localStorage with no chance to start fresh. Now we
  // detect a saved draft, but stay on Step 1 and show a banner letting
  // the user choose: resume where they left off, or start a new listing.
  // Mohamed's complaint: "msh sha3'al bardo, fa7'ar el page byraga3ni l
  // mokawalat we mfish category picker".
  const [pendingResume, setPendingResume] = useState<{ step: Step; categorySlug?: string } | null>(null);

  // Phase G+ (May 18 2026): tracks "تغيير الفئة" clicks. When this changes,
  // StepCategory resets to mains view (instead of resuming at the sub-list of
  // the previously selected main — which was the bug Mohamed reported:
  // "لو دوست بالغلط على شاليه وحبيت ارجع لشقة مش بعرف").
  const [resetCategoryView, setResetCategoryView] = useState(0);

  // Tracks whether we've already done the initial mount hydration.
  // Prevents the rehydrate-from-DB logic from running again later when
  // token state changes due to our own POST (which is what was causing
  // the step-rollback bug previously).
  const hydratedRef = useRef(false);

  // ──────────────────────────────────────────────────────────────────
  // INITIAL HYDRATION (runs ONCE on mount only)
  //
  // Reads URL params (UTM, phone hint, category hint, ?token=...) and
  // localStorage for a resume token. If a token is present, fetches the
  // draft from the API and pre-fills the wizard at the right step.
  //
  // After this, draft state is owned by the user's typing + our persist()
  // function. We never refetch from the DB and override local state.
  // ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    const phone = params.get('phone') || params.get('p') || undefined;
    const utm_source = params.get('utm_source') || undefined;
    const utm_medium = params.get('utm_medium') || undefined;
    const utm_campaign = params.get('utm_campaign') || undefined;
    const cat = params.get('cat') || undefined;
    const urlToken = params.get('token');

    // Token priority: URL > localStorage
    let activeToken: string | null = urlToken;
    if (!activeToken && typeof window !== 'undefined') {
      try { activeToken = window.localStorage.getItem('madmona_draft_token'); } catch {}
    }

    // Seed from URL/localStorage synchronously
    setDraft(prev => ({
      ...prev,
      contact_phone: phone || prev.contact_phone,
      category_slug: cat || prev.category_slug,
      utm_source: utm_source || prev.utm_source,
      utm_medium: utm_medium || prev.utm_medium,
      utm_campaign: utm_campaign || prev.utm_campaign,
    }));

    if (!activeToken) return;
    setToken(activeToken);

    // Hydrate from DB — this is the ONLY place we fetch and merge.
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/listing-drafts?token=${activeToken}`);
        const json = await res.json();
        if (cancelled) return;

        if (!res.ok || !json.success || !json.draft) {
          // Stale token (deleted/expired). Clear it.
          if (typeof window !== 'undefined') {
            try { window.localStorage.removeItem('madmona_draft_token'); } catch {}
          }
          setToken(null);
          return;
        }

        const d = json.draft;

        // Conservative merge: DB values fill in MISSING local fields only.
        // This protects against clobbering anything the user has already
        // typed (though on initial mount they haven't typed anything yet,
        // so practically this is equivalent to taking DB values).
        setDraft(prev => ({
          ...prev,
          claim_token: activeToken,
          category_slug:  prev.category_slug   ?? (d.category_slug || undefined),
          title:          prev.title           ?? (d.title && d.title !== PLACEHOLDER_TITLE ? d.title : undefined),
          description:    prev.description     ?? (d.description || undefined),
          city:           prev.city            ?? (d.city || undefined),
          district:       prev.district        ?? (d.district || undefined),
          price:          prev.price           ?? (d.price ?? undefined),
          price_period:   prev.price_period    ?? (d.price_period || undefined),
          photos:         prev.photos          ?? (d.photos || undefined),
          contact_name:   prev.contact_name    ?? (d.contact_name || undefined),
          contact_phone:  prev.contact_phone   ?? (d.contact_phone || undefined),
          account_type:   prev.account_type    ?? (d.account_type || undefined),
          business_name:  prev.business_name   ?? (d.business_name || undefined),
          // Phase F (May 18 2026): hydrate category-specific attribute values
          // so user doesn't lose them on resume/refresh.
          attributes:     prev.attributes      ?? (d.attributes || undefined),
        }));

        // Resume at the right step — but only if the DB has enough data
        // for that step to make sense. We DO NOT rewind further than the
        // user's last completed step.
        // CRITICAL FIX (May 13 2026): rewind logic now applies to step 5 too.
        // Old chain used `else if` so step 5 returning without data fell through.
        //
        // FIX (May 29 2026): instead of jumping the user into the resumed
        // step silently, store it in pendingResume and stay on Step 1.
        // A banner in Step 1 then lets the user explicitly choose to
        // resume or to start fresh (which clears the draft + token).
        // EXCEPT when the user is following a ?token=... resume link
        // (urlToken truthy) — in that case, do the silent resume because
        // they explicitly clicked a "continue" link.
        if (typeof d.current_step === 'number' && d.current_step >= 1 && d.current_step <= 5) {
          let resumeStep = d.current_step as Step;
          // Cascade rewind — each check independent so step 5 with no title still goes back to step 2.
          if (resumeStep >= 4 && (!d.price || d.price <= 0)) resumeStep = 3;
          if (resumeStep >= 3 && (!d.title || d.title === PLACEHOLDER_TITLE || !d.city)) resumeStep = 2;
          if (resumeStep >= 2 && !d.category_slug) resumeStep = 1;
          if (urlToken) {
            // Explicit resume link — honor it.
            setStep(resumeStep);
          } else if (resumeStep >= 2) {
            // Auto-resumed from localStorage. Stay on Step 1 and surface
            // the banner so the user can decide. Step 1 doesn't need a
            // banner (nothing meaningful to resume).
            setPendingResume({ step: resumeStep, categorySlug: d.category_slug || undefined });
          }
        }
      } catch (e) {
        // Network glitch — proceed with empty draft, persist() will reconnect
        console.warn('Failed to hydrate draft from DB:', e);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← intentionally empty: hydration is a one-time-on-mount concern.

  // ──────────────────────────────────────────────────────────────────
  // PERSIST: send the current draft state to the API.
  //
  // - First call (no token): POST → creates draft, returns token.
  // - Subsequent calls: PATCH → updates draft.
  //
  // We trust local state. The response token is stored, but we do NOT
  // re-fetch the draft body — that's what caused the data-loss race in
  // the previous version of this component.
  // ──────────────────────────────────────────────────────────────────
  async function persist(patch: Partial<DraftPayload>): Promise<string | null> {
    setSaving(true);
    try {
      const body = { ...draft, ...patch, current_step: step };
      const res = await fetch('/api/listing-drafts' + (token ? `?token=${token}` : ''), {
        method: token ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setErrors({ form: json.error || 'حصل خطأ، حاول تاني' });
        return null;
      }
      const newToken: string | null = json.token || token || null;
      if (newToken && !token) {
        setToken(newToken);
        if (typeof window !== 'undefined') {
          try { window.localStorage.setItem('madmona_draft_token', newToken); } catch {}
        }
      }
      // Keep accumulating local state with whatever was just sent.
      setDraft({ ...body, claim_token: newToken || undefined });
      return newToken;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'حصل خطأ، حاول تاني';
      setErrors({ form: msg });
      return null;
    } finally {
      setSaving(false);
    }
  }

  function next() {
    setErrors({});
    if (step < 5) setStep((s) => (s + 1) as Step);
  }
  function back() {
    setErrors({});
    if (step > 1) setStep((s) => (s - 1) as Step);
  }

  // FIX (May 29 2026): resume/discard handlers for the pendingResume banner.
  function resumeDraft() {
    if (!pendingResume) return;
    setStep(pendingResume.step);
    setPendingResume(null);
  }
  function discardDraft() {
    // Clear local resume state + DB-linked token so a fresh wizard starts.
    if (typeof window !== 'undefined') {
      try { window.localStorage.removeItem('madmona_draft_token'); } catch {}
    }
    setToken(null);
    setDraft({ source: 'whatsapp_link' });
    setPendingResume(null);
    setStep(1);
    setErrors({});
    setResetCategoryView((n) => n + 1);
  }

  const progress = (step / 5) * 100;

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-[#FAFAF7] text-[#1A2E26]">
      {/* Header */}
      <header className="px-5 pt-6 pb-4 border-b border-[#E5E5E0]">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold tracking-tight">مضمونة</div>
            <span className="text-xs text-[#1F6F5F] uppercase tracking-widest">MADMONA</span>
          </div>
          <a href="/" className="text-xs text-gray-600 hover:text-[#1A2E26]">
            ← الرئيسية
          </a>
        </div>
        <h1 className="text-xl font-semibold mt-5 max-w-2xl mx-auto">
          ضيف ليستنجك في 60 ثانية
        </h1>
        <p className="text-sm text-gray-600 mt-1 max-w-2xl mx-auto">
          خطوة واحدة من 5 — مش لازم تعمل حساب دلوقتي
        </p>

        {/* Progress bar */}
        <div className="mt-4 max-w-2xl mx-auto">
          <div className="h-1 bg-[#F5F4F0] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1F6F5F] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-2 text-center">
            خطوة {step} من 5
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="px-5 py-8 max-w-2xl mx-auto">
        {errors.form && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm">
            {errors.form}
          </div>
        )}

        {/* FIX (May 29 2026): saved-draft resume banner. Only shows on Step 1
            when the user landed on /add-listing without a ?token (i.e. fresh
            navigation) but localStorage still had a token from a previous
            session. Lets them explicitly resume or start fresh. */}
        {pendingResume && step === 1 && (
          <ResumeDraftBanner
            pendingStep={pendingResume.step}
            categorySlug={pendingResume.categorySlug}
            categories={dbExtraCategories}
            onResume={resumeDraft}
            onDiscard={discardDraft}
          />
        )}

        {step === 1 && (
          <StepCategory
            value={draft.category_slug}
            categories={dbExtraCategories}
            resetSignal={resetCategoryView}
            onSelect={async (slug) => {
              // CRITICAL FIX (May 13 2026): only advance if persist actually succeeded.
              const t = await persist({ category_slug: slug });
              if (t) next();
            }}
          />
        )}

        {step === 2 && (
          <StepBasics
            draft={draft}
            errors={errors}
            setErrors={setErrors}
            categories={dbExtraCategories}
            onSubmit={async (patch) => {
              // Phase F (May 18 2026): validation moved INTO StepBasics so it
              // can also enforce required category-specific attributes.
              // Parent only persists + advances when child says patch is ready.
              const t = await persist(patch);
              if (t) next();
            }}
            onBack={back}
            onChangeCategory={() => {
              // Phase G+ (May 18 2026): explicit category change should land
              // on the mains list, not the sub list of the previous selection.
              setResetCategoryView((n) => n + 1);
              setStep(1);
            }}
            saving={saving}
          />
        )}

        {step === 3 && (
          <StepPricing
            draft={draft}
            errors={errors}
            categories={dbExtraCategories}
            token={token}
            beautySchemas={beautySchemas}
            onSubmit={async (patch) => {
              if (!patch.price || patch.price <= 0) {
                setErrors({ price: 'حط سعر صحيح من فضلك' });
                return;
              }
              // CRITICAL FIX (May 13 2026): only advance if persist actually succeeded.
              const t = await persist(patch);
              if (t) next();
            }}
            onBack={back}
            onChangeCategory={() => {
              setResetCategoryView((n) => n + 1);
              setStep(1);
            }}
            saving={saving}
          />
        )}

        {step === 4 && (
          <StepPhotos
            draft={draft}
            token={token}
            onSubmit={async (photos) => {
              // CRITICAL FIX (May 13 2026): only advance if persist actually succeeded.
              const t = await persist({ photos });
              if (t) next();
            }}
            onUpload={async (photos) => {
              // AUTO-SAVE (May 13 2026 fix for photo data-loss):
              // محمد طاهر complaint: "رفعت الصور مرات كتير، فيه مشكلة عندكم"
              // Root cause: local component state held the uploaded photos
              // but draft.photos in DB stayed empty until user clicked Continue.
              // If they closed the page or refreshed first, photos were lost.
              // Now every successful upload persists immediately — no
              // Continue click needed for the photos to survive.
              await persist({ photos });
            }}
            onBack={back}
            saving={saving}
          />
        )}

        {step === 5 && (
          <StepContact
            draft={draft}
            errors={errors}
            onSubmit={async (patch) => {
              const ok = validateContact(patch, setErrors);
              if (!ok) return;
              const t = await persist({ ...patch, status: 'submitted' });
              if (t) {
                // NOTE: we do NOT clear localStorage here. That used to cause
                // duplicate drafts on accidental return visits. The success
                // page now clears it after a short delay (or on signup).
                router.push(`/add-listing/success?token=${t}`);
              }
            }}
            onBack={back}
            saving={saving}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="px-5 pb-8 mt-4 max-w-2xl mx-auto text-center text-xs text-gray-500">
        🛡 حماية كاملة • 💰 دفع سريع • 📞 دعم 24/7 • عمولة 10% (5% للشركات)
      </footer>
    </div>
  );
}

// =================================================
// STEP 1 — CATEGORY (with track tabs for hierarchy)
// May 17 2026: Added track tabs (الكل/إيجار/خدمات/هايبرد) above the mains
// grid so 27 categories don't overwhelm the user. Same DB, cleaner UX.
// =================================================
type TrackTab = 'all' | 'rentals' | 'services' | 'hybrid' | 'restaurants' | 'products';

const TRACK_LABELS: Record<TrackTab, string> = {
  all: 'الكل',
  rentals: 'إيجار',
  services: 'خدمات',
  hybrid: 'هايبرد',
  restaurants: 'مطاعم',
  products: 'منتجات',
};

const TRACK_EMOJI: Record<TrackTab, string> = {
  all: '✨',
  rentals: '🏠',
  services: '🛠️',
  hybrid: '💒',
  restaurants: '🍔',
  products: '🛍️',
};

function StepCategory({
  value,
  onSelect,
  categories,
  resetSignal = 0,
}: {
  value?: string;
  onSelect: (slug: string) => void;
  categories: MainCategory[];
  // Phase G+ (May 18 2026): when this number changes, StepCategory resets to
  // the mains view (clears selectedMain). Used by "تغيير الفئة" button so the
  // user can quickly switch between mains without drilling out of subs first.
  resetSignal?: number;
}) {
  const startingMainSlug = useMemo(() => {
    if (!value) return null;
    const asMain = categories.find((m) => m.slug === value);
    if (asMain) return asMain.slug;
    const asSub = categories.find((m) => m.subs.some((s) => s.slug === value));
    return asSub?.slug ?? null;
  }, [value, categories]);

  const [selectedMain, setSelectedMain] = useState<string | null>(startingMainSlug);
  const [activeTrack, setActiveTrack] = useState<TrackTab>('all');
  const main = categories.find((m) => m.slug === selectedMain);

  // FIX (May 29 2026): handle clicks on a main category. If the main has
  // subs, drill into the sub-list (existing behaviour). If it has NO subs
  // (true for the new "restaurants" + "products" categories that are
  // themselves leaves — e.g. "برجر وسندوتشات", "إلكترونيات،"), submit
  // the slug immediately so the wizard advances to Step 2. Without this,
  // the user lands in an empty sub-view and the wizard appears frozen.
  // Mohamed: "el aksam el gdeda lsa msh byet3mlaha add listing sare3".
  const handleMainClick = (c: MainCategory) => {
    if (c.subs.length === 0) {
      onSelect(c.slug);
    } else {
      setSelectedMain(c.slug);
    }
  };

  // Phase G+ (May 18 2026): when parent signals "reset", jump back to the
  // mains list so the user can pick a totally different category.
  useEffect(() => {
    if (resetSignal > 0) {
      setSelectedMain(null);
    }
  }, [resetSignal]);

  // Filter mains by selected track tab
  const visibleMains = useMemo(() => {
    if (activeTrack === 'all') return categories;
    return categories.filter((c) => c.track === activeTrack);
  }, [activeTrack, categories]);

  if (!main) {
    return (
      <section>
        <h2 className="text-lg font-semibold mb-1">إيه اللي عايز تأجره؟</h2>
        <p className="text-sm text-gray-500 mb-5">اختار التصنيف الرئيسي</p>

        {/* Track tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-5 px-5">
          {(['all', 'rentals', 'services', 'hybrid', 'restaurants', 'products'] as TrackTab[]).map((t) => {
            const count = t === 'all'
              ? categories.length
              : categories.filter((c) => c.track === t).length;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setActiveTrack(t)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                  activeTrack === t
                    ? 'bg-[#1F6F5F] border-[#1F6F5F] text-white'
                    : 'bg-white border-[#E5E5E0] text-gray-700 hover:bg-[#F5F4F0]'
                }`}
              >
                <span>{TRACK_EMOJI[t]}</span>
                <span>{TRACK_LABELS[t]}</span>
                <span className={`text-[10px] ${activeTrack === t ? 'opacity-80' : 'text-gray-400'}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        {visibleMains.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-500">
            مفيش تصنيفات في التبويب ده دلوقتي
          </div>
        ) : (() => {
          // Phase G (May 18 2026): render visible mains GROUPED by group_slug
          // with a heading per group. If a main has no group_slug (legacy/null),
          // it falls into an "أخرى" bucket at the end so nothing is hidden.
          const groupsMap = new Map<string, { name_ar: string; emoji: string; order: number; mains: MainCategory[] }>();
          for (const c of visibleMains) {
            const key = c.group_slug || '__other';
            if (!groupsMap.has(key)) {
              groupsMap.set(key, {
                name_ar: c.group_name_ar || 'أخرى',
                emoji: c.group_emoji || '📦',
                order: c.group_display_order ?? 999,
                mains: [],
              });
            }
            groupsMap.get(key)!.mains.push(c);
          }
          const orderedGroups = Array.from(groupsMap.entries())
            .sort((a, b) => a[1].order - b[1].order);

          // If everything ended up in one group, render flat (no heading needed).
          if (orderedGroups.length === 1) {
            return (
              <div className="grid grid-cols-2 gap-3">
                {orderedGroups[0][1].mains.map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => handleMainClick(c)}
                    className="p-5 rounded-2xl border text-right transition-all bg-white border-[#E5E5E0] hover:bg-[#F5F4F0] hover:border-emerald-300"
                  >
                    <div className="text-3xl mb-2">{c.emoji}</div>
                    <div className="font-semibold">{c.name_ar}</div>
                    {c.subs.length > 0 ? (
                      <div className="text-[10px] text-gray-500 mt-1">{c.subs.length} نوع</div>
                    ) : (
                      <div className="text-[10px] text-[#1F6F5F] mt-1 font-medium">دوس لتختار ←</div>
                    )}
                  </button>
                ))}
              </div>
            );
          }

          return (
            <div className="space-y-6">
              {orderedGroups.map(([key, group]) => (
                <div key={key}>
                  <h3 className="flex items-center gap-2 text-sm font-bold text-[#1F6F5F] mb-3">
                    <span className="text-lg leading-none">{group.emoji}</span>
                    <span>{group.name_ar}</span>
                    <span className="text-[10px] font-normal text-gray-400">({group.mains.length})</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {group.mains.map((c) => (
                      <button
                        key={c.slug}
                        type="button"
                        onClick={() => handleMainClick(c)}
                        className="p-5 rounded-2xl border text-right transition-all bg-white border-[#E5E5E0] hover:bg-[#F5F4F0] hover:border-emerald-300"
                      >
                        <div className="text-3xl mb-2">{c.emoji}</div>
                        <div className="font-semibold">{c.name_ar}</div>
                        {c.subs.length > 0 ? (
                          <div className="text-[10px] text-gray-500 mt-1">{c.subs.length} نوع</div>
                        ) : (
                          <div className="text-[10px] text-[#1F6F5F] mt-1 font-medium">دوس لتختار ←</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </section>
    );
  }

  return (
    <section>
      {/* Phase G+ (May 18 2026): bigger, more visible back-to-mains button.
          Old version was a small gray text link easy to miss. */}
      <button
        type="button"
        onClick={() => setSelectedMain(null)}
        className="mb-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1F6F5F]/8 hover:bg-[#1F6F5F]/12 border border-[#1F6F5F]/20 text-sm font-semibold text-[#1F6F5F] transition-colors"
      >
        <span className="text-base">→</span>
        <span>اختار فئة تانية</span>
      </button>
      <h2 className="text-lg font-semibold mb-1">
        <span className="text-2xl me-2">{main.emoji}</span>
        {main.name_ar}
      </h2>
      <p className="text-sm text-gray-500 mb-6">اختار النوع الأقرب لما عندك</p>
      <div className="grid grid-cols-2 gap-3">
        {main.subs.map((s) => {
          const appearsUnderMains = categories
            .filter((m) => m.subs.some((sub) => sub.slug === s.slug))
            .map((m) => m.name_ar);
          const isCrossListed = appearsUnderMains.length > 1;

          return (
            <button
              key={s.slug}
              type="button"
              onClick={() => onSelect(s.slug)}
              className={`p-5 rounded-2xl border text-right transition-all ${
                value === s.slug
                  ? 'bg-[#1F6F5F] border-[#1F6F5F] text-white'
                  : 'bg-white border-[#E5E5E0] hover:bg-[#F5F4F0] hover:border-emerald-300'
              }`}
            >
              <div className="text-3xl mb-2">{s.emoji}</div>
              <div className="font-semibold text-sm">{s.name_ar}</div>
              {isCrossListed && (
                <div className="mt-1.5 text-[10px] text-[#1F6F5F] font-bold leading-tight">
                  هيظهر في: {appearsUnderMains.join(' + ')}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

// =================================================
// CATEGORY CHIP — shows selected category at top of step 2-5
// with a "تغيير الفئة" button to return to step 1.
// Added May 16 2026 (Mohamed: "اخترت شاليه وحبيت اغير لشقة مفيش زرار يرجعني").
// =================================================
function CategoryChip({
  slug,
  categories,
  onChange,
}: {
  slug?: string | null;
  categories: MainCategory[];
  onChange: () => void;
}) {
  if (!slug) return null;
  // Try to match as a main category first
  const main = categories.find((m) => m.slug === slug);
  // Otherwise search subs
  let display: { emoji: string; name: string } | null = null;
  if (main) {
    display = { emoji: main.emoji, name: main.name_ar };
  } else {
    for (const m of categories) {
      const s = m.subs.find((x) => x.slug === slug);
      if (s) {
        display = { emoji: s.emoji, name: `${m.name_ar} · ${s.name_ar}` };
        break;
      }
    }
  }
  if (!display) return null;
  return (
    <div className="mb-5 flex items-center justify-between rounded-xl bg-[#F5F4F0] border border-[#E5E5E0] px-4 py-3">
      <div className="flex items-center gap-2 text-sm min-w-0">
        <span className="text-lg leading-none flex-shrink-0">{display.emoji}</span>
        <span className="font-medium truncate">{display.name}</span>
      </div>
      {/* Phase G+ (May 18 2026): bigger "change category" button — was a tiny
          text link that users missed. Now it's a clearly tappable button. */}
      <button
        type="button"
        onClick={onChange}
        className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-white border border-[#1F6F5F]/30 text-xs text-[#1F6F5F] hover:bg-[#1F6F5F]/5 font-bold whitespace-nowrap"
      >
        تغيير الفئة
      </button>
    </div>
  );
}

// =================================================
// STEP 2 — BASIC DETAILS + CATEGORY-SPECIFIC ATTRIBUTES (Phase F, May 18 2026)
//
// Step 2 now collects two layers of info:
//   1. Universal fields: title, description, city, district
//   2. Category-specific attributes (rooms, year, transmission, accepted
//      insurance, etc.) fetched lazily from /api/listing-drafts/attributes
//      based on the selected category slug.
//
// Validation is done HERE (not in the parent) so we can enforce required
// attributes which the parent has no knowledge of. Parent's onSubmit just
// persists + advances when the child says the patch is ready.
//
// Values are saved to draft.attributes as { field_key: value }. The DB-side
// claim_listing_draft (Phase F migration) maps these to attribute_ids and
// inserts listing_values rows when the draft converts to a listing.
// =================================================
function StepBasics({
  draft,
  errors,
  setErrors,
  categories,
  onSubmit,
  onBack,
  onChangeCategory,
  saving,
}: {
  draft: DraftPayload;
  errors: Record<string, string>;
  setErrors: (e: Record<string, string>) => void;
  categories: MainCategory[];
  onSubmit: (patch: Partial<DraftPayload>) => void | Promise<void>;
  onBack: () => void;
  onChangeCategory: () => void;
  saving: boolean;
}) {
  // Strip the placeholder so users don't see it pre-filled
  const initialTitle = draft.title && draft.title !== PLACEHOLDER_TITLE ? draft.title : '';
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(draft.description || '');
  const [city, setCity] = useState(draft.city || '');
  const [district, setDistrict] = useState(draft.district || '');

  // Mohamed May 31 2026: multi-branch — one listing can cover several branches
  type Branch = { name?: string; city?: string; address?: string; phone?: string };
  const [branches, setBranches] = useState<Branch[]>(() => {
    const b = (draft.attributes as { branches?: unknown } | undefined)?.branches;
    return Array.isArray(b) ? (b as Branch[]) : [];
  });
  const addBranch = () =>
    setBranches((p) => [...p, { name: '', city: '', address: '', phone: '' }]);
  const updateBranch = (i: number, key: keyof Branch, val: string) =>
    setBranches((p) => p.map((b, idx) => (idx === i ? { ...b, [key]: val } : b)));
  const removeBranch = (i: number) =>
    setBranches((p) => p.filter((_, idx) => idx !== i));

  // Mohamed May 30 2026: districts dropdown for top 3 governorates (Cairo/Giza/Alex)
  type District = { id: string; name_ar: string; name_en: string | null; slug: string; sort_order: number };
  const [districtsList, setDistrictsList] = useState<District[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  useEffect(() => {
    if (!city) { setDistrictsList([]); return; }
    let cancelled = false;
    setLoadingDistricts(true);
    (async () => {
      try {
        // @ts-expect-error — RPC types not auto-generated yet
        const { data, error } = await supabaseBrowser.rpc('get_districts_by_governorate', { p_governorate: city });
        if (cancelled) return;
        if (error || !Array.isArray(data)) { setDistrictsList([]); return; }
        setDistrictsList(data as District[]);
      } catch {
        if (!cancelled) setDistrictsList([]);
      } finally {
        if (!cancelled) setLoadingDistricts(false);
      }
    })();
    return () => { cancelled = true; };
  }, [city]);

  // Phase E (May 18 2026): use category-specific placeholders from DB.
  // Fallback to original hardcoded values when meta is null (e.g. new categories
  // not yet filled, or DB read failure).
  const meta = getCategoryWizardMeta(draft.category_slug, categories);
  const titlePh = meta.title_placeholder || 'مثلاً: شاليه في مراسي بحر مباشر، 4 غرف';
  const descPh = meta.description_placeholder || 'إيه اللي بيميز اللي عندك؟ (المسبح، الإطلالة، الموقع...)';
  const districtPh = meta.district_placeholder || 'مثلاً: مراسي، التجمع الخامس، الزمالك...';

  // Phase F: attributes state + lazy fetch.
  // 'addons' is owned by StepPricing (beauty add-ons) so we strip it out
  // of the local attribute values to avoid double-management.
  const [attributes, setAttributes] = useState<AttributeField[]>([]);
  const [loadingAttrs, setLoadingAttrs] = useState(false);
  const [attrValues, setAttrValues] = useState<Record<string, unknown>>(() => {
    const init = (draft.attributes || {}) as Record<string, unknown>;
    const rest: Record<string, unknown> = {};
    for (const k of Object.keys(init)) {
      if (k !== 'addons' && k !== 'branches') rest[k] = init[k];
    }
    return rest;
  });

  // Fetch attributes whenever the selected category changes.
  useEffect(() => {
    if (!draft.category_slug) {
      setAttributes([]);
      return;
    }
    let cancelled = false;
    setLoadingAttrs(true);
    fetch(`/api/listing-drafts/attributes?slug=${encodeURIComponent(draft.category_slug)}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        if (data.success && Array.isArray(data.attributes)) {
          setAttributes(data.attributes);
        } else {
          setAttributes([]);
        }
      })
      .catch(() => {
        if (!cancelled) setAttributes([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingAttrs(false);
      });
    return () => { cancelled = true; };
  }, [draft.category_slug]);

  // Validation is fully local now — covers title, city, AND required attrs.
  function handleNext() {
    const errs: Record<string, string> = {};
    if (!title || title.length < 5 || title === PLACEHOLDER_TITLE) {
      errs.title = 'العنوان قصير، خليه على الأقل 5 حروف';
    }
    if (!city) errs.city = 'اختار المحافظة';
    // Required attributes
    for (const attr of attributes) {
      if (!attr.is_required) continue;
      const v = attrValues[attr.field_key];
      const isEmpty =
        v === undefined ||
        v === null ||
        v === '' ||
        (Array.isArray(v) && v.length === 0);
      if (isEmpty) {
        errs[`attr_${attr.field_key}`] = `${attr.name_ar} مطلوب`;
      }
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});

    // Preserve beauty 'addons' (managed by StepPricing) when patching attributes.
    const existingAddons = (draft.attributes as { addons?: unknown } | undefined)?.addons;
    const finalAttrs: Record<string, unknown> = { ...attrValues };
    if (existingAddons !== undefined) finalAttrs.addons = existingAddons;

    const cleanBranches = branches
      .map((b) => ({
        name: (b.name || '').trim(),
        city: (b.city || '').trim(),
        address: (b.address || '').trim(),
        phone: (b.phone || '').trim(),
      }))
      .filter((b) => b.name || b.address || b.phone);
    if (cleanBranches.length > 0) finalAttrs.branches = cleanBranches;

    onSubmit({ title, description, city, district, attributes: finalAttrs });
  }

  return (
    <section>
      <h2 className="text-lg font-semibold mb-1">معلومات أساسية</h2>
      <p className="text-sm text-gray-500 mb-6">وصف قصير، مكان، وفينك</p>

      <CategoryChip slug={draft.category_slug} categories={categories} onChange={onChangeCategory} />

      <Field label="عنوان الإعلان" error={errors.title} required>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={titlePh}
          className={inputCls}
        />
      </Field>

      <Field label="وصف مختصر" error={errors.description}>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder={descPh}
          className={inputCls}
        />
      </Field>

      <Field label="المحافظة/المنطقة" error={errors.city} required>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className={inputCls}
        >
          <option value="">اختار</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </Field>

      <Field label="الحي/المنطقة بالظبط" error={errors.district}>
        {districtsList.length > 0 ? (
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className={inputCls}
          >
            <option value="">اختار الحي</option>
            {districtsList.map((d) => (
              <option key={d.id} value={d.name_ar}>{d.name_ar}</option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            placeholder={loadingDistricts ? 'جاري تحميل الأحياء...' : districtPh}
            className={inputCls}
          />
        )}
      </Field>

      {/* Phase F (May 18 2026): category-specific attributes section.
          Lazy-fetched per category. Required attrs validated on Next click.
          Beauty 'addons' kept separate — owned by StepPricing. */}
      {loadingAttrs && (
        <div className="mt-6 text-sm text-gray-500 text-center">
          ⏳ جاري تحميل تفاصيل التصنيف...
        </div>
      )}
      {!loadingAttrs && attributes.length > 0 && (
        <div className="mt-8 pt-6 border-t border-[#E5E5E0]">
          <h3 className="text-base font-semibold mb-1">تفاصيل إضافية</h3>
          <p className="text-xs text-gray-500 mb-5">
            البيانات دي بتساعد العميل يلاقي إعلانك بسرعة وتزود الحجوزات.{' '}
            <span className="text-[#1F6F5F] font-medium">المعلّمة بنجمة مطلوبة.</span>
          </p>
          {attributes.map(attr => (
            <AttributeFieldRenderer
              key={attr.id}
              attr={attr}
              value={attrValues[attr.field_key]}
              onChange={(v) => setAttrValues(prev => ({ ...prev, [attr.field_key]: v }))}
              error={errors[`attr_${attr.field_key}`]}
            />
          ))}
        </div>
      )}


      {/* Multi-branch repeater (May 31 2026): one listing, multiple branches */}
      <div className="mt-8 pt-6 border-t border-[#E5E5E0]">
        <h3 className="text-base font-semibold mb-1">عندك أكتر من فرع؟ (اختياري)</h3>
        <p className="text-xs text-gray-500 mb-4">
          ضيف فروعك هنا بدل ما تعمل إعلان لكل فرع لوحده — هتظهر كلها في نفس الإعلان.
        </p>

        {branches.map((b, i) => (
          <div key={i} className="mb-4 p-4 rounded-xl bg-[#F5F4F0] border border-[#E5E5E0]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-[#1F6F5F]">فرع {i + 1}</span>
              <button
                type="button"
                onClick={() => removeBranch(i)}
                className="text-xs font-semibold text-red-600 hover:text-red-700"
              >
                حذف
              </button>
            </div>
            <input
              type="text"
              value={b.name || ''}
              onChange={(e) => updateBranch(i, 'name', e.target.value)}
              placeholder="اسم الفرع (مثلاً: فرع مدينة نصر)"
              className={`${inputCls} mb-2`}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
              <select
                value={b.city || ''}
                onChange={(e) => updateBranch(i, 'city', e.target.value)}
                className={inputCls}
              >
                <option value="">المحافظة</option>
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input
                type="tel"
                value={b.phone || ''}
                onChange={(e) => updateBranch(i, 'phone', e.target.value)}
                placeholder="تليفون الفرع (اختياري)"
                className={inputCls}
              />
            </div>
            <input
              type="text"
              value={b.address || ''}
              onChange={(e) => updateBranch(i, 'address', e.target.value)}
              placeholder="العنوان بالتفصيل"
              className={inputCls}
            />
          </div>
        ))}

        <button
          type="button"
          onClick={addBranch}
          className="w-full py-2.5 rounded-xl border-2 border-dashed border-[#2FA084] text-[#1F6F5F] text-sm font-semibold hover:bg-[#F0FAF7] transition"
        >
          + ضيف فرع
        </button>
      </div>

      <Nav onBack={onBack} onNext={handleNext} saving={saving} />
    </section>
  );
}

// =================================================
// ATTRIBUTE FIELD RENDERER (Phase F, May 18 2026)
// Renders an attribute input based on field_type.
// Field types: number, text, boolean, select, multi_select.
// =================================================
type AttributeFieldType = 'number' | 'text' | 'boolean' | 'select' | 'multi_select';

interface AttributeField {
  id: string;
  name_ar: string;
  field_key: string;
  field_type: AttributeFieldType;
  options: { key: string; label_ar: string }[] | null;
  unit: string | null;
  placeholder: string | null;
  help_text: string | null;
  is_required: boolean;
  is_filterable: boolean;
  display_order: number;
}

function AttributeFieldRenderer({
  attr,
  value,
  onChange,
  error,
}: {
  attr: AttributeField;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
}) {
  const helpText = attr.help_text ? (
    <p className="text-[11px] text-gray-500 mt-1">{attr.help_text}</p>
  ) : null;

  if (attr.field_type === 'number') {
    return (
      <Field label={attr.name_ar} required={attr.is_required} error={error}>
        <div className="relative">
          <input
            type="number"
            value={value === undefined || value === null ? '' : String(value)}
            onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
            placeholder={attr.placeholder || ''}
            className={inputCls + (attr.unit ? ' pl-16' : '')}
          />
          {attr.unit && (
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
              {attr.unit}
            </span>
          )}
        </div>
        {helpText}
      </Field>
    );
  }

  if (attr.field_type === 'text') {
    return (
      <Field label={attr.name_ar} required={attr.is_required} error={error}>
        <input
          type="text"
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value || undefined)}
          placeholder={attr.placeholder || ''}
          className={inputCls}
        />
        {helpText}
      </Field>
    );
  }

  if (attr.field_type === 'boolean') {
    return (
      <Field label={attr.name_ar} required={attr.is_required} error={error}>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onChange(true)}
            className={`py-2.5 rounded-xl border text-sm transition-all ${
              value === true
                ? 'bg-[#1F6F5F] border-[#1F6F5F] text-white font-semibold'
                : 'bg-white border-[#E5E5E0]'
            }`}
          >
            ✓ نعم
          </button>
          <button
            type="button"
            onClick={() => onChange(false)}
            className={`py-2.5 rounded-xl border text-sm transition-all ${
              value === false
                ? 'bg-[#1F6F5F] border-[#1F6F5F] text-white font-semibold'
                : 'bg-white border-[#E5E5E0]'
            }`}
          >
            ✗ لا
          </button>
        </div>
        {helpText}
      </Field>
    );
  }

  if (attr.field_type === 'select') {
    const options = attr.options || [];
    // Button group for small option sets, dropdown for many.
    if (options.length <= 6) {
      return (
        <Field label={attr.name_ar} required={attr.is_required} error={error}>
          <div className="grid grid-cols-2 gap-2">
            {options.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => onChange(opt.key)}
                className={`py-2.5 rounded-xl border text-sm transition-all ${
                  value === opt.key
                    ? 'bg-[#1F6F5F] border-[#1F6F5F] text-white font-semibold'
                    : 'bg-white border-[#E5E5E0]'
                }`}
              >
                {opt.label_ar}
              </button>
            ))}
          </div>
          {helpText}
        </Field>
      );
    }
    return (
      <Field label={attr.name_ar} required={attr.is_required} error={error}>
        <select
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value || undefined)}
          className={inputCls}
        >
          <option value="">اختار</option>
          {options.map((opt) => (
            <option key={opt.key} value={opt.key}>{opt.label_ar}</option>
          ))}
        </select>
        {helpText}
      </Field>
    );
  }

  if (attr.field_type === 'multi_select') {
    const options = attr.options || [];
    const selected = Array.isArray(value) ? (value as string[]) : [];
    return (
      <Field label={attr.name_ar} required={attr.is_required} error={error}>
        <div className="grid grid-cols-2 gap-2">
          {options.map((opt) => {
            const isSel = selected.includes(opt.key);
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  if (isSel) onChange(selected.filter(k => k !== opt.key));
                  else onChange([...selected, opt.key]);
                }}
                className={`py-2.5 rounded-xl border text-xs transition-all ${
                  isSel
                    ? 'bg-[#1F6F5F] border-[#1F6F5F] text-white font-semibold'
                    : 'bg-white border-[#E5E5E0]'
                }`}
              >
                {isSel ? '✓ ' : ''}{opt.label_ar}
              </button>
            );
          })}
        </div>
        {selected.length > 0 && (
          <p className="text-[11px] text-gray-500 mt-1.5">
            {selected.length} مختار
          </p>
        )}
        {helpText}
      </Field>
    );
  }

  // Unknown field_type — render nothing (forward-compat).
  return null;
}

function validateBasics(_patch: Partial<DraftPayload>, _setErrors: (e: Record<string, string>) => void): boolean {
  // Phase F (May 18 2026): validation moved INTO StepBasics (so it can also
  // enforce required category-specific attributes). This shim is kept as a
  // no-op for any future caller — the parent's onSubmit no longer calls it.
  return true;
}

// =================================================
// STEP 3a — MENU BUILDER (restaurants track, May 29 2026)
// For restaurants/food categories — the user adds multiple menu items
// instead of setting a single listing-level price. Items are saved to
// draft.attributes.menu_items as a jsonb array. On submission (Step 5),
// the claim flow turns these into restaurant_menu_items rows.
//
// Validation: at least one item with non-empty name AND price > 0.
// We also set draft.price = first item's price + price_period = 'per_unit'
// so existing flows that read draft.price (e.g. preview, search filters)
// still have a sensible default.
// =================================================
function MenuBuilderStep({
  draft,
  categories,
  token,
  onSubmit,
  onBack,
  onChangeCategory,
  saving,
}: {
  draft: DraftPayload;
  categories: MainCategory[];
  token: string | null;
  onSubmit: (patch: Partial<DraftPayload>) => void | Promise<void>;
  onBack: () => void;
  onChangeCategory: () => void;
  saving: boolean;
}) {
  const initialItems = (draft.attributes?.menu_items as MenuItem[] | undefined) || [];
  const [items, setItems] = useState<MenuItem[]>(
    initialItems.length > 0
      ? initialItems
      : [{ name_ar: '', price: 0, description_ar: '', is_available: true }],
  );
  const [error, setError] = useState<string>('');
  // Mohamed May 30 2026: photo upload per menu item
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  function updateItem(idx: number, patch: Partial<MenuItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }
  function addItem() {
    setItems((prev) => [
      ...prev,
      { name_ar: '', price: 0, description_ar: '', is_available: true },
    ]);
  }

  async function handlePhotoUpload(idx: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingIdx(idx);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (token) fd.append('token', token);
      const res = await fetch('/api/listing-drafts/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (json.url) {
        updateItem(idx, { photo_url: json.url });
      } else {
        setError('تعذر تحميل الصورة، حاول تاني');
      }
    } catch {
      setError('خطأ في الاتصال');
    } finally {
      setUploadingIdx(null);
      e.target.value = ''; // allow same-file re-upload
    }
  }

  function handleSubmit() {
    const valid = items.filter((it) => it.name_ar.trim().length > 0 && it.price > 0);
    if (valid.length === 0) {
      setError('لازم تضيف صنف واحد على الأقل بـ اسم وسعر');
      return;
    }
    setError('');
    const existing = (draft.attributes || {}) as Record<string, unknown>;
    onSubmit({
      attributes: { ...existing, menu_items: valid },
      // listing-level price = cheapest item (acts as "starting from" price in cards)
      price: Math.min(...valid.map((it) => it.price)),
      price_period: 'per_unit',
    });
  }

  return (
    <section>
      <CategoryChip slug={draft.category_slug} categories={categories} onChange={onChangeCategory} />
      <h2 className="text-lg font-semibold mb-1">🍽️ أضف الأصناف</h2>
      <p className="text-sm text-gray-500 mb-1">ضيف أصناف المنيو اللي بتقدمها</p>
      <p className="text-xs text-[#1F6F5F] mb-5 font-medium">
        💡 ابدأ بـ 5 أصناف على الأقل عشان العميل يلاقي ليه اختيارات
      </p>

      <div className="space-y-4">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-[#E5E5E0] bg-white p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-[#1F6F5F]">
                صنف #{idx + 1}
              </span>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="text-xs text-red-600 hover:text-red-700 font-semibold"
                >
                  حذف ✕
                </button>
              )}
            </div>

            <Field label="اسم الصنف" required>
              <input
                type="text"
                value={item.name_ar}
                onChange={(e) => updateItem(idx, { name_ar: e.target.value })}
                placeholder="مثلاً: برجر كلاسيك"
                className={inputCls}
              />
            </Field>

            {/* Mohamed May 30 2026: photo upload per menu item */}
            <Field label="صورة الصنف (اختياري)">
              <div className="flex items-center gap-3">
                {item.photo_url ? (
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-[#E5E5E0] flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.photo_url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => updateItem(idx, { photo_url: undefined })}
                      className="absolute top-0 left-0 w-6 h-6 bg-red-600 text-white text-xs font-bold flex items-center justify-center rounded-br-lg hover:bg-red-700"
                      aria-label="حذف الصورة"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <label className={`w-20 h-20 rounded-xl border-2 border-dashed border-[#1F6F5F]/40 flex flex-col items-center justify-center cursor-pointer hover:bg-[#1F6F5F]/5 transition-colors flex-shrink-0 ${uploadingIdx === idx ? 'opacity-50 pointer-events-none' : ''}`}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(idx, e)}
                      className="sr-only"
                      disabled={uploadingIdx === idx}
                    />
                    {uploadingIdx === idx ? (
                      <span className="text-[10px] text-gray-500">جاري...</span>
                    ) : (
                      <>
                        <span className="text-2xl text-[#1F6F5F]">📷</span>
                        <span className="text-[10px] text-[#1F6F5F] font-bold mt-0.5">صورة</span>
                      </>
                    )}
                  </label>
                )}
                <p className="text-[11px] text-gray-500 flex-1">
                  صورة صنف حلوة = أوردرات أكتر 📈
                </p>
              </div>
            </Field>

            <Field label="السعر بالجنيه" required>
              <input
                type="number"
                value={item.price || ''}
                onChange={(e) =>
                  updateItem(idx, { price: Number(e.target.value) || 0 })
                }
                placeholder="80"
                className={inputCls}
              />
            </Field>

            <Field label="وصف قصير (اختياري)">
              <input
                type="text"
                value={item.description_ar || ''}
                onChange={(e) =>
                  updateItem(idx, { description_ar: e.target.value || undefined })
                }
                placeholder="لحم 150ج + جبنة + خس + صوص خاص"
                className={inputCls}
              />
            </Field>

            <label className="mt-1 flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={item.is_available}
                onChange={(e) =>
                  updateItem(idx, { is_available: e.target.checked })
                }
                className="w-4 h-4 accent-[#1F6F5F]"
              />
              <span>متاح حالياً</span>
            </label>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addItem}
        className="mt-4 w-full py-3 rounded-xl border-2 border-dashed border-[#1F6F5F]/40 text-[#1F6F5F] text-sm font-bold hover:bg-[#1F6F5F]/5 transition-colors"
      >
        + أضف صنف جديد
      </button>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <Nav onBack={onBack} onNext={handleSubmit} saving={saving} />
    </section>
  );
}

// =================================================
// STEP 3b — PRODUCT DETAILS (products track, May 29 2026)
// For shop/products categories — collects price + stock + condition +
// brand/model + shipping. Stored in draft.price (listing price) +
// draft.attributes.product_details (everything else). On submission, the
// claim flow can promote these to listing_values rows or keep them in the
// listing's metadata payload — depending on the consumer.
// =================================================
function ProductDetailsStep({
  draft,
  categories,
  onSubmit,
  onBack,
  onChangeCategory,
  saving,
}: {
  draft: DraftPayload;
  categories: MainCategory[];
  onSubmit: (patch: Partial<DraftPayload>) => void | Promise<void>;
  onBack: () => void;
  onChangeCategory: () => void;
  saving: boolean;
}) {
  const existingDetails = (draft.attributes?.product_details as ProductDetails | undefined);
  const existingWholesale = (draft.attributes?.wholesale_tiers as WholesaleTier[] | undefined) || [];
  const [price, setPrice] = useState<number | ''>(draft.price ?? '');
  const [stockQty, setStockQty] = useState<number>(existingDetails?.stock_quantity ?? 1);
  const [condition, setCondition] = useState<ProductCondition>(
    existingDetails?.condition ?? 'new',
  );
  const [brand, setBrand] = useState<string>(existingDetails?.brand || '');
  const [model, setModel] = useState<string>(existingDetails?.model || '');
  const [shippingAvailable, setShippingAvailable] = useState<boolean>(
    existingDetails?.shipping_available ?? true,
  );
  const [shippingCost, setShippingCost] = useState<number | ''>(
    existingDetails?.shipping_cost ?? '',
  );
  const [error, setError] = useState<string>('');

  // Task 5 (May 30 2026): wholesale tiers (optional bulk-pricing).
  const [hasWholesale, setHasWholesale] = useState<boolean>(existingWholesale.length > 0);
  const [wholesaleTiers, setWholesaleTiers] = useState<WholesaleTier[]>(
    existingWholesale.length > 0 ? existingWholesale : []
  );

  // Task 8 (May 30 2026): made-to-order (تحت التصنيع). Availability axis
  // SEPARATE from condition. lead-time (required), seller-set deposit %
  // (optional), customizable flag (optional). Buyer is fully refunded if the
  // seller misses the agreed delivery date (enforced downstream in the
  // order/refund flow). Stored in product_details; DB column mapping in
  // claim_listing_draft is a pending backend follow-up.
  const [availabilityType, setAvailabilityType] = useState<'ready' | 'made_to_order'>(
    existingDetails?.availability_type ?? 'ready'
  );
  const [leadDays, setLeadDays] = useState<number | ''>(
    existingDetails?.made_to_order_lead_days ?? ''
  );
  const [depositPct, setDepositPct] = useState<number | ''>(
    existingDetails?.made_to_order_deposit_pct ?? ''
  );
  const [customizable, setCustomizable] = useState<boolean>(
    existingDetails?.made_to_order_customizable ?? false
  );

  function addTier() {
    setWholesaleTiers((prev) => [...prev, { unit: 'دستة', qty: 12, price_per_unit: 0 }]);
  }
  function removeTier(idx: number) {
    setWholesaleTiers((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateTier(idx: number, patch: Partial<WholesaleTier>) {
    setWholesaleTiers((prev) => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
  }

  const conditionOptions: { key: ProductCondition; label_ar: string }[] = [
    { key: 'new', label_ar: 'جديد بالكرتونة' },
    { key: 'used_like_new', label_ar: 'مستعمل (مثل الجديد)' },
    { key: 'used_good', label_ar: 'مستعمل (حالة جيدة)' },
    { key: 'refurbished', label_ar: 'Refurbished' },
  ];

  function handleSubmit() {
    if (!price || Number(price) <= 0) {
      setError('حط سعر صحيح');
      return;
    }
    if (availabilityType === 'ready' && (!stockQty || stockQty < 1)) {
      setError('الكمية لازم تكون 1 على الأقل');
      return;
    }
    if (availabilityType === 'made_to_order') {
      if (!leadDays || Number(leadDays) < 1) {
        setError('حدد مدة التجهيز بالأيام (يوم واحد على الأقل)');
        return;
      }
      if (depositPct !== '' && (Number(depositPct) < 0 || Number(depositPct) > 100)) {
        setError('نسبة العربون لازم تكون بين 0 و 100');
        return;
      }
    }
    // Validate wholesale tiers if enabled — require unit+qty+price for each
    let finalWholesale: WholesaleTier[] = [];
    if (hasWholesale) {
      const valid = wholesaleTiers.filter(
        (t) => t.unit.trim().length > 0 && t.qty > 0 && t.price_per_unit > 0
      );
      if (wholesaleTiers.length > 0 && valid.length === 0) {
        setError('اكمل بيانات أسعار الجملة أو الغيها');
        return;
      }
      finalWholesale = valid.map((t) => ({
        ...t,
        total: t.qty * t.price_per_unit,
      }));
    }
    setError('');
    const productDetails: ProductDetails = {
      stock_quantity: availabilityType === 'made_to_order' ? 0 : Number(stockQty),
      condition,
      brand: brand.trim() || undefined,
      model: model.trim() || undefined,
      shipping_available: shippingAvailable,
      shipping_cost:
        shippingAvailable && shippingCost !== ''
          ? Number(shippingCost)
          : undefined,
      availability_type: availabilityType,
      made_to_order_lead_days:
        availabilityType === 'made_to_order' ? Number(leadDays) : undefined,
      made_to_order_deposit_pct:
        availabilityType === 'made_to_order' && depositPct !== ''
          ? Number(depositPct)
          : undefined,
      made_to_order_customizable:
        availabilityType === 'made_to_order' ? customizable : undefined,
    };
    const existing = (draft.attributes || {}) as Record<string, unknown>;
    onSubmit({
      price: Number(price),
      price_period: 'per_unit',
      attributes: {
        ...existing,
        product_details: productDetails,
        wholesale_tiers: finalWholesale,
      },
    });
  }

  return (
    <section>
      <CategoryChip slug={draft.category_slug} categories={categories} onChange={onChangeCategory} />
      <h2 className="text-lg font-semibold mb-1">🛍️ تفاصيل المنتج والسعر</h2>
      <p className="text-sm text-gray-500 mb-5">سعر، كمية، وحالة المنتج</p>

      <Field label="السعر بالجنيه" required>
        <input
          type="number"
          value={price}
          onChange={(e) =>
            setPrice(e.target.value === '' ? '' : Number(e.target.value))
          }
          placeholder="مثلاً: 12000"
          className={inputCls}
        />
      </Field>

      {/* ─── AVAILABILITY: ready vs made-to-order (Task 8 — May 30 2026) ─── */}
      <Field label="نوع التوفّر" required>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setAvailabilityType('ready')}
            className={`py-2.5 rounded-xl border text-sm transition-all ${
              availabilityType === 'ready'
                ? 'bg-[#1F6F5F] border-[#1F6F5F] text-white font-semibold'
                : 'bg-white border-[#E5E5E0]'
            }`}
          >
            📦 متوفر / جاهز
          </button>
          <button
            type="button"
            onClick={() => setAvailabilityType('made_to_order')}
            className={`py-2.5 rounded-xl border text-sm transition-all ${
              availabilityType === 'made_to_order'
                ? 'bg-[#1F6F5F] border-[#1F6F5F] text-white font-semibold'
                : 'bg-white border-[#E5E5E0]'
            }`}
          >
            🛠️ تحت التصنيع
          </button>
        </div>
      </Field>

      {availabilityType === 'made_to_order' && (
        <div className="mt-1 mb-3 p-4 rounded-xl bg-gradient-to-bl from-amber-50 to-emerald-50 border border-amber-200 space-y-3">
          <Field label="مدة التجهيز بالأيام" required>
            <div className="relative">
              <input
                type="number"
                value={leadDays}
                onChange={(e) =>
                  setLeadDays(e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="مثلاً: 7"
                className={inputCls + ' pl-14'}
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                يوم
              </span>
            </div>
          </Field>

          <Field label="عربون مقدّم (% من السعر) — اختياري">
            <div className="relative">
              <input
                type="number"
                value={depositPct}
                onChange={(e) =>
                  setDepositPct(e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="مثلاً: 30"
                className={inputCls + ' pl-10'}
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                %
              </span>
            </div>
          </Field>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={customizable}
              onChange={(e) => setCustomizable(e.target.checked)}
              className="w-4 h-4 accent-[#1F6F5F]"
            />
            <span>✏️ بيتفصّل حسب طلب العميل (قابل للتخصيص)</span>
          </label>

          <div className="p-3 rounded-xl bg-white border border-[#E5E5E0] text-xs text-gray-700">
            <div className="font-semibold text-[#1F6F5F] mb-1">🛡️ حماية المشتري</div>
            <p>
              لو معدّتش مدة التجهيز ومسلّمتش في الميعاد المتفق عليه، العميل بياخد
              <strong> فلوسه كاملة</strong> رجوع (العربون وأي مبلغ مدفوع).
            </p>
          </div>
        </div>
      )}

      {availabilityType === 'ready' && (
        <Field label="الكمية المتوفرة" required>
          <input
            type="number"
            value={stockQty}
            onChange={(e) => setStockQty(Number(e.target.value) || 1)}
            placeholder="1"
            className={inputCls}
          />
        </Field>
      )}

      <Field label="حالة المنتج" required>
        <div className="grid grid-cols-2 gap-2">
          {conditionOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setCondition(opt.key)}
              className={`py-2.5 rounded-xl border text-sm transition-all ${
                condition === opt.key
                  ? 'bg-[#1F6F5F] border-[#1F6F5F] text-white font-semibold'
                  : 'bg-white border-[#E5E5E0]'
              }`}
            >
              {opt.label_ar}
            </button>
          ))}
        </div>
      </Field>

      <Field label="الماركة (اختياري)">
        <input
          type="text"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          placeholder="مثلاً: Samsung, Apple, Toshiba"
          className={inputCls}
        />
      </Field>

      <Field label="الموديل (اختياري)">
        <input
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="مثلاً: Galaxy S23, iPhone 15"
          className={inputCls}
        />
      </Field>

      <div className="mt-4 mb-3 p-4 rounded-xl bg-[#F5F4F0] border border-[#E5E5E0]">
        <label className="flex items-center gap-2 text-sm font-semibold mb-2 cursor-pointer">
          <input
            type="checkbox"
            checked={shippingAvailable}
            onChange={(e) => setShippingAvailable(e.target.checked)}
            className="w-4 h-4 accent-[#1F6F5F]"
          />
          🚚 بشحن للعميل
        </label>
        {shippingAvailable && (
          <Field label="سعر الشحن بالجنيه (اختياري)">
            <input
              type="number"
              value={shippingCost}
              onChange={(e) =>
                setShippingCost(e.target.value === '' ? '' : Number(e.target.value))
              }
              placeholder="مثلاً: 50 (اتركها فاضية لو مجاني)"
              className={inputCls}
            />
          </Field>
        )}
      </div>

      {/* ─── WHOLESALE PRICING (Task 5 — May 30 2026) ─── */}
      <div className="mt-4 mb-3 p-4 rounded-xl bg-[#F5F4F0] border border-[#E5E5E0]">
        <label className="flex items-start gap-2 text-sm font-semibold mb-2 cursor-pointer">
          <input
            type="checkbox"
            checked={hasWholesale}
            onChange={(e) => {
              setHasWholesale(e.target.checked);
              if (e.target.checked && wholesaleTiers.length === 0) {
                addTier();
              }
            }}
            className="w-4 h-4 mt-0.5 accent-[#1F6F5F]"
          />
          <div>
            📦 بتبيع جملة؟ (أسعار خاصة للكميات)
            <p className="text-[11px] text-gray-500 font-normal mt-0.5">
              مثلاً: دستة (12 قطعة) بـ 18 جنيه للقطعة = 216 جنيه
            </p>
          </div>
        </label>

        {hasWholesale && (
          <div className="space-y-3 mt-3">
            {wholesaleTiers.map((tier, idx) => {
              const total = (tier.qty || 0) * (tier.price_per_unit || 0);
              return (
                <div
                  key={idx}
                  className="rounded-xl bg-white border border-[#E5E5E0] p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#1F6F5F]">
                      سعر جملة #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeTier(idx)}
                      className="text-xs text-red-600 hover:text-red-700 font-semibold"
                    >
                      حذف ✕
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] text-gray-600 mb-1">الوحدة</label>
                      <input
                        type="text"
                        value={tier.unit}
                        onChange={(e) => updateTier(idx, { unit: e.target.value })}
                        placeholder="دستة"
                        className={inputCls + ' text-sm py-2'}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-600 mb-1">العدد</label>
                      <input
                        type="number"
                        value={tier.qty || ''}
                        onChange={(e) =>
                          updateTier(idx, { qty: Number(e.target.value) || 0 })
                        }
                        placeholder="12"
                        className={inputCls + ' text-sm py-2'}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-600 mb-1">سعر القطعة</label>
                      <input
                        type="number"
                        value={tier.price_per_unit || ''}
                        onChange={(e) =>
                          updateTier(idx, { price_per_unit: Number(e.target.value) || 0 })
                        }
                        placeholder="18"
                        className={inputCls + ' text-sm py-2'}
                      />
                    </div>
                  </div>
                  {total > 0 && (
                    <div className="text-xs text-[#1F6F5F] font-semibold mt-2">
                      الإجمالي: {total.toLocaleString('ar-EG')} جنيه
                    </div>
                  )}
                </div>
              );
            })}
            <button
              type="button"
              onClick={addTier}
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-[#1F6F5F]/40 text-[#1F6F5F] text-sm font-bold hover:bg-[#1F6F5F]/5 transition-colors"
            >
              + إضافة سعر جملة
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <Nav onBack={onBack} onNext={handleSubmit} saving={saving} />
    </section>
  );
}

// =================================================
// STEP 3 — PRICING
// =================================================
function StepPricing({
  draft,
  errors,
  categories,
  token,
  onSubmit,
  onBack,
  onChangeCategory,
  saving,
  beautySchemas,
}: {
  draft: DraftPayload;
  errors: Record<string, string>;
  categories: MainCategory[];
  token: string | null;
  onSubmit: (patch: Partial<DraftPayload>) => void | Promise<void>;
  onBack: () => void;
  onChangeCategory: () => void;
  saving: boolean;
  beautySchemas: Record<string, BeautySchema>;
}) {
  // EARLY BRANCH (May 29 2026): restaurants + products tracks use
  // dedicated step components, not the rental/service pricing UI.
  // Each child owns its own state, validation, and produces a final
  // patch with menu_items / product_details inside draft.attributes.
  const trackForBranch = getCategoryTrack(draft.category_slug, categories);
  if (trackForBranch === 'restaurants') {
    return (
      <MenuBuilderStep
        draft={draft}
        categories={categories}
        token={token}
        onSubmit={onSubmit}
        onBack={onBack}
        onChangeCategory={onChangeCategory}
        saving={saving}
      />
    );
  }
  if (trackForBranch === 'products') {
    return (
      <ProductDetailsStep
        draft={draft}
        categories={categories}
        onSubmit={onSubmit}
        onBack={onBack}
        onChangeCategory={onChangeCategory}
        saving={saving}
      />
    );
  }

  const isBeauty = isBeautyCategory(draft.category_slug);
  const schema = isBeauty && draft.category_slug ? beautySchemas[draft.category_slug] : undefined;
  const suggestedAddons = schema?.suggested_addons || [];

  // Phase Y2 (May 18 2026): track-aware copy + add-ons for all non-rentals.
  // Pure rentals keep the “حضرتك بتأجره” prompt; services + hybrid +
  // beauty get service-flavoured copy and the optional add-ons builder.
  const track = getCategoryTrack(draft.category_slug, categories);
  const isRentalCopy = track === 'rentals';
  const isHybrid = track === 'hybrid';
  // Task 6 (May 30 2026): medical-clinics + related categories show an extra
  // insurance-acceptance section in the pricing step.
  const isMedical = isMedicalCategory(draft.category_slug, categories);
  const showAddons = !isRentalCopy;          // services + hybrid + beauty
  const showCustomAddonBuilder = showAddons && !isBeauty;

  // Phase E (May 18 2026): expanded period labels — added per_event, per_visit
  // to match the new DB-driven allowed_pricing_periods values.
  const periodLabel: Record<string, string> = {
    hourly: 'ساعة', daily: 'يوم', weekly: 'أسبوع', monthly: 'شهر',
    per_service: 'الخدمة', per_session: 'الجلسة', per_package: 'الباكدج',
    per_event: 'الحدث', per_visit: 'الزيارة', per_unit: 'الوحدة',
  };

  // Phase E: read category-specific pricing periods from DB. Beauty keeps its
  // existing per_service/session/package flow (already DB-driven via beauty
  // schemas). For everything else, use the category's allowed_pricing_periods
  // if set; otherwise fall back to the original hardcoded daily/weekly etc.
  const meta = getCategoryWizardMeta(draft.category_slug, categories);

  const periodOptions: string[] = isBeauty
    ? ['per_service', 'per_session', 'per_package']
    : (meta.allowed_pricing_periods && meta.allowed_pricing_periods.length > 0
        ? meta.allowed_pricing_periods
        : ['hourly', 'daily', 'weekly', 'monthly']);

  const defaultPeriod = isBeauty
    ? (schema?.price_unit || 'per_service')
    : (meta.default_pricing_period || 'daily');
  const [period, setPeriod] = useState<string>(() => {
    if (draft.price_period && periodOptions.includes(draft.price_period)) {
      return draft.price_period;
    }
    return defaultPeriod;
  });
  const [price, setPrice] = useState<number | ''>(draft.price ?? '');

  // ─── Add-ons state ────────────────────────────────────────────────
  // Supplier picks which suggested add-ons they offer + can override prices.
  // Final selection is saved to draft.attributes.addons.
  const initialEnabled = useMemo(() => {
    const existing = draft.attributes?.addons || [];
    return new Set<string>(existing.map((a) => a.slug));
  }, [draft.attributes]);

  const initialPrices = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of suggestedAddons) map[s.slug] = s.default_price_egp;
    const existing = draft.attributes?.addons || [];
    for (const a of existing) map[a.slug] = a.price_egp;
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.attributes, suggestedAddons.length]);

  const [enabledAddons, setEnabledAddons] = useState<Set<string>>(initialEnabled);
  const [addonPrices, setAddonPrices] = useState<Record<string, number>>(initialPrices);

  // ─── INSURANCE STATE (Task 6, May 30 2026) ───
  // Only relevant for medical-clinics + related categories.
  // Saved to draft.attributes.accepts_insurance / insurance_partners /
  // insurance_deposit_pct, then mapped to listings columns on publish.
  const [acceptsInsurance, setAcceptsInsurance] = useState<boolean>(
    !!draft.attributes?.accepts_insurance
  );
  const initialPartners = (draft.attributes?.insurance_partners as string[] | undefined) || [];
  const [insurancePartners, setInsurancePartners] = useState<string[]>(initialPartners);
  const [newPartner, setNewPartner] = useState<string>('');
  const [insuranceDepositPct] = useState<number>(
    (draft.attributes?.insurance_deposit_pct as number | undefined) ?? 5
  );

  function addPartner() {
    const trimmed = newPartner.trim();
    if (!trimmed || insurancePartners.includes(trimmed)) {
      setNewPartner('');
      return;
    }
    setInsurancePartners((prev) => [...prev, trimmed]);
    setNewPartner('');
  }
  function removePartner(name: string) {
    setInsurancePartners((prev) => prev.filter((p) => p !== name));
  }

  function toggleAddon(slug: string) {
    setEnabledAddons((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function setAddonPrice(slug: string, p: number) {
    setAddonPrices((prev) => ({ ...prev, [slug]: p }));
  }

  function buildAddonsPatch(): Addon[] {
    return suggestedAddons
      .filter((s) => enabledAddons.has(s.slug))
      .map((s) => ({
        slug: s.slug,
        name_ar: s.name_ar,
        emoji: s.emoji,
        price_egp: addonPrices[s.slug] ?? s.default_price_egp,
      }));
  }

  // ─── Custom add-ons (Phase Y2, May 18 2026) ──────────────────
  // For non-beauty services + hybrid categories, the supplier defines
  // their own optional add-ons (name + price). Stored in the same
  // draft.attributes.addons array as beauty's suggested ones, so the
  // booking page can render them uniformly downstream.
  const [customAddons, setCustomAddons] = useState<Addon[]>(() => {
    if (isBeauty) return [];
    return (draft.attributes?.addons as Addon[] | undefined) || [];
  });

  function addCustomAddon() {
    setCustomAddons((prev) => [
      ...prev,
      { slug: `custom_${Date.now()}_${prev.length}`, name_ar: '', price_egp: 0 },
    ]);
  }

  function updateCustomAddon(idx: number, patch: Partial<Addon>) {
    setCustomAddons((prev) => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  }

  function removeCustomAddon(idx: number) {
    setCustomAddons((prev) => prev.filter((_, i) => i !== idx));
  }

  function buildCustomAddonsPatch(): Addon[] {
    return customAddons
      .filter((a) => a.name_ar.trim().length > 0 && a.price_egp > 0)
      .map((a) => ({
        slug: a.slug || `custom_${Date.now()}`,
        name_ar: a.name_ar.trim(),
        emoji: a.emoji,
        price_egp: a.price_egp,
      }));
  }

  function handleNext() {
    const patch: Partial<DraftPayload> = {
      price: Number(price),
      price_period: period,
    };
    const baseAttrs = (draft.attributes || {}) as Record<string, unknown>;
    const newAttrs: Record<string, unknown> = { ...baseAttrs };

    if (showAddons) {
      newAttrs.addons = isBeauty ? buildAddonsPatch() : buildCustomAddonsPatch();
    }

    // Task 6: persist insurance fields for medical categories
    if (isMedical) {
      newAttrs.accepts_insurance = acceptsInsurance;
      newAttrs.insurance_partners = acceptsInsurance ? insurancePartners : [];
      newAttrs.insurance_deposit_pct = acceptsInsurance ? insuranceDepositPct : null;
    }

    patch.attributes = newAttrs;
    onSubmit(patch);
  }

  return (
    <section>
      <CategoryChip slug={draft.category_slug} categories={categories} onChange={onChangeCategory} />
      <h2 className="text-lg font-semibold mb-1">
        {isRentalCopy ? 'السعر' : (isHybrid ? 'سعر الفعالية' : 'سعر الخدمة')}
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        {isRentalCopy
          ? 'حضرتك بتأجره بكام؟'
          : isBeauty
            ? 'بكام بتقدم الخدمة الأساسية؟'
            : isHybrid
              ? 'بكام بتقدم الفعالية الأساسية؟'
              : 'بكام بتقدم الخدمة؟'}
      </p>

      <Field label={isRentalCopy ? 'مدة الإيجار' : 'نوع التسعير'} required>
        <div className={`grid gap-2 ${isBeauty ? 'grid-cols-3' : 'grid-cols-4'}`}>
          {periodOptions.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`py-3 rounded-xl border text-sm transition-all ${
                period === p
                  ? 'bg-[#1F6F5F] border-[#1F6F5F] text-white font-semibold'
                  : 'bg-white border-[#E5E5E0]'
              }`}
            >
              {periodLabel[p]}
            </button>
          ))}
        </div>
      </Field>

      <Field
        label={
          meta.pricing_unit_label
            ? meta.pricing_unit_label
            : (isRentalCopy
                ? `السعر بالجنيه لكل ${periodLabel[period] || period}`
                : `سعر ${periodLabel[period] || period} بالجنيه`)
        }
        error={errors.price}
        required
      >
        <div className="relative">
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="مثلاً: 1500"
            className={inputCls + ' pl-16'}
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
            ج.م
          </span>
        </div>
      </Field>

      {/* Phase E (May 18 2026): weekly projection for daily rentals (existing UX) */}
      {isRentalCopy && price !== '' && period === 'daily' && Number(price) > 0 && (
        <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm">
          💰 لو حد أجره أسبوع كامل = <strong>{Number(price) * 7} جنيه</strong>
          <br />
          • نصيب حضرتك (فرد، 10% عمولة): <strong>{Math.round(Number(price) * 7 * 0.9)} جنيه</strong>
          <br />
          • نصيب حضرتك (شركة، 5% عمولة): <strong>{Math.round(Number(price) * 7 * 0.95)} جنيه</strong>
        </div>
      )}

      {/* Phase E: per-unit commission preview — shown for beauty AND for any
          non-daily non-beauty period (lawyers per_session, photographers
          per_event, etc). Previously only beauty had this preview. */}
      {price !== '' && Number(price) > 0 && (!isRentalCopy || period !== 'daily') && (
        <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm">
          💰 من كل {periodLabel[period] || period}:
          <br />
          • نصيب حضرتك (فرد، 10% عمولة): <strong>{Math.round(Number(price) * 0.9)} جنيه</strong>
          <br />
          • نصيب حضرتك (شركة، 5% عمولة): <strong>{Math.round(Number(price) * 0.95)} جنيه</strong>
        </div>
      )}

      {/* Beauty: add-ons section */}
      {isBeauty && suggestedAddons.length > 0 && (
        <div className="mt-8 pt-6 border-t border-[#E5E5E0]">
          <h3 className="text-base font-semibold mb-1">✨ خدمات إضافية اختيارية</h3>
          <p className="text-xs text-gray-500 mb-4">
            العميل يقدر يضيفها لحجزه. شيّك على اللي بتقدمه وعدّل السعر لو حابب.
          </p>
          <div className="grid grid-cols-1 gap-2">
            {suggestedAddons.map((addon) => {
              const isEnabled = enabledAddons.has(addon.slug);
              return (
                <div
                  key={addon.slug}
                  className={`p-3 rounded-xl border transition-all ${
                    isEnabled
                      ? 'bg-emerald-50 border-emerald-300'
                      : 'bg-white border-[#E5E5E0]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleAddon(addon.slug)}
                      className={`w-6 h-6 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                        isEnabled
                          ? 'bg-[#1F6F5F] border-[#1F6F5F]'
                          : 'bg-transparent border-[#E5E5E0]'
                      }`}
                      aria-pressed={isEnabled}
                      aria-label={`${isEnabled ? 'الغاء' : 'اختيار'} ${addon.name_ar}`}
                    >
                      {isEnabled && <span className="text-white text-xs font-bold">✓</span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleAddon(addon.slug)}
                      className="flex-1 flex items-center gap-2 text-right"
                    >
                      {addon.emoji && <span className="text-lg flex-shrink-0">{addon.emoji}</span>}
                      <span className="text-sm font-medium">{addon.name_ar}</span>
                    </button>
                    <div className="relative flex-shrink-0">
                      <input
                        type="number"
                        value={addonPrices[addon.slug] ?? addon.default_price_egp}
                        onChange={(e) => setAddonPrice(addon.slug, Number(e.target.value) || 0)}
                        disabled={!isEnabled}
                        className={`w-24 p-2 rounded-lg text-sm text-left pl-9 ${
                          isEnabled
                            ? 'bg-[#F5F4F0] border border-[#E5E5E0] text-[#1A2E26]'
                            : 'bg-white border border-transparent opacity-50 text-gray-500'
                        } focus:outline-none focus:border-[#1F6F5F]`}
                      />
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 pointer-events-none">
                        ج.م
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-xs text-gray-500 text-center">
            {enabledAddons.size === 0
              ? 'لسة معديتش أي خدمة إضافية'
              : `${enabledAddons.size} ${enabledAddons.size === 1 ? 'خدمة إضافية' : 'خدمات إضافية'} مختارة`}
          </div>
        </div>
      )}

      {/* Phase Y2 (May 18 2026): custom add-ons builder for all non-beauty
          service-like categories. Supplier types name + price for each
          extra. Saved to draft.attributes.addons (same shape as beauty's
          suggested add-ons) so the booking page renders them uniformly. */}
      {showCustomAddonBuilder && (
        <div className="mt-8 pt-6 border-t border-[#E5E5E0]">
          <h3 className="text-base font-semibold mb-1">✨ خدمات إضافية اختيارية</h3>
          <p className="text-xs text-gray-500 mb-4">
            ضيف خدمات يقدر العميل يضمّها لحجزه (مثلاً: توصيل للمنزل، صور إضافية،
            خامات خاصة...). كل خدمة لها سعرها المستقل.
          </p>

          {customAddons.length > 0 && (
            <div className="space-y-2 mb-3">
              {customAddons.map((addon, idx) => (
                <div
                  key={addon.slug || idx}
                  className="p-3 rounded-xl bg-white border border-[#E5E5E0]"
                >
                  <div className="flex items-stretch gap-2">
                    <input
                      type="text"
                      value={addon.name_ar}
                      onChange={(e) => updateCustomAddon(idx, { name_ar: e.target.value })}
                      placeholder="اسم الخدمة الإضافية"
                      className="flex-1 p-2 rounded-lg bg-[#F5F4F0] border border-[#E5E5E0] text-sm text-[#1A2E26] placeholder:text-gray-400 focus:outline-none focus:border-[#1F6F5F]"
                    />
                    <div className="relative w-28 flex-shrink-0">
                      <input
                        type="number"
                        value={addon.price_egp || ''}
                        onChange={(e) =>
                          updateCustomAddon(idx, { price_egp: Number(e.target.value) || 0 })
                        }
                        placeholder="السعر"
                        className="w-full p-2 rounded-lg bg-[#F5F4F0] border border-[#E5E5E0] text-sm text-[#1A2E26] placeholder:text-gray-400 focus:outline-none focus:border-[#1F6F5F] pl-10"
                      />
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 pointer-events-none">
                        ج.م
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCustomAddon(idx)}
                      className="flex-shrink-0 w-9 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-base font-bold transition-colors"
                      aria-label="احذف الخدمة"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={addCustomAddon}
            className="w-full py-3 rounded-xl border-2 border-dashed border-[#1F6F5F]/30 hover:border-[#1F6F5F]/60 hover:bg-[#1F6F5F]/5 text-sm font-semibold text-[#1F6F5F] transition-colors"
          >
            + ضيف خدمة إضافية
          </button>

          {customAddons.length === 0 && (
            <p className="text-[11px] text-gray-500 text-center mt-3">
              اختياري — تقدر تتخطاها لو الخدمة سعر واحد بدون إضافات
            </p>
          )}
        </div>
      )}

      {/* ─── INSURANCE ACCEPTANCE (Task 6 — May 30 2026) ───
          Only renders for medical-clinics / medical-consultants /
          physiotherapy / properties-clinics (or their subs). */}
      {isMedical && (
        <div className="mt-6 mb-3 p-4 rounded-xl bg-gradient-to-bl from-emerald-50 to-amber-50 border border-emerald-200">
          <label className="flex items-start gap-2 text-sm font-semibold mb-2 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptsInsurance}
              onChange={(e) => setAcceptsInsurance(e.target.checked)}
              className="w-4 h-4 mt-0.5 accent-[#1F6F5F]"
            />
            <div>
              🏥 بتقبل تأمين صحي؟
              <p className="text-[11px] text-gray-600 font-normal mt-0.5">
                لو بتقبل تأمين، حدد شركات التأمين اللي بتتعامل معاها.
              </p>
            </div>
          </label>

          {acceptsInsurance && (
            <div className="mt-3 space-y-3">
              {insurancePartners.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {insurancePartners.map((p) => (
                    <span
                      key={p}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#1F6F5F]/30 text-xs font-medium"
                    >
                      🏥 {p}
                      <button
                        type="button"
                        onClick={() => removePartner(p)}
                        className="text-red-500 font-bold hover:text-red-700"
                        aria-label={`إزالة ${p}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPartner}
                  onChange={(e) => setNewPartner(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addPartner();
                    }
                  }}
                  placeholder="مثلاً: مديلسرفيس، اللجنة، صحتك..."
                  className={inputCls + ' text-sm flex-1'}
                />
                <button
                  type="button"
                  onClick={addPartner}
                  disabled={!newPartner.trim()}
                  className="py-2.5 px-4 rounded-xl bg-[#1F6F5F] text-white text-sm font-semibold disabled:opacity-50 whitespace-nowrap"
                >
                  + إضافة
                </button>
              </div>

              <div className="p-3 rounded-xl bg-white border border-[#E5E5E0] text-xs text-gray-700">
                <div className="font-semibold text-[#1F6F5F] mb-1">💳 رسم الحجز للتأمينيين</div>
                <p>
                  عند حجز عميل بتأمين صحي، بنأخد <strong>5%</strong> رسم خدمة من سعر الكشف (من العميل عبر انستاباي) لتأكيد الحجز.
                </p>
                <p className="text-[11px] text-red-700 mt-1.5 font-bold">
                  ⚠️ الرسم ده غير قابل للاسترداد — بيضمن جدية حجز العميل (مش بيترجع حتى لو العميل مجاش).
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <Nav onBack={onBack} onNext={handleNext} saving={saving} />
    </section>
  );
}

// =================================================
// STEP 4 — PHOTOS
// May 13 2026 fix: photos are now REQUIRED (was skippable).
// Rationale: 14 of 14 claimed drafts had 0 photos → all stuck in
// pending_review, never visible publicly. Forcing ≥1 photo at the
// wizard means every published listing has at least a hero image,
// which dramatically improves marketplace appeal and conversion.
// =================================================
function StepPhotos({
  draft, token, onSubmit, onUpload, onBack, saving,
}: {
  draft: DraftPayload;
  token: string | null;
  onSubmit: (photos: { url: string }[]) => void | Promise<void>;
  onUpload?: (photos: { url: string }[]) => void | Promise<void>;
  onBack: () => void;
  saving: boolean;
}) {
  const [photos, setPhotos] = useState<{ url: string; caption?: string }[]>(draft.photos || []);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSaving, setAutoSaving] = useState(false);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (photos.length + files.length > 8) {
      setError('أقصى عدد 8 صور');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const uploaded: { url: string }[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        if (token) fd.append('token', token);
        const res = await fetch('/api/listing-drafts/upload', { method: 'POST', body: fd });
        const json = await res.json();
        if (json.url) uploaded.push({ url: json.url });
      }
      const newPhotos = [...photos, ...uploaded];
      setPhotos(newPhotos);
      // AUTO-SAVE: persist to DB immediately so photos survive even if user
      // closes/refreshes the page before clicking Continue.
      if (onUpload && uploaded.length > 0) {
        setAutoSaving(true);
        try { await onUpload(newPhotos); }
        catch (e) { console.warn('autosave failed (photo still in storage):', e); }
        finally { setAutoSaving(false); }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'الصور مرفعتش، حاول تاني';
      setError(msg);
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto(idx: number) {
    const next = photos.filter((_, i) => i !== idx);
    setPhotos(next);
    // AUTO-SAVE removals too, same reasoning as upload.
    if (onUpload) {
      setAutoSaving(true);
      try { await onUpload(next); }
      catch (e) { console.warn('autosave (remove) failed:', e); }
      finally { setAutoSaving(false); }
    }
  }

  return (
    <section>
      <h2 className="text-lg font-semibold mb-1">الصور</h2>
      <p className="text-sm text-gray-500 mb-6">
        ارفع صورة واحدة على الأقل عشان نقدر ننشر إعلانك فوراً. الإعلانات بصور بتاخد حجوزات أسرع بـ 7 مرات.
      </p>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {photos.map((p, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute top-1 left-1 w-7 h-7 rounded-full bg-red-600 text-white text-sm font-bold"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <label className="block">
        <div className="border-2 border-dashed border-[#D1D5DB] rounded-2xl p-8 text-center cursor-pointer hover:border-[#1F6F5F] transition-colors">
          <div className="text-3xl mb-2">📸</div>
          <div className="font-semibold">{uploading ? 'جاري الرفع...' : 'اضغط هنا لإضافة صور'}</div>
          <div className="text-xs text-gray-500 mt-1">JPG/PNG، حتى 8 صور</div>
        </div>
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFiles}
          disabled={uploading}
        />
      </label>

      {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
      {autoSaving && (
        <div className="mt-2 text-xs text-gray-500">
          ⏳ جاري حفظ الصور…
        </div>
      )}
      {!autoSaving && !error && photos.length > 0 && (
        <div className="mt-2 text-xs text-emerald-700">
          ✓ {photos.length} {photos.length === 1 ? 'صورة محفوظة' : 'صور محفوظة'}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mt-6">
        <button type="button" onClick={onBack} className={btnSecondary}>← رجوع</button>
        <button
          type="button"
          onClick={() => onSubmit(photos)}
          disabled={saving || uploading || photos.length === 0}
          className={btnPrimary}
          title={photos.length === 0 ? 'ارفع صورة واحدة على الأقل' : undefined}
        >
          {saving ? '...' : photos.length === 0 ? '📸 ارفع صورة الأول' : 'كمل →'}
        </button>
      </div>
      {photos.length === 0 && (
        <p className="text-xs text-gray-500 mt-3 text-center">
          💡 صورة واحدة كافية عشان تبدأ — تقدر تضيف باقي الصور من حسابك بعدين.
        </p>
      )}
    </section>
  );
}

// =================================================
// STEP 5 — CONTACT (the soft signup)
// =================================================
function StepContact({
  draft, errors, onSubmit, onBack, saving,
}: {
  draft: DraftPayload;
  errors: Record<string, string>;
  onSubmit: (patch: Partial<DraftPayload>) => void | Promise<void>;
  onBack: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(draft.contact_name || '');
  const [phone, setPhone] = useState(draft.contact_phone || '');
  const [accountType, setAccountType] = useState<'individual' | 'business'>(draft.account_type || 'individual');
  const [businessName, setBusinessName] = useState(draft.business_name || '');

  // ─── OTP VERIFICATION (May 30 2026 — Task 4) ─────────────────────
  // User must verify their WhatsApp number via 6-digit code before publish.
  // Server trigger trg_enforce_listing_publish_requirements blocks publish
  // without phone_verified_at; wizard mirrors that gate client-side.
  // Flow: send OTP → user receives WA message → types 6-digit code → verify.
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpAttemptsLeft, setOtpAttemptsLeft] = useState<number | null>(null);

  function isValidPhone(p: string): boolean {
    return /^(\+?2)?01\d{9}$/.test(p.replace(/\s/g, ''));
  }

  function handlePhoneChange(newPhone: string) {
    setPhone(newPhone);
    // Reset OTP state when phone changes — the previous code/verification
    // is for the old number and must be invalidated.
    if (otpSent || otpVerified) {
      setOtpSent(false);
      setOtpVerified(false);
      setOtpCode('');
      setOtpError('');
      setOtpAttemptsLeft(null);
    }
  }

  async function sendOtp() {
    if (!isValidPhone(phone)) {
      setOtpError('رقم تليفون مش صحيح (لازم 11 رقم)');
      return;
    }
    setOtpSending(true);
    setOtpError('');
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!data.ok) {
        setOtpError(data.message || 'مش قادر يبعت الكود، حاول تاني');
      } else {
        setOtpSent(true);
        setOtpError('');
      }
    } catch {
      setOtpError('مشكلة في الشبكة، حاول تاني');
    } finally {
      setOtpSending(false);
    }
  }

  async function verifyOtp() {
    if (!/^\d{6}$/.test(otpCode)) {
      setOtpError('الكود لازم يكون 6 أرقام');
      return;
    }
    setOtpVerifying(true);
    setOtpError('');
    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otpCode }),
      });
      const data = await res.json();
      if (!data.ok) {
        setOtpError(data.message || 'الكود غلط');
        if (typeof data.attempts_left === 'number') {
          setOtpAttemptsLeft(data.attempts_left);
        }
      } else {
        setOtpVerified(true);
        setOtpError('');
      }
    } catch {
      setOtpError('مشكلة في الشبكة، حاول تاني');
    } finally {
      setOtpVerifying(false);
    }
  }

  function handleFinalSubmit() {
    if (!otpVerified) {
      setOtpError('لازم تتأكد من رقم الواتس اب الأول');
      return;
    }
    onSubmit({
      contact_name: name,
      contact_phone: phone,
      account_type: accountType,
      business_name: accountType === 'business' ? businessName : undefined,
    });
  }

  return (
    <section>
      <h2 className="text-lg font-semibold mb-1">بياناتك</h2>
      <p className="text-sm text-gray-500 mb-6">
        آخر خطوة. هنبعتلك كود تأكيد على الواتس اب.
      </p>

      <Field label="اسمك" error={errors.contact_name} required>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="الاسم بالكامل"
          className={inputCls}
        />
      </Field>

      <Field label="رقم الواتس اب" error={errors.contact_phone} required>
        <input
          type="tel"
          dir="ltr"
          value={phone}
          onChange={(e) => handlePhoneChange(e.target.value)}
          placeholder="01XXXXXXXXX"
          className={inputCls + ' text-left'}
          disabled={otpVerified}
        />
      </Field>

      {/* ─── OTP VERIFICATION UI ─── */}
      {!otpVerified ? (
        <div className="mb-4 p-4 rounded-xl bg-white border border-[#E5E5E0]">
          {!otpSent ? (
            <>
              <p className="text-sm text-gray-700 mb-3">
                📱 هنبعت كود تأكيد على الواتس اب عشان نتأكد إن الرقم بتاعك
              </p>
              <button
                type="button"
                onClick={sendOtp}
                disabled={otpSending || !isValidPhone(phone)}
                className="w-full py-2.5 px-4 rounded-xl bg-[#25D366] text-white font-semibold disabled:opacity-50 transition-all"
              >
                {otpSending ? 'بنبعت...' : '📲 إبعتلي كود على الواتس اب'}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-700 mb-3">
                ✅ بعتنالك كود من 6 أرقام على <span dir="ltr" className="font-mono">{phone}</span>
              </p>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  dir="ltr"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className={inputCls + ' text-center text-lg tracking-widest font-mono flex-1'}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={verifyOtp}
                  disabled={otpVerifying || otpCode.length !== 6}
                  className="py-2.5 px-4 rounded-xl bg-[#1F6F5F] text-white font-semibold disabled:opacity-50 whitespace-nowrap"
                >
                  {otpVerifying ? '...' : 'تأكيد'}
                </button>
              </div>
              <div className="flex justify-between items-center text-xs">
                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={otpSending}
                  className="text-[#1F6F5F] underline disabled:opacity-50"
                >
                  ابعت كود تاني
                </button>
                {otpAttemptsLeft !== null && (
                  <span className="text-gray-500">
                    باقي {otpAttemptsLeft} محاولات
                  </span>
                )}
              </div>
            </>
          )}
          {otpError && (
            <div className="text-xs text-red-600 mt-2">{otpError}</div>
          )}
        </div>
      ) : (
        <div className="mb-4 p-4 rounded-xl bg-green-50 border border-green-200 text-sm text-green-800 flex items-center gap-2">
          <span className="text-lg">✅</span>
          <span>رقم الواتس اب اتأكد — تقدر تكمل</span>
        </div>
      )}

      <Field label="إنت" required>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setAccountType('individual')}
            className={`p-4 rounded-xl border text-right transition-all ${
              accountType === 'individual'
                ? 'bg-[#1F6F5F] border-[#1F6F5F] text-white'
                : 'bg-white border-[#E5E5E0]'
            }`}
          >
            <div className="font-semibold">فرد</div>
            <div className={`text-xs mt-1 ${accountType === 'individual' ? 'text-white/70' : 'text-gray-500'}`}>عمولة 10%</div>
          </button>
          <button
            type="button"
            onClick={() => setAccountType('business')}
            className={`p-4 rounded-xl border text-right transition-all ${
              accountType === 'business'
                ? 'bg-[#1F6F5F] border-[#1F6F5F] text-white'
                : 'bg-white border-[#E5E5E0]'
            }`}
          >
            <div className="font-semibold">شركة</div>
            <div className={`text-xs mt-1 ${accountType === 'business' ? 'text-white/70' : 'text-gray-500'}`}>عمولة 5%</div>
          </button>
        </div>
      </Field>

      {accountType === 'business' && (
        <Field label="اسم الشركة" error={errors.business_name} required>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="الاسم التجاري"
            className={inputCls}
          />
        </Field>
      )}

      <div className="mt-6 p-4 rounded-xl bg-white border border-[#E5E5E0] text-xs text-gray-600">
        ✅ بكدا حضرتك سجلت الليستنج — هنبعتلك تأكيد على الواتس اب وتقدر تكمل تسجيل حسابك (دقيقة واحدة).
      </div>

      <Nav
        onBack={onBack}
        onNext={handleFinalSubmit}
        saving={saving}
        nextLabel={otpVerified ? 'ابعت الليستنج 🚀' : '🔒 محتاج تأكيد الرقم الأول'}
      />
    </section>
  );
}

function validateContact(patch: Partial<DraftPayload>, setErrors: (e: Record<string, string>) => void): boolean {
  const errs: Record<string, string> = {};
  if (!patch.contact_name || patch.contact_name.length < 2) errs.contact_name = 'اكتب اسمك';
  if (!patch.contact_phone || !/^(\+?2)?01\d{9}$/.test(String(patch.contact_phone).replace(/\s/g, '')))
    errs.contact_phone = 'رقم تليفون مش صحيح (لازم 11 رقم)';
  if (patch.account_type === 'business' && !patch.business_name)
    errs.business_name = 'اكتب اسم الشركة';
  setErrors(errs);
  return Object.keys(errs).length === 0;
}

// =================================================
// SHARED UI
// =================================================
const inputCls =
  'w-full p-3 rounded-xl bg-white border border-[#E5E5E0] text-[#1A2E26] placeholder:text-gray-400 focus:outline-none focus:border-[#1F6F5F]';

const btnPrimary =
  'py-3 px-4 rounded-xl bg-[#1F6F5F] text-white font-semibold hover:bg-[#1F6F5F]/90 disabled:opacity-50 transition-all';

const btnSecondary =
  'py-3 px-4 rounded-xl bg-white border border-[#E5E5E0] hover:bg-[#F5F4F0] transition-all';

function Field({ label, error, required, children }: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-2">
        {label}
        {required && <span className="text-[#1F6F5F] mr-1">*</span>}
      </label>
      {children}
      {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
    </div>
  );
}

function Nav({ onBack, onNext, saving, nextLabel }: {
  onBack: () => void;
  onNext: () => void;
  saving: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 mt-6">
      <button type="button" onClick={onBack} className={btnSecondary}>
        ← رجوع
      </button>
      <button type="button" onClick={onNext} disabled={saving} className={btnPrimary}>
        {saving ? '...' : (nextLabel || 'كمل →')}
      </button>
    </div>
  );
}

// =================================================
// RESUME DRAFT BANNER (May 29 2026)
//
// Shown at the top of Step 1 when a saved draft was detected in localStorage
// (i.e. user previously started a listing and came back). Gives the user
// two clear actions: continue the saved draft, or discard it and start a
// fresh listing in a different category.
//
// Before this banner existed, the wizard would silently jump to whichever
// step the user had reached, hiding the category picker. Users who came
// back to add a DIFFERENT listing got stuck inside the previous category's
// form ("msh sha3'al, fa7'ar el page byraga3ni l mokawalat we mfish category
// picker").
// =================================================
function ResumeDraftBanner({
  pendingStep,
  categorySlug,
  categories,
  onResume,
  onDiscard,
}: {
  pendingStep: Step;
  categorySlug?: string;
  categories: MainCategory[];
  onResume: () => void;
  onDiscard: () => void;
}) {
  // Resolve a friendly display name for the in-progress category.
  let display: { emoji: string; name: string } | null = null;
  if (categorySlug) {
    const main = categories.find((m) => m.slug === categorySlug);
    if (main) {
      display = { emoji: main.emoji, name: main.name_ar };
    } else {
      for (const m of categories) {
        const s = m.subs.find((x) => x.slug === categorySlug);
        if (s) {
          display = { emoji: s.emoji, name: `${m.name_ar} · ${s.name_ar}` };
          break;
        }
      }
    }
  }

  return (
    <div className="mb-6 p-4 rounded-2xl bg-gradient-to-bl from-emerald-50 to-amber-50 border border-emerald-200">
      <div className="flex items-start gap-3 mb-3">
        <div className="text-2xl leading-none flex-shrink-0">💾</div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm text-[#1F6F5F]">لقينالك مسودة محفوظة</div>
          {display && (
            <div className="flex items-center gap-2 mt-1.5 text-sm">
              <span className="text-lg leading-none">{display.emoji}</span>
              <span className="font-medium truncate">{display.name}</span>
            </div>
          )}
          <div className="text-xs text-gray-600 mt-1">
            وصلت لخطوة {pendingStep} من 5 — تقدر تكمل من فين وقفت، أو تبدأ ليستنج جديد،
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onResume}
          className="py-2.5 px-3 rounded-xl bg-[#1F6F5F] text-white text-sm font-semibold hover:bg-[#1F6F5F]/90 transition-all"
        >
          → كمل من فين وقفت
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="py-2.5 px-3 rounded-xl bg-white border border-[#E5E5E0] text-sm font-medium text-gray-700 hover:bg-[#F5F4F0] transition-all"
        >
          ✨ ابدأ ليستنج جديد
        </button>
      </div>
    </div>
  );
}
